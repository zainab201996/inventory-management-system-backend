import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './User';
import { Role } from './Role';

@Entity('user_details')
@Unique(['user_id', 'role_id'])
export class UserDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  user_id: number;

  @Column({ name: 'role_id' })
  role_id: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.userDetails, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Role, (role) => role.userDetails, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id' })
  role: Role;
}
