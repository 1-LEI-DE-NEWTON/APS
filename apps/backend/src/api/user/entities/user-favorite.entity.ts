import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Edital } from '../../editais/entities/edital.entity';

@Entity('user_favorites')
@Unique(['userId', 'editalId'])
export class UserFavorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'edital_id' })
  editalId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Edital)
  @JoinColumn({ name: 'edital_id' })
  edital: Edital;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
