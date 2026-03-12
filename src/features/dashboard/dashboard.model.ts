import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { OpeningStock } from '../../entities/inventory/OpeningStock';
import { StockMovement, MovementType } from '../../entities/inventory/StockMovement';
import { Item } from '../../entities/inventory/Item';
import { Store } from '../../entities/inventory/Store';
import { Rate } from '../../entities/inventory/Rate';
import logger from '../../utils/logger';

export interface DashboardKpiResponse {
  total_stock_qty: number;
  total_stock_value: number;
  total_low_stock_items: number;
}

export class DashboardModel {
  private static getOpeningStockRepository(): Repository<OpeningStock> {
    return AppDataSource.getRepository(OpeningStock);
  }

  private static getStockMovementRepository(): Repository<StockMovement> {
    return AppDataSource.getRepository(StockMovement);
  }

  private static getItemRepository(): Repository<Item> {
    return AppDataSource.getRepository(Item);
  }

  private static getStoreRepository(): Repository<Store> {
    return AppDataSource.getRepository(Store);
  }

  private static getRateRepository(): Repository<Rate> {
    return AppDataSource.getRepository(Rate);
  }

  /**
   * Compute high-level inventory KPIs:
   * - total_stock_qty: Sum of current stock across all item-store combinations
   * - total_stock_value: Sum of (current stock per item * latest rate for that item)
   * - total_low_stock_items: Count of item-store combos where current stock < threshold
   *
   * Soft-deleted items and stores are excluded from all calculations.
   */
  static async getKpis(threshold: number): Promise<DashboardKpiResponse> {
    try {
      const openingStockRepo = this.getOpeningStockRepository();
      const stockMovementRepo = this.getStockMovementRepository();
      const itemRepo = this.getItemRepository();
      const storeRepo = this.getStoreRepository();
      const rateRepo = this.getRateRepository();

      const openingStocks = await openingStockRepo.find();
      const movements = await stockMovementRepo.find();

      // Build current stock per item-store combination
      const comboKeys = new Set<string>();
      const combos: Array<{ itemId: number; storeId: number }> = [];

      const addCombo = (itemId: number, storeId: number) => {
        const key = `${itemId}_${storeId}`;
        if (!comboKeys.has(key)) {
          comboKeys.add(key);
          combos.push({ itemId, storeId });
        }
      };

      openingStocks.forEach(os => addCombo(os.item_id, os.store_id));
      movements.forEach(mv => addCombo(mv.item_id, mv.store_id));

      if (combos.length === 0) {
        return {
          total_stock_qty: 0,
          total_stock_value: 0,
          total_low_stock_items: 0,
        };
      }

      const stockByKey = new Map<string, number>();

      // Initialize with opening stock
      openingStocks.forEach(os => {
        const key = `${os.item_id}_${os.store_id}`;
        const openingQty = parseFloat(os.opening_qty.toString());
        stockByKey.set(key, (stockByKey.get(key) || 0) + openingQty);
      });

      // Apply movements
      movements.forEach(mv => {
        const key = `${mv.item_id}_${mv.store_id}`;
        const qty = parseFloat(mv.qty.toString());
        const current = stockByKey.get(key) || 0;

        switch (mv.movement_type) {
          case MovementType.OPENING_STOCK:
            // Opening stock already counted above
            break;
          case MovementType.TRANSFER_IN:
          case MovementType.IN:
            stockByKey.set(key, current + qty);
            break;
          case MovementType.TRANSFER_OUT:
          case MovementType.OUT:
            stockByKey.set(key, current - qty);
            break;
          default:
            break;
        }
      });

      const itemIds = Array.from(new Set(combos.map(c => c.itemId)));
      const storeIds = Array.from(new Set(combos.map(c => c.storeId)));

      const [items, stores, rates] = await Promise.all([
        itemRepo.find({ where: itemIds.map(id => ({ id, is_deleted: false })) }),
        storeRepo.find({ where: storeIds.map(id => ({ id, is_deleted: false })) }),
        rateRepo
          .createQueryBuilder('rate')
          .where('rate.item_id IN (:...itemIds)', { itemIds })
          .orderBy('rate.item_id', 'ASC')
          .addOrderBy('rate.effective_date', 'DESC')
          .getMany(),
      ]);

      const itemMap = new Map<number, Item>();
      items.forEach(item => itemMap.set(item.id, item));

      const storeMap = new Map<number, Store>();
      stores.forEach(store => storeMap.set(store.id, store));

      // Latest rate per item
      const rateMap = new Map<number, Rate>();
      rates.forEach(rate => {
        if (!rateMap.has(rate.item_id)) {
          rateMap.set(rate.item_id, rate);
        }
      });

      let totalStockQty = 0;
      let totalLowStockItems = 0;
      const stockByItem = new Map<number, number>();

      combos.forEach(({ itemId, storeId }) => {
        const item = itemMap.get(itemId);
        const store = storeMap.get(storeId);
        if (!item || !store) return;

        const key = `${itemId}_${storeId}`;
        const currentStock = stockByKey.get(key) ?? 0;

        totalStockQty += currentStock;

        if (threshold > 0 && currentStock < threshold) {
          totalLowStockItems += 1;
        }

        const aggQty = stockByItem.get(itemId) || 0;
        stockByItem.set(itemId, aggQty + currentStock);
      });

      let totalStockValue = 0;
      stockByItem.forEach((qty, itemId) => {
        const rate = rateMap.get(itemId);
        if (!rate) return;
        const stockRate = parseFloat(rate.rate.toString());
        totalStockValue += qty * stockRate;
      });

      return {
        total_stock_qty: parseFloat(totalStockQty.toFixed(2)),
        total_stock_value: parseFloat(totalStockValue.toFixed(2)),
        total_low_stock_items: totalLowStockItems,
      };
    } catch (error) {
      logger.error('Error computing dashboard KPIs', {
        error: error instanceof Error ? error.message : 'Unknown error',
        threshold,
      });
      throw error;
    }
  }
}

