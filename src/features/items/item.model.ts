import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { Item } from '../../entities/inventory/Item';
import { OpeningStock } from '../../entities/inventory/OpeningStock';
import { StockMovement, MovementType } from '../../entities/inventory/StockMovement';
import { User } from '../../entities/core/User';
import { CreateItemRequest, UpdateItemRequest, PaginationParams, ItemWithOpeningStocks } from '../../types';
import logger from '../../utils/logger';

export class ItemModel {
  private static getRepository(): Repository<Item> {
    return AppDataSource.getRepository(Item);
  }

  private static getOpeningStockRepository(): Repository<OpeningStock> {
    return AppDataSource.getRepository(OpeningStock);
  }

  private static getStockMovementRepository(): Repository<StockMovement> {
    return AppDataSource.getRepository(StockMovement);
  }

  private static async generateItemCode(): Promise<string> {
    const repository = this.getRepository();

    const last = await repository
      .createQueryBuilder('item')
      .select('item.id', 'id')
      .orderBy('item.id', 'DESC')
      .limit(1)
      .getRawOne<{ id: number }>();

    const nextNumber = (last?.id ?? 0) + 1;
    return nextNumber.toString().padStart(4, '0');
  }

  static async createItem(itemData: CreateItemRequest, updatedBy?: number): Promise<Item> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const itemRepo = queryRunner.manager.getRepository(Item);
      const openingStockRepo = queryRunner.manager.getRepository(OpeningStock);
      const stockMovementRepo = queryRunner.manager.getRepository(StockMovement);

      // Create item
      const itemCode = await this.generateItemCode();
      const item = itemRepo.create({
        item_code: itemCode,
        item_name: itemData.item_name,
        item_category: itemData.item_category || null,
        updated_by: updatedBy || null,
      });
      const savedItem = await itemRepo.save(item);

      // Create opening stocks if provided
      if (itemData.opening_stocks && itemData.opening_stocks.length > 0) {
        for (const openingStock of itemData.opening_stocks) {
          const openingStockEntity = openingStockRepo.create({
            item_id: savedItem.id,
            store_id: openingStock.store_id,
            opening_qty: openingStock.opening_qty,
          });
          await openingStockRepo.save(openingStockEntity);

          // Create stock movement for opening stock
          const movement = stockMovementRepo.create({
            item_id: savedItem.id,
            store_id: openingStock.store_id,
            movement_type: MovementType.OPENING_STOCK,
            qty: openingStock.opening_qty,
            reference_type: 'OPENING_STOCK',
            reference_id: savedItem.id,
            v_no: null,
            date: new Date(),
          });
          await stockMovementRepo.save(movement);
        }
      }

      await queryRunner.commitTransaction();
      return savedItem;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Error creating item', {
        error: error instanceof Error ? error.message : 'Unknown error',
        item_name: itemData.item_name
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  static async getItemById(id: number): Promise<Item | null> {
    try {
      const repository = this.getRepository();
      const item = await repository.findOne({
        where: { id },
      });

      if (!item) return null;

      // Get updated_by username if exists
      if (item.updated_by) {
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { id: item.updated_by } });
        if (user) {
          (item as any).updated_by_username = user.username;
        }
      }

      return item;
    } catch (error) {
      logger.error('Error getting item by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        itemId: id
      });
      throw error;
    }
  }

  static async getItemWithOpeningStocks(id: number): Promise<ItemWithOpeningStocks | null> {
    try {
      const item = await this.getItemById(id);
      if (!item) return null;

      const openingStockRepo = this.getOpeningStockRepository();
      const openingStocks = await openingStockRepo.find({
        where: { item_id: id },
        relations: ['store'],
      });

      const openingStocksWithStoreInfo = openingStocks.map(os => ({
        id: os.id,
        item_id: os.item_id,
        store_id: os.store_id,
        store_code: (os.store as any).store_code,
        store_name: (os.store as any).store_name,
        opening_qty: parseFloat(os.opening_qty.toString()),
        created_at: os.created_at,
        updated_at: os.updated_at,
      }));

      return {
        ...item,
        opening_stocks: openingStocksWithStoreInfo,
      };
    } catch (error) {
      logger.error('Error getting item with opening stocks', {
        error: error instanceof Error ? error.message : 'Unknown error',
        itemId: id
      });
      throw error;
    }
  }

  static async getItems(
    pagination: PaginationParams = {},
    all?: boolean
  ): Promise<{ items: Item[]; total: number }> {
    try {
      const repository = this.getRepository();
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const skip = all ? undefined : (page - 1) * limit;
      const take = all ? undefined : limit;

      const sortBy = pagination.sort_by || 'created_at';
      const sortOrder = pagination.sort_order === 'asc' ? 'ASC' : 'DESC';

      const [items, total] = await Promise.all([
        repository.find({
          skip,
          take,
          order: {
            [sortBy]: sortOrder,
          },
        }),
        repository.count(),
      ]);

      // Get updated_by usernames
      const userIds = [...new Set(items.map(i => i.updated_by).filter(Boolean) as number[])];
      if (userIds.length > 0) {
        const userRepo = AppDataSource.getRepository(User);
        const users = await userRepo.find({ where: userIds.map(id => ({ id })) });
        const userMap = new Map(users.map(u => [u.id, u.username]));

        items.forEach(item => {
          if (item.updated_by && userMap.has(item.updated_by)) {
            (item as any).updated_by_username = userMap.get(item.updated_by);
          }
        });
      }

      return { items, total };
    } catch (error) {
      logger.error('Error getting items', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get items that are low in stock (per store), based on a threshold.
   * Current stock is calculated as:
   *   opening stock + IN/TRANSFER_IN - OUT/TRANSFER_OUT
   */
  static async getLowStockItems(
    threshold: number,
    storeId?: number
  ): Promise<
    Array<{
      item_id: number;
      item_code: string;
      item_name: string;
      store_id: number;
      store_code: string;
      store_name: string;
      current_stock: number;
    }>
  > {
    try {
      const openingStockRepo = this.getOpeningStockRepository();
      const stockMovementRepo = this.getStockMovementRepository();
      const itemRepo = this.getRepository();
      const storeRepo = AppDataSource.getRepository('Store' as any);

      // Get all opening stocks (optionally filtered by store)
      const openingStocks = await openingStockRepo.find({
        where: storeId ? { store_id: storeId } : {},
      });

      // Get all stock movements (optionally filtered by store)
      const movements = await stockMovementRepo.find({
        where: storeId ? { store_id: storeId } : {},
      });

      // Build unique item-store combinations
      const comboKeys = new Set<string>();
      const combos: Array<{ itemId: number; storeId: number }> = [];

      const addCombo = (itemId: number, sId: number) => {
        const key = `${itemId}_${sId}`;
        if (!comboKeys.has(key)) {
          comboKeys.add(key);
          combos.push({ itemId, storeId: sId });
        }
      };

      openingStocks.forEach(os => addCombo(os.item_id, os.store_id));
      movements.forEach(mv => addCombo(mv.item_id, mv.store_id));

      if (combos.length === 0) {
        return [];
      }

      // Calculate current stock for each combo
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

      // Filter low stock combos
      const lowStockCombos = combos.filter(({ itemId, storeId }) => {
        const key = `${itemId}_${storeId}`;
        const stock = stockByKey.get(key) ?? 0;
        return stock < threshold;
      });

      if (lowStockCombos.length === 0) {
        return [];
      }

      // Load item and store details
      const itemIds = Array.from(new Set(lowStockCombos.map(c => c.itemId)));
      const storeIds = Array.from(new Set(lowStockCombos.map(c => c.storeId)));

      const [items, stores] = await Promise.all([
        itemRepo.find({ where: itemIds.map(id => ({ id })) }),
        storeRepo.find({ where: storeIds.map((id: number) => ({ id })) }),
      ]);

      const itemMap = new Map<number, Item>();
      items.forEach(item => itemMap.set(item.id, item));

      const storeMap = new Map<number, any>();
      (stores as any[]).forEach(store => storeMap.set(store.id, store));

      // Build result
      const result: Array<{
        item_id: number;
        item_code: string;
        item_name: string;
        store_id: number;
        store_code: string;
        store_name: string;
        current_stock: number;
      }> = [];

      lowStockCombos.forEach(({ itemId, storeId }) => {
        const key = `${itemId}_${storeId}`;
        const stock = stockByKey.get(key) ?? 0;
        const item = itemMap.get(itemId);
        const store = storeMap.get(storeId);

        if (!item || !store) return;

        result.push({
          item_id: item.id,
          item_code: item.item_code,
          item_name: item.item_name,
          store_id: store.id,
          store_code: store.store_code,
          store_name: store.store_name,
          current_stock: stock,
        });
      });

      // Sort by current stock ascending
      result.sort((a, b) => a.current_stock - b.current_stock);

      return result;
    } catch (error) {
      logger.error('Error getting low stock items', {
        error: error instanceof Error ? error.message : 'Unknown error',
        threshold,
        storeId,
      });
      throw error;
    }
  }

  static async updateItem(
    id: number,
    itemData: UpdateItemRequest,
    updatedBy?: number
  ): Promise<Item | null> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const itemRepo = queryRunner.manager.getRepository(Item);
      const openingStockRepo = queryRunner.manager.getRepository(OpeningStock);
      const stockMovementRepo = queryRunner.manager.getRepository(StockMovement);

      const updateData: any = {
        updated_at: new Date(),
      };

      if (itemData.item_code !== undefined) updateData.item_code = itemData.item_code;
      if (itemData.item_name !== undefined) updateData.item_name = itemData.item_name;
      if (itemData.item_category !== undefined) updateData.item_category = itemData.item_category;
      if (updatedBy !== undefined) updateData.updated_by = updatedBy;

      await itemRepo.update(id, updateData);

      // Update opening stocks if provided
      if (itemData.opening_stocks !== undefined) {
        // Delete existing opening stock movements
        await stockMovementRepo.delete({ 
          item_id: id, 
          reference_type: 'OPENING_STOCK',
          reference_id: id 
        });

        // Delete existing opening stocks
        await openingStockRepo.delete({ item_id: id });

        // Create new opening stocks
        if (itemData.opening_stocks.length > 0) {
          for (const openingStock of itemData.opening_stocks) {
            const openingStockEntity = openingStockRepo.create({
              item_id: id,
              store_id: openingStock.store_id,
              opening_qty: openingStock.opening_qty,
            });
            await openingStockRepo.save(openingStockEntity);

            // Create stock movement for opening stock
            const movement = stockMovementRepo.create({
              item_id: id,
              store_id: openingStock.store_id,
              movement_type: MovementType.OPENING_STOCK,
              qty: openingStock.opening_qty,
              reference_type: 'OPENING_STOCK',
              reference_id: id,
              v_no: null,
              date: new Date(),
            });
            await stockMovementRepo.save(movement);
          }
        }
      }

      await queryRunner.commitTransaction();
      return await this.getItemById(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Error updating item', {
        error: error instanceof Error ? error.message : 'Unknown error',
        itemId: id
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  static async deleteItem(id: number): Promise<{ success: boolean; message: string }> {
    try {
      const repository = this.getRepository();
      const item = await repository.findOne({ where: { id } });
      
      if (!item) {
        return { success: false, message: 'Item not found' };
      }

      await repository.delete(id);
      return { success: true, message: 'Item deleted successfully' };
    } catch (error) {
      logger.error('Error deleting item', {
        error: error instanceof Error ? error.message : 'Unknown error',
        itemId: id
      });
      throw error;
    }
  }
}
