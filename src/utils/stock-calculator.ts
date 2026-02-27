import { Repository } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { OpeningStock } from '../entities/inventory/OpeningStock';
import { StockMovement, MovementType } from '../entities/inventory/StockMovement';
import logger from './logger';

/**
 * Stock Calculator Utility
 * Calculates current stock for items in stores based on:
 * - Opening stock
 * - Stock movements (IN/OUT/TRANSFER_IN/TRANSFER_OUT)
 */
export class StockCalculator {
  private static getOpeningStockRepository(): Repository<OpeningStock> {
    return AppDataSource.getRepository(OpeningStock);
  }

  private static getStockMovementRepository(): Repository<StockMovement> {
    return AppDataSource.getRepository(StockMovement);
  }

  /**
   * Calculate current stock for an item in a specific store
   * Formula: Opening Stock + SUM(IN movements) - SUM(OUT movements)
   * 
   * @param itemId - Item ID
   * @param storeId - Store ID
   * @returns Current available quantity (can be negative if over-transferred)
   */
  static async getCurrentStock(itemId: number, storeId: number): Promise<number> {
    try {
      const openingStockRepo = this.getOpeningStockRepository();
      const stockMovementRepo = this.getStockMovementRepository();

      // Get opening stock
      const openingStock = await openingStockRepo.findOne({
        where: { item_id: itemId, store_id: storeId },
      });

      const openingQty = openingStock ? parseFloat(openingStock.opening_qty.toString()) : 0;

      // Get all stock movements for this item in this store
      const movements = await stockMovementRepo.find({
        where: { item_id: itemId, store_id: storeId },
      });

      // Calculate net movement
      let totalIn = 0;
      let totalOut = 0;

      for (const movement of movements) {
        const qty = parseFloat(movement.qty.toString());
        
        switch (movement.movement_type) {
          case MovementType.OPENING_STOCK:
            // Opening stock is already counted above, skip
            break;
          case MovementType.TRANSFER_IN:
          case MovementType.IN:
            totalIn += qty;
            break;
          case MovementType.TRANSFER_OUT:
          case MovementType.OUT:
            totalOut += qty;
            break;
        }
      }

      const currentStock = openingQty + totalIn - totalOut;
      
      logger.debug('Stock calculation', {
        itemId,
        storeId,
        openingQty,
        totalIn,
        totalOut,
        currentStock,
      });

      return currentStock;
    } catch (error) {
      logger.error('Error calculating current stock', {
        error: error instanceof Error ? error.message : 'Unknown error',
        itemId,
        storeId,
      });
      throw error;
    }
  }

  /**
   * Validate if sufficient stock is available for transfer
   * 
   * @param itemId - Item ID
   * @param storeId - Source store ID
   * @param requiredQty - Quantity needed for transfer
   * @param storeInfo - Optional store information (code and name) for better error messages
   * @returns Object with validation result and current stock
   */
  static async validateStockAvailability(
    itemId: number,
    storeId: number,
    requiredQty: number,
    storeInfo?: { store_code?: string; store_name?: string }
  ): Promise<{ isValid: boolean; currentStock: number; availableStock: number; message?: string }> {
    try {
      const currentStock = await this.getCurrentStock(itemId, storeId);
      const availableStock = Math.max(0, currentStock); // Don't allow negative transfers

      const isValid = availableStock >= requiredQty;

      let message: string | undefined;
      if (!isValid) {
        const storeLabel = storeInfo?.store_name 
          ? `Store "${storeInfo.store_name}" (${storeInfo.store_code || storeId})`
          : `Store ID ${storeId}`;
        
        message = `${storeLabel} does not have sufficient quantity. Available: ${availableStock.toFixed(2)}, Required: ${requiredQty.toFixed(2)}`;
      }

      return {
        isValid,
        currentStock,
        availableStock,
        message,
      };
    } catch (error) {
      logger.error('Error validating stock availability', {
        error: error instanceof Error ? error.message : 'Unknown error',
        itemId,
        storeId,
        requiredQty,
      });
      throw error;
    }
  }

  /**
   * Get current stock for multiple items in a store (batch operation)
   * 
   * @param items - Array of { itemId, storeId }
   * @returns Map of itemId_storeId to current stock
   */
  static async getCurrentStockBatch(
    items: Array<{ itemId: number; storeId: number }>
  ): Promise<Map<string, number>> {
    const results = new Map<string, number>();

    // Process in parallel for better performance
    const promises = items.map(async ({ itemId, storeId }) => {
      const key = `${itemId}_${storeId}`;
      const stock = await this.getCurrentStock(itemId, storeId);
      return { key, stock };
    });

    const stockResults = await Promise.all(promises);
    stockResults.forEach(({ key, stock }) => {
      results.set(key, stock);
    });

    return results;
  }
}
