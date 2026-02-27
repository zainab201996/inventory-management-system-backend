import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Item } from './Item';

@Entity('rates')
@Unique(['item_id', 'effective_date'])
@Index(['item_id', 'effective_date'])
export class Rate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'item_id' })
  item_id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  rate: number;

  @Column({ name: 'effective_date', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  effective_date: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Item, (item) => item.rates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: Item;
}
