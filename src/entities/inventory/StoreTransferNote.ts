import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Store } from './Store';
import { StoreTransferNoteDetail } from './StoreTransferNoteDetail';

@Entity('store_transfer_notes')
export class StoreTransferNote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'v_no', type: 'varchar', length: 50, unique: true })
  v_no: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  date: Date;

  @Column({ name: 'ref_no', type: 'varchar', length: 100, nullable: true })
  ref_no: string | null;

  @Column({ name: 'from_store_id' })
  from_store_id: number;

  @Column({ name: 'to_store_id' })
  to_store_id: number;

  @Column({ name: 'order_no', type: 'varchar', length: 100, nullable: true })
  order_no: string | null;

  @Column({ name: 'created_by', type: 'integer', nullable: true })
  created_by: number | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Store, (store) => store.transferNotesFrom)
  @JoinColumn({ name: 'from_store_id' })
  fromStore: Store;

  @ManyToOne(() => Store, (store) => store.transferNotesTo)
  @JoinColumn({ name: 'to_store_id' })
  toStore: Store;

  @OneToMany(() => StoreTransferNoteDetail, (detail) => detail.storeTransferNote, {
    cascade: true,
  })
  details: StoreTransferNoteDetail[];
}
