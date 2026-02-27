import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Item } from './Item';
import { Store } from './Store';

@Entity('opening_stocks')
@Unique(['item_id', 'store_id'])
export class OpeningStock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'item_id' })
  item_id: number;

  @Column({ name: 'store_id' })
  store_id: number;

  @Column({ name: 'opening_qty', type: 'decimal', precision: 10, scale: 2 })
  opening_qty: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Item, (item) => item.openingStocks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: Item;

  @ManyToOne(() => Store, (store) => store.openingStocks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store;
}
