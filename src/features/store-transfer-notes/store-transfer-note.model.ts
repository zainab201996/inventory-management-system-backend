import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { StoreTransferNote } from '../../entities/inventory/StoreTransferNote';
import { StoreTransferNoteDetail } from '../../entities/inventory/StoreTransferNoteDetail';
import { StockMovement, MovementType } from '../../entities/inventory/StockMovement';
import { Store } from '../../entities/inventory/Store';
import { CreateStoreTransferNoteRequest, UpdateStoreTransferNoteRequest, PaginationParams, StoreTransferNoteWithRelations } from '../../types';
import logger from '../../utils/logger';
import { StockCalculator } from '../../utils/stock-calculator';

export class StoreTransferNoteModel {
  private static getRepository(): Repository<StoreTransferNote> {
    return AppDataSource.getRepository(StoreTransferNote);
  }

  private static getDetailRepository(): Repository<StoreTransferNoteDetail> {
    return AppDataSource.getRepository(StoreTransferNoteDetail);
  }

  private static getStockMovementRepository(): Repository<StockMovement> {
    return AppDataSource.getRepository(StockMovement);
  }

  private static getStoreRepository(): Repository<Store> {
    return AppDataSource.getRepository(Store);
  }

  static async createTransferNote(
    transferData: CreateStoreTransferNoteRequest
  ): Promise<StoreTransferNoteWithRelations> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transferNoteRepo = queryRunner.manager.getRepository(StoreTransferNote);
      const detailRepo = queryRunner.manager.getRepository(StoreTransferNoteDetail);
      const stockMovementRepo = queryRunner.manager.getRepository(StockMovement);

      // Determine next voucher number (auto-increment from last purely numeric v_no)
      const lastNote = await transferNoteRepo
        .createQueryBuilder('note')
        .where("note.v_no ~ '^[0-9]+$'")
        .orderBy('CAST(note.v_no AS BIGINT)', 'DESC')
        .getOne();

      let nextVoucherNumber = '1';
      if (lastNote?.v_no) {
        const lastNumber = parseInt(lastNote.v_no, 10);
        if (!Number.isNaN(lastNumber) && lastNumber >= 0) {
          nextVoucherNumber = String(lastNumber + 1);
        }
      }

      // Get store information for better error messages
      const storeRepo = this.getStoreRepository();
      const fromStore = await storeRepo.findOne({
        where: { id: transferData.from_store_id },
      });

      const storeInfo = fromStore ? {
        store_code: fromStore.store_code,
        store_name: fromStore.store_name,
      } : undefined;

      // Validate stock availability for all items before creating transfer
      const validationErrors: string[] = [];
      
      for (const detail of transferData.details) {
        const validation = await StockCalculator.validateStockAvailability(
          detail.item_id,
          transferData.from_store_id,
          detail.qty,
          storeInfo
        );

        if (!validation.isValid) {
          validationErrors.push(
            `Item ${detail.item_code} (${detail.item_name}): ${validation.message}`
          );
        }
      }

      // If any validation fails, throw a clear validation error
      if (validationErrors.length > 0) {
        const errorMessage = `Insufficient stock in source store for one or more items:\n${validationErrors.join('\n')}`;
        logger.warn('Store transfer validation failed', {
          v_no: transferData.v_no,
          from_store_id: transferData.from_store_id,
          errors: validationErrors,
        });
        throw new Error(errorMessage);
      }

      // Create master record
      const transferNote = transferNoteRepo.create({
        v_no: nextVoucherNumber,
        date: new Date(transferData.date),
        ref_no: transferData.ref_no || null,
        from_store_id: transferData.from_store_id,
        to_store_id: transferData.to_store_id,
        order_no: transferData.order_no || null,
        created_by: transferData.created_by || null,
      });
      const savedTransferNote = await transferNoteRepo.save(transferNote);

      // Create detail records and stock movements
      const detailEntities = [];
      for (const detail of transferData.details) {
        const detailEntity = detailRepo.create({
          store_transfer_note_id: savedTransferNote.id,
          item_id: detail.item_id,
          item_code: detail.item_code,
          item_name: detail.item_name,
          qty: detail.qty,
          ref: detail.ref || null,
        });
        const savedDetail = await detailRepo.save(detailEntity);
        detailEntities.push(savedDetail);

        // Create OUT movement from source store
        const outMovement = stockMovementRepo.create({
          item_id: detail.item_id,
          store_id: transferData.from_store_id,
          movement_type: MovementType.TRANSFER_OUT,
          qty: detail.qty,
          reference_type: 'TRANSFER_NOTE',
          reference_id: savedTransferNote.id,
          v_no: nextVoucherNumber,
          date: new Date(transferData.date),
        });
        await stockMovementRepo.save(outMovement);

        // Create IN movement to destination store
        const inMovement = stockMovementRepo.create({
          item_id: detail.item_id,
          store_id: transferData.to_store_id,
          movement_type: MovementType.TRANSFER_IN,
          qty: detail.qty,
          reference_type: 'TRANSFER_NOTE',
          reference_id: savedTransferNote.id,
          v_no: nextVoucherNumber,
          date: new Date(transferData.date),
        });
        await stockMovementRepo.save(inMovement);
      }

      await queryRunner.commitTransaction();

      // Return with relations
      return await this.getTransferNoteById(savedTransferNote.id) as StoreTransferNoteWithRelations;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Error creating store transfer note', {
        error: error instanceof Error ? error.message : 'Unknown error',
        v_no: transferData.v_no
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  static async getTransferNoteById(id: number): Promise<StoreTransferNoteWithRelations | null> {
    try {
      const repository = this.getRepository();
      const transferNote = await repository.findOne({
        where: { id },
        relations: ['fromStore', 'toStore', 'details', 'details.item'],
      });

      if (!transferNote) return null;

      return transferNote as StoreTransferNoteWithRelations;
    } catch (error) {
      logger.error('Error getting transfer note by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transferNoteId: id
      });
      throw error;
    }
  }

  static async getTransferNotes(
    pagination: PaginationParams = {},
    filters?: { from_store_id?: number; to_store_id?: number },
    all?: boolean
  ): Promise<{ transferNotes: StoreTransferNote[]; total: number }> {
    try {
      const repository = this.getRepository();
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const skip = all ? undefined : (page - 1) * limit;
      const take = all ? undefined : limit;

      const sortBy = pagination.sort_by || 'date';
      const sortOrder = pagination.sort_order === 'asc' ? 'ASC' : 'DESC';

      const qb = repository
        .createQueryBuilder('stn')
        .innerJoinAndSelect('stn.fromStore', 'fromStore')
        .innerJoinAndSelect('stn.toStore', 'toStore')
        .leftJoinAndSelect('stn.details', 'details')
        .leftJoinAndSelect('details.item', 'item')
        .where('fromStore.is_deleted = false')
        .andWhere('toStore.is_deleted = false');

      if (filters?.from_store_id) {
        qb.andWhere('stn.from_store_id = :fromStoreId', { fromStoreId: filters.from_store_id });
      }
      if (filters?.to_store_id) {
        qb.andWhere('stn.to_store_id = :toStoreId', { toStoreId: filters.to_store_id });
      }

      qb.orderBy(`stn.${sortBy}`, sortOrder);

      const dataQb = qb.clone();
      if (!all && typeof skip === 'number' && typeof take === 'number') {
        dataQb.skip(skip).take(take);
      }

      const [transferNotes, total] = await Promise.all([
        dataQb.getMany(),
        qb.getCount(),
      ]);

      return { transferNotes, total };
    } catch (error) {
      logger.error('Error getting transfer notes', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  static async updateTransferNote(
    id: number,
    transferData: UpdateStoreTransferNoteRequest
  ): Promise<StoreTransferNoteWithRelations | null> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transferNoteRepo = queryRunner.manager.getRepository(StoreTransferNote);
      const detailRepo = queryRunner.manager.getRepository(StoreTransferNoteDetail);
      const stockMovementRepo = queryRunner.manager.getRepository(StockMovement);

      const existingTransferNote = await transferNoteRepo.findOne({
        where: { id },
        relations: ['details'],
      });

      if (!existingTransferNote) {
        await queryRunner.rollbackTransaction();
        return null;
      }

      // Update master record
      const updateData: any = {
        updated_at: new Date(),
      };

      // Voucher number is locked after creation (not updatable)
      if (transferData.date !== undefined) updateData.date = new Date(transferData.date);
      if (transferData.ref_no !== undefined) updateData.ref_no = transferData.ref_no;
      if (transferData.from_store_id !== undefined) updateData.from_store_id = transferData.from_store_id;
      if (transferData.to_store_id !== undefined) updateData.to_store_id = transferData.to_store_id;
      if (transferData.order_no !== undefined) updateData.order_no = transferData.order_no;

      await transferNoteRepo.update(id, updateData);

      // Update details if provided
      if (transferData.details !== undefined) {
        // Get updated transfer note to determine store IDs
        const updatedTransferNote = await transferNoteRepo.findOne({ where: { id } });
        if (!updatedTransferNote) {
          await queryRunner.rollbackTransaction();
          return null;
        }

        const fromStoreId = transferData.from_store_id ?? updatedTransferNote.from_store_id;
        const toStoreId = transferData.to_store_id ?? updatedTransferNote.to_store_id;

        // Get store information for better error messages
        const storeRepo = this.getStoreRepository();
        const fromStore = await storeRepo.findOne({
          where: { id: fromStoreId },
        });

        const storeInfo = fromStore ? {
          store_code: fromStore.store_code,
          store_name: fromStore.store_name,
        } : undefined;

        // Validate stock availability for all items before updating
        const validationErrors: string[] = [];
        
        for (const detail of transferData.details) {
          const validation = await StockCalculator.validateStockAvailability(
            detail.item_id,
            fromStoreId,
            detail.qty,
            storeInfo
          );

          if (!validation.isValid) {
            validationErrors.push(
              `Item ${detail.item_code} (${detail.item_name}): ${validation.message}`
            );
          }
        }

        // If any validation fails, throw a clear validation error
        if (validationErrors.length > 0) {
          const errorMessage = `Insufficient stock in source store for one or more items:\n${validationErrors.join('\n')}`;
          logger.warn('Store transfer update validation failed', {
            transferNoteId: id,
            from_store_id: fromStoreId,
            errors: validationErrors,
          });
          throw new Error(errorMessage);
        }

        // Delete existing details and stock movements
        await detailRepo.delete({ store_transfer_note_id: id });
        await stockMovementRepo.delete({ reference_id: id, reference_type: 'TRANSFER_NOTE' });

        // Create new details and stock movements
        for (const detail of transferData.details) {
          const detailEntity = detailRepo.create({
            store_transfer_note_id: id,
            item_id: detail.item_id,
            item_code: detail.item_code,
            item_name: detail.item_name,
            qty: detail.qty,
            ref: detail.ref || null,
          });
          await detailRepo.save(detailEntity);

          // Create stock movements
          const fromStoreId = transferData.from_store_id ?? updatedTransferNote.from_store_id;
          const toStoreId = transferData.to_store_id ?? updatedTransferNote.to_store_id;
          const vNo = transferData.v_no ?? updatedTransferNote.v_no;
          const date = transferData.date ? new Date(transferData.date) : updatedTransferNote.date;

          // OUT movement
          const outMovement = stockMovementRepo.create({
            item_id: detail.item_id,
            store_id: fromStoreId,
            movement_type: MovementType.TRANSFER_OUT,
            qty: detail.qty,
            reference_type: 'TRANSFER_NOTE',
            reference_id: id,
            v_no: vNo,
            date: date,
          });
          await stockMovementRepo.save(outMovement);

          // IN movement
          const inMovement = stockMovementRepo.create({
            item_id: detail.item_id,
            store_id: toStoreId,
            movement_type: MovementType.TRANSFER_IN,
            qty: detail.qty,
            reference_type: 'TRANSFER_NOTE',
            reference_id: id,
            v_no: vNo,
            date: date,
          });
          await stockMovementRepo.save(inMovement);
        }
      }

      await queryRunner.commitTransaction();
      return await this.getTransferNoteById(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Error updating transfer note', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transferNoteId: id
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  static async deleteTransferNote(id: number): Promise<{ success: boolean; message: string }> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transferNoteRepo = queryRunner.manager.getRepository(StoreTransferNote);
      const stockMovementRepo = queryRunner.manager.getRepository(StockMovement);

      const transferNote = await transferNoteRepo.findOne({ where: { id } });
      
      if (!transferNote) {
        await queryRunner.rollbackTransaction();
        return { success: false, message: 'Transfer note not found' };
      }

      // Delete stock movements first
      await stockMovementRepo.delete({ reference_id: id, reference_type: 'TRANSFER_NOTE' });

      // Delete transfer note (details will be deleted via CASCADE)
      await transferNoteRepo.delete(id);

      await queryRunner.commitTransaction();
      return { success: true, message: 'Transfer note deleted successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Error deleting transfer note', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transferNoteId: id
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
