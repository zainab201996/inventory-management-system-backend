import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { RoleDetail } from './RoleDetail';

@Entity('pages')
export class Page {
  @PrimaryGeneratedColumn({ name: 'page_id' })
  page_id: number;

  @Column({ name: 'page_name', type: 'varchar', length: 100, unique: true })
  page_name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  @Column({ name: 'is_report', type: 'boolean', default: false })
  is_report: boolean;

  @Column({ name: 'is_action', type: 'boolean', default: false })
  is_action: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  // Relations
  @OneToMany(() => RoleDetail, (roleDetail) => roleDetail.page)
  roleDetails: RoleDetail[];
}
