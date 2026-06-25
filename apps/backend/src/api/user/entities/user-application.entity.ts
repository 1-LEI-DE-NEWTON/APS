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

export const APPLICATION_STATUSES = [
  'interesse',
  'inscrever',
  'inscrito',
  'concluido',
  'descartado',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/**
 * Acompanhamento de candidatura: status pessoal do usuário em relação a um
 * edital (pipeline "Tenho interesse" -> "Vou me inscrever" -> "Inscrito" ...).
 */
@Entity('user_applications')
@Unique(['userId', 'editalId'])
export class UserApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'edital_id' })
  editalId: number;

  @Column({ type: 'varchar', length: 20 })
  status: ApplicationStatus;

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
