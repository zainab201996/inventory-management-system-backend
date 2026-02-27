import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { RoleDetail } from './RoleDetail';
import { UserDetail } from './UserDetail';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn({ name: 'role_id' })
  role_id: number;

  @Column({ name: 'role_name', type: 'varchar', length: 100, unique: true })
  role_name: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  // Relations
  @OneToMany(() => RoleDetail, (roleDetail) => roleDetail.role)
  roleDetails: RoleDetail[];

  @OneToMany(() => UserDetail, (userDetail) => userDetail.role)
  userDetails: UserDetail[];
}
