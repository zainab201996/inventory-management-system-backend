import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { Rate } from '../../entities/inventory/Rate';
import { CreateRateRequest, UpdateRateRequest, PaginationParams, RateWithItem } from '../../types';
import logger from '../../utils/logger';

export class RateModel {
  private static getRepository(): Repository<Rate> {
    return AppDataSource.getRepository(Rate);
  }

  static async createRate(rateData: CreateRateRequest): Promise<Rate> {
    try {
      const repository = this.getRepository();
      const rate = repository.create({
        item_id: rateData.item_id,
        rate: rateData.rate,
        effective_date: rateData.effective_date ? new Date(rateData.effective_date) : new Date(),
      });
      return await repository.save(rate);
    } catch (error) {
      logger.error('Error creating rate', {
        error: error instanceof Error ? error.message : 'Unknown error',
        item_id: rateData.item_id
      });
      throw error;
    }
  }

  static async getRateById(id: number): Promise<Rate | null> {
    try {
      const repository = this.getRepository();
      return await repository.findOne({
        where: { id },
        relations: ['item'],
      });
    } catch (error) {
      logger.error('Error getting rate by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        rateId: id
      });
      throw error;
    }
  }

  static async getRates(
    pagination: PaginationParams = {},
    filters?: { item_id?: number },
    all?: boolean
  ): Promise<{ rates: Rate[]; total: number }> {
    try {
      const repository = this.getRepository();
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const skip = all ? undefined : (page - 1) * limit;
      const take = all ? undefined : limit;

      const sortBy = pagination.sort_by || 'effective_date';
      const sortOrder = pagination.sort_order === 'asc' ? 'ASC' : 'DESC';

      const where: any = {};
      if (filters?.item_id) {
        where.item_id = filters.item_id;
      }

      const [rates, total] = await Promise.all([
        repository.find({
          where,
          skip,
          take,
          relations: ['item'],
          order: {
            [sortBy]: sortOrder,
          },
        }),
        repository.count({ where }),
      ]);

      return { rates, total };
    } catch (error) {
      logger.error('Error getting rates', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  static async getCurrentRate(itemId: number): Promise<Rate | null> {
    try {
      const repository = this.getRepository();
      return await repository.findOne({
        where: { item_id: itemId },
        relations: ['item'],
        order: {
          effective_date: 'DESC',
        },
      });
    } catch (error) {
      logger.error('Error getting current rate', {
        error: error instanceof Error ? error.message : 'Unknown error',
        itemId
      });
      throw error;
    }
  }

  static async updateRate(
    id: number,
    rateData: UpdateRateRequest
  ): Promise<Rate | null> {
    try {
      const repository = this.getRepository();
      const updateData: any = {
        updated_at: new Date(),
      };

      if (rateData.rate !== undefined) updateData.rate = rateData.rate;
      if (rateData.effective_date !== undefined) {
        updateData.effective_date = new Date(rateData.effective_date);
      }

      await repository.update(id, updateData);
      return await this.getRateById(id);
    } catch (error) {
      logger.error('Error updating rate', {
        error: error instanceof Error ? error.message : 'Unknown error',
        rateId: id
      });
      throw error;
    }
  }

  static async deleteRate(id: number): Promise<{ success: boolean; message: string }> {
    try {
      const repository = this.getRepository();
      const rate = await repository.findOne({ where: { id } });
      
      if (!rate) {
        return { success: false, message: 'Rate not found' };
      }

      await repository.delete(id);
      return { success: true, message: 'Rate deleted successfully' };
    } catch (error) {
      logger.error('Error deleting rate', {
        error: error instanceof Error ? error.message : 'Unknown error',
        rateId: id
      });
      throw error;
    }
  }
}
