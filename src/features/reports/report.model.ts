import { Repository, LessThan, Between } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { OpeningStock } from '../../entities/inventory/OpeningStock';
import { StockMovement, MovementType } from '../../entities/inventory/StockMovement';
import { Rate } from '../../entities/inventory/Rate';
import { Item } from '../../entities/inventory/Item';
import { Store } from '../../entities/inventory/Store';
import {
  StoreWiseStockReportRow,
  StoreTransferDetailRow,
} from '../../types';
import logger from '../../utils/logger';
import { StoreTransferNote } from '../../entities/inventory/StoreTransferNote';
import { StoreTransferNoteDetail } from '../../entities/inventory/StoreTransferNoteDetail';

export class ReportModel {
  private static getOpeningStockRepository(): Repository<OpeningStock> {
    return AppDataSource.getRepository(OpeningStock);
  }

  private static getStockMovementRepository(): Repository<StockMovement> {
    return AppDataSource.getRepository(StockMovement);
  }

  private static getRateRepository(): Repository<Rate> {
    return AppDataSource.getRepository(Rate);
  }

  private static getItemRepository(): Repository<Item> {
    return AppDataSource.getRepository(Item);
  }

  private static getStoreRepository(): Repository<Store> {
    return AppDataSource.getRepository(Store);
  }

  private static getStoreTransferNoteRepository(): Repository<StoreTransferNote> {
    return AppDataSource.getRepository(StoreTransferNote);
  }

  private static getStoreTransferNoteDetailRepository(): Repository<StoreTransferNoteDetail> {
    return AppDataSource.getRepository(StoreTransferNoteDetail);
  }

  /**
   * Store Wise Stock Report
   *
   * For each item in the given store (or all stores), calculates:
   * - Opening quantity at fromDate
   * - Purchases within the period (IN movements)
   * - Transfer IN within the period
   * - Transfer OUT within the period
   * - Closing quantity at toDate
   * - Stock value (closing_qty * latest rate up to toDate)
   */
  static async getStoreWiseStockReport(
    fromDate: Date,
    toDate: Date,
    storeId?: number
  ): Promise<StoreWiseStockReportRow[]> {
    try {
      const openingStockRepo = this.getOpeningStockRepository();
      const stockMovementRepo = this.getStockMovementRepository();
      const itemRepo = this.getItemRepository();
      const storeRepo = this.getStoreRepository();
      const rateRepo = this.getRateRepository();

      // Load stores in scope (exclude soft-deleted)
      const stores = await storeRepo.find({
        where: storeId ? { id: storeId, is_deleted: false } : { is_deleted: false },
      });

      if (stores.length === 0) {
        return [];
      }

      const storeIds = stores.map((s) => s.id);

      // Opening stocks (per item & store)
      const openingStocks = await openingStockRepo.find({
        where: storeId != null ? { store_id: storeId } : {},
      });

      // Movements before fromDate (to adjust opening) — only filter by store_id when provided
      const earlierWhere: { date: any; store_id?: number } = { date: LessThan(fromDate) };
      if (storeId != null) earlierWhere.store_id = storeId;
      const earlierMovements = await stockMovementRepo.find({
        where: earlierWhere,
      });

      // Movements within [fromDate, toDate] — include TRANSFER_IN/TRANSFER_OUT from store transfer notes
      const periodWhere: { date: any; store_id?: number } = { date: Between(fromDate, toDate) };
      if (storeId != null) periodWhere.store_id = storeId;
      const periodMovements = await stockMovementRepo.find({
        where: periodWhere,
      });

      type Aggregates = {
        store_id: number;
        item_id: number;
        opening_qty: number;
        purchase_qty: number;
        transfer_in_qty: number;
        transfer_out_qty: number;
        issue_qty: number;
      };

      const aggregates = new Map<string, Aggregates>();

      const getKey = (store_id: number, item_id: number) => `${store_id}_${item_id}`;

      const ensureAgg = (store_id: number, item_id: number): Aggregates => {
        const key = getKey(store_id, item_id);
        let agg = aggregates.get(key);
        if (!agg) {
          agg = {
            store_id,
            item_id,
            opening_qty: 0,
            purchase_qty: 0,
            transfer_in_qty: 0,
            transfer_out_qty: 0,
            issue_qty: 0,
          };
          aggregates.set(key, agg);
        }
        return agg;
      };

      // Base opening from opening_stocks
      openingStocks.forEach((os) => {
        const store_id = os.store_id;
        if (!storeIds.includes(store_id)) return;
        const agg = ensureAgg(store_id, os.item_id);
        agg.opening_qty += parseFloat(os.opening_qty.toString());
      });

      // Adjust opening with movements before fromDate
      earlierMovements.forEach((mv) => {
        if (!storeIds.includes(mv.store_id)) return;
        const agg = ensureAgg(mv.store_id, mv.item_id);
        const qty = parseFloat(mv.qty.toString());
        switch (mv.movement_type) {
          case MovementType.IN:
          case MovementType.TRANSFER_IN:
            agg.opening_qty += qty;
            break;
          case MovementType.OUT:
          case MovementType.TRANSFER_OUT:
            agg.opening_qty -= qty;
            break;
          default:
            break;
        }
      });

      // Period movements
      periodMovements.forEach((mv) => {
        if (!storeIds.includes(mv.store_id)) return;
        const agg = ensureAgg(mv.store_id, mv.item_id);
        const qty = parseFloat(mv.qty.toString());
        switch (mv.movement_type) {
          case MovementType.IN:
            agg.purchase_qty += qty;
            break;
          case MovementType.TRANSFER_IN:
            agg.transfer_in_qty += qty;
            break;
          case MovementType.TRANSFER_OUT:
            agg.transfer_out_qty += qty;
            break;
          case MovementType.OUT:
            agg.issue_qty += qty;
            break;
          default:
            break;
        }
      });

      if (aggregates.size === 0) {
        return [];
      }

      // Load item & store info (exclude soft-deleted)
      const itemIds = Array.from(new Set(Array.from(aggregates.values()).map((a) => a.item_id)));
      const [items, rates] = await Promise.all([
        itemRepo.find({
          where: itemIds.map((id) => ({ id, is_deleted: false })),
        }),
        rateRepo
          .createQueryBuilder('rate')
          .where('rate.item_id IN (:...itemIds)', { itemIds })
          .andWhere('rate.effective_date <= :toDate', { toDate })
          .orderBy('rate.item_id', 'ASC')
          .addOrderBy('rate.effective_date', 'DESC')
          .getMany(),
      ]);

      const itemMap = new Map<number, Item>();
      items.forEach((i) => itemMap.set(i.id, i));

      const storeMap = new Map<number, Store>();
      stores.forEach((s) => storeMap.set(s.id, s));

      const rateMap = new Map<number, Rate>();
      rates.forEach((rate) => {
        if (!rateMap.has(rate.item_id)) {
          rateMap.set(rate.item_id, rate);
        }
      });

      const rows: StoreWiseStockReportRow[] = [];

      aggregates.forEach((agg) => {
        const item = itemMap.get(agg.item_id);
        const store = storeMap.get(agg.store_id);
        if (!item || !store) return;

        const closing_qty =
          agg.opening_qty +
          agg.purchase_qty +
          agg.transfer_in_qty -
          agg.transfer_out_qty -
          agg.issue_qty;

        const rate = rateMap.get(agg.item_id);
        const stock_rate = rate ? parseFloat(rate.rate.toString()) : null;
        const stock_value =
          stock_rate !== null ? parseFloat((closing_qty * stock_rate).toFixed(2)) : null;

        rows.push({
          store_id: store.id,
          store_code: Number(store.store_code),
          store_name: store.store_name,
          item_id: item.id,
          item_code: item.item_code,
          item_name: item.item_name,
          opening_qty: parseFloat(agg.opening_qty.toFixed(2)),
          purchase_qty: parseFloat(agg.purchase_qty.toFixed(2)),
          transfer_in_qty: parseFloat(agg.transfer_in_qty.toFixed(2)),
          transfer_out_qty: parseFloat(agg.transfer_out_qty.toFixed(2)),
          closing_qty: parseFloat(closing_qty.toFixed(2)),
          stock_rate,
          stock_value,
        });
      });

      // Sort for stable output
      rows.sort((a, b) => {
        if (a.store_code === b.store_code) {
          return a.item_code.localeCompare(b.item_code);
        }
        return a.store_code - b.store_code;
      });

      return rows;
    } catch (error) {
      logger.error('Error generating store wise stock report', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fromDate,
        toDate,
        storeId,
      });
      throw error;
    }
  }

  /**
   * Store Transfer Detail Report
   *
   * Returns one row per transfer detail line, filtered by:
   * - from_store_id (optional)
   * - to_store_id (optional)
   * - date range [fromDate, toDate]
   */
  static async getStoreTransferDetailReport(
    fromDate: Date,
    toDate: Date,
    filters?: { from_store_id?: number; to_store_id?: number }
  ): Promise<StoreTransferDetailRow[]> {
    try {
      const transferNoteRepo = this.getStoreTransferNoteRepository();

      // Normalize to full day range so date-only params (e.g. "2025-02-01") include all transfers that day
      const from = new Date(fromDate);
      from.setUTCHours(0, 0, 0, 0);
      const to = new Date(toDate);
      to.setUTCHours(23, 59, 59, 999);

      const qb = transferNoteRepo
        .createQueryBuilder('stn')
        .innerJoinAndSelect('stn.fromStore', 'fromStore')
        .innerJoinAndSelect('stn.toStore', 'toStore')
        .innerJoinAndSelect('stn.details', 'detail')
        .leftJoinAndSelect('detail.item', 'item')
        .where('stn.date >= :fromDate AND stn.date <= :toDate', { fromDate: from, toDate: to })
        .andWhere('fromStore.is_deleted = false')
        .andWhere('toStore.is_deleted = false');

      if (filters?.from_store_id) {
        qb.andWhere('stn.from_store_id = :fromStoreId', { fromStoreId: filters.from_store_id });
      }

      if (filters?.to_store_id) {
        qb.andWhere('stn.to_store_id = :toStoreId', { toStoreId: filters.to_store_id });
      }

      qb.orderBy('stn.date', 'ASC').addOrderBy('stn.v_no', 'ASC').addOrderBy('detail.id', 'ASC');

      const transferNotes = await qb.getMany();

      const rows: StoreTransferDetailRow[] = [];

      transferNotes.forEach((note) => {
        note.details?.forEach((detail) => {
          rows.push({
            transfer_note_id: note.id,
            v_no: note.v_no,
            date: note.date,
            ref_no: note.ref_no,
            order_no: note.order_no,
            from_store_id: note.from_store_id,
            from_store_code: note.fromStore ? Number(note.fromStore.store_code) : null,
            from_store_name: note.fromStore?.store_name || '',
            to_store_id: note.to_store_id,
            to_store_code: note.toStore ? Number(note.toStore.store_code) : null,
            to_store_name: note.toStore?.store_name || '',
            item_id: detail.item_id,
            item_code: detail.item?.item_code || detail.item_code,
            item_name: detail.item?.item_name || detail.item_name,
            qty: parseFloat(detail.qty.toString()),
            ref: detail.ref,
          });
        });
      });

      return rows;
    } catch (error) {
      logger.error('Error generating store transfer detail report', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fromDate,
        toDate,
        filters,
      });
      throw error;
    }
  }
}

