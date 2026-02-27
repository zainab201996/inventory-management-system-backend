import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { Store } from '../../entities/inventory/Store';
import { User } from '../../entities/core/User';
import { CreateStoreRequest, UpdateStoreRequest, PaginationParams } from '../../types';
import logger from '../../utils/logger';

export class StoreModel {
  private static getRepository(): Repository<Store> {
    return AppDataSource.getRepository(Store);
  }

  private static async generateStoreCode(): Promise<string> {
    const repository = this.getRepository();

    const last = await repository
      .createQueryBuilder('store')
      .select('store.id', 'id')
      .orderBy('store.id', 'DESC')
      .limit(1)
      .getRawOne<{ id: number }>();

    const nextNumber = (last?.id ?? 0) + 1;
    const padded = nextNumber.toString().padStart(4, '0');

    return `ST${padded}`;
  }

  static async createStore(storeData: CreateStoreRequest, updatedBy?: number): Promise<Store> {
    try {
      const repository = this.getRepository();
      const storeCode = await this.generateStoreCode();
      const store = repository.create({
        store_code: storeCode,
        store_name: storeData.store_name,
        updated_by: updatedBy || null,
      });
      return await repository.save(store);
    } catch (error) {
      logger.error('Error creating store', {
        error: error instanceof Error ? error.message : 'Unknown error',
        store_name: storeData.store_name
      });
      throw error;
    }
  }

  static async getStoreById(id: number): Promise<Store | null> {
    try {
      const repository = this.getRepository();
      const store = await repository.findOne({
        where: { id },
        relations: [],
      });

      if (!store) return null;

      // Get updated_by username if exists
      if (store.updated_by) {
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { id: store.updated_by } });
        if (user) {
          (store as any).updated_by_username = user.username;
        }
      }

      return store;
    } catch (error) {
      logger.error('Error getting store by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        storeId: id
      });
      throw error;
    }
  }

  static async getStores(
    pagination: PaginationParams = {},
    all?: boolean
  ): Promise<{ stores: Store[]; total: number }> {
    try {
      const repository = this.getRepository();
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const skip = all ? undefined : (page - 1) * limit;
      const take = all ? undefined : limit;

      const sortBy = pagination.sort_by || 'created_at';
      const sortOrder = pagination.sort_order === 'asc' ? 'ASC' : 'DESC';

      const [stores, total] = await Promise.all([
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
      const userIds = [...new Set(stores.map(s => s.updated_by).filter(Boolean) as number[])];
      if (userIds.length > 0) {
        const userRepo = AppDataSource.getRepository(User);
        const users = await userRepo.find({ where: userIds.map(id => ({ id })) });
        const userMap = new Map(users.map(u => [u.id, u.username]));

        stores.forEach(store => {
          if (store.updated_by && userMap.has(store.updated_by)) {
            (store as any).updated_by_username = userMap.get(store.updated_by);
          }
        });
      }

      return { stores, total };
    } catch (error) {
      logger.error('Error getting stores', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  static async getAllStores(): Promise<Store[]> {
    try {
      const repository = this.getRepository();
      return await repository.find({
        order: { store_name: 'ASC' },
      });
    } catch (error) {
      logger.error('Error getting all stores', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  static async updateStore(
    id: number,
    storeData: UpdateStoreRequest,
    updatedBy?: number
  ): Promise<Store | null> {
    try {
      const repository = this.getRepository();
      const updateData: any = {
        updated_at: new Date(),
      };

      if (storeData.store_code !== undefined) updateData.store_code = storeData.store_code;
      if (storeData.store_name !== undefined) updateData.store_name = storeData.store_name;
      if (updatedBy !== undefined) updateData.updated_by = updatedBy;

      await repository.update(id, updateData);
      return await this.getStoreById(id);
    } catch (error) {
      logger.error('Error updating store', {
        error: error instanceof Error ? error.message : 'Unknown error',
        storeId: id
      });
      throw error;
    }
  }

  static async deleteStore(id: number): Promise<{ success: boolean; message: string }> {
    try {
      const repository = this.getRepository();
      const store = await repository.findOne({ where: { id } });
      
      if (!store) {
        return { success: false, message: 'Store not found' };
      }

      await repository.delete(id);
      return { success: true, message: 'Store deleted successfully' };
    } catch (error) {
      logger.error('Error deleting store', {
        error: error instanceof Error ? error.message : 'Unknown error',
        storeId: id
      });
      throw error;
    }
  }
}
