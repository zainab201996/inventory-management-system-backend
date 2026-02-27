import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Role } from './Role';
import { Page } from './Page';

@Entity('role_details')
@Unique(['role_id', 'page_id'])
export class RoleDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'role_id' })
  role_id: number;

  @Column({ name: 'page_id' })
  page_id: number;

  @Column({ type: 'boolean', default: false })
  show: boolean;

  @Column({ name: 'create', type: 'boolean', default: false })
  create: boolean;

  @Column({ type: 'boolean', default: false })
  edit: boolean;

  @Column({ name: 'delete', type: 'boolean', default: false })
  delete: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  // Relations
  @ManyToOne(() => Role, (role) => role.roleDetails, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Page, (page) => page.roleDetails, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'page_id' })
  page: Page;
}
