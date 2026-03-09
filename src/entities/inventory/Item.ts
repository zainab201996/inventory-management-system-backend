import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { OpeningStock } from './OpeningStock';
import { Rate } from './Rate';
import { StoreTransferNoteDetail } from './StoreTransferNoteDetail';
import { StockMovement } from './StockMovement';

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'item_code', type: 'varchar', length: 50, unique: true })
  item_code: string;

  @Column({ name: 'item_name', type: 'varchar', length: 200 })
  item_name: string;

  @Column({ name: 'item_category', type: 'varchar', length: 100, nullable: true })
  item_category: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @Column({ name: 'updated_by', type: 'integer', nullable: true })
  updated_by: number | null;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  is_deleted: boolean;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deleted_at: Date | null;

  // Relations
  @OneToMany(() => OpeningStock, (openingStock) => openingStock.item)
  openingStocks: OpeningStock[];

  @OneToMany(() => Rate, (rate) => rate.item)
  rates: Rate[];

  @OneToMany(() => StoreTransferNoteDetail, (detail) => detail.item)
  transferNoteDetails: StoreTransferNoteDetail[];

  @OneToMany(() => StockMovement, (movement) => movement.item)
  stockMovements: StockMovement[];
}
