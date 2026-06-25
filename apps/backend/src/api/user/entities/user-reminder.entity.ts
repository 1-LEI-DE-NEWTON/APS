import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Edital } from '../../editais/entities/edital.entity';

/**
 * Lembrete de prazo: o usuário escolhe quantos dias antes do `data_fim` de um
 * edital quer ser alertado. O backend usa esse valor para destacar editais com
 * "prazo se aproximando" na listagem.
 */
@Entity('user_reminders')
@Unique(['userId', 'editalId'])
export class UserReminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'edital_id' })
  editalId: number;

  @Column({ name: 'days_before', type: 'int', default: 7 })
  daysBefore: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Edital)
  @JoinColumn({ name: 'edital_id' })
  edital: Edital;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
