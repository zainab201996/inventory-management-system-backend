import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Item } from './Item';
import { Store } from './Store';

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  OPENING_STOCK = 'OPENING_STOCK',
}

@Entity('stock_movements')
@Index(['item_id', 'store_id'])
@Index(['date'])
export class StockMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'item_id' })
  item_id: number;

  @Column({ name: 'store_id' })
  store_id: number;

  @Column({ name: 'movement_type', type: 'varchar', length: 20 })
  movement_type: MovementType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  qty: number;

  @Column({ name: 'reference_type', type: 'varchar', length: 50 })
  reference_type: string; // 'OPENING_STOCK', 'TRANSFER_NOTE', etc.

  @Column({ name: 'reference_id', type: 'integer', nullable: true })
  reference_id: number | null;

  @Column({ name: 'v_no', type: 'varchar', length: 50, nullable: true })
  v_no: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  date: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  // Relations
  @ManyToOne(() => Item, (item) => item.stockMovements)
  @JoinColumn({ name: 'item_id' })
  item: Item;

  @ManyToOne(() => Store, (store) => store.stockMovements)
  @JoinColumn({ name: 'store_id' })
  store: Store;
}
