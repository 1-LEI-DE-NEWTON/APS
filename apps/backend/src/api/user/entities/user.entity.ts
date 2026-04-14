import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserInterest } from './user-interest.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'password_salt', length: 64 })
  passwordSalt: string;

  @Column({
    name: 'profile_keywords',
    type: 'text',
    array: true,
    default: () => 'ARRAY[]::text[]',
  })
  profileKeywords: string[];

  @Column({ name: 'is_drop', default: false })
  isDrop: boolean;

  @OneToMany(() => UserInterest, (interest) => interest.user)
  interests: UserInterest[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
