import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { OpeningStock } from './OpeningStock';
import { StoreTransferNote } from './StoreTransferNote';
import { StockMovement } from './StockMovement';

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'store_code', type: 'varchar', length: 50, unique: true })
  store_code: string;

  @Column({ name: 'store_name', type: 'varchar', length: 100 })
  store_name: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @Column({ name: 'updated_by', type: 'integer', nullable: true })
  updated_by: number | null;

  // Relations
  @OneToMany(() => OpeningStock, (openingStock) => openingStock.store)
  openingStocks: OpeningStock[];

  @OneToMany(() => StoreTransferNote, (transferNote) => transferNote.fromStore)
  transferNotesFrom: StoreTransferNote[];

  @OneToMany(() => StoreTransferNote, (transferNote) => transferNote.toStore)
  transferNotesTo: StoreTransferNote[];

  @OneToMany(() => StockMovement, (movement) => movement.store)
  stockMovements: StockMovement[];
}
