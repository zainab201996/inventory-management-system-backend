import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StoreTransferNote } from './StoreTransferNote';
import { Item } from './Item';

@Entity('store_transfer_note_details')
export class StoreTransferNoteDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'store_transfer_note_id' })
  store_transfer_note_id: number;

  @Column({ name: 'item_id' })
  item_id: number;

  @Column({ name: 'item_code', type: 'varchar', length: 50 })
  item_code: string;

  @Column({ name: 'item_name', type: 'varchar', length: 200 })
  item_name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  qty: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ref: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  // Relations
  @ManyToOne(() => StoreTransferNote, (transferNote) => transferNote.details, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'store_transfer_note_id' })
  storeTransferNote: StoreTransferNote;

  @ManyToOne(() => Item, (item) => item.transferNoteDetails)
  @JoinColumn({ name: 'item_id' })
  item: Item;
}
