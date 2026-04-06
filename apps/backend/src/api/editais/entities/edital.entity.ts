import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('editais')
export class Edital {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', nullable: true })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  orgao: string;

  @Column({ type: 'text', nullable: true })
  descricao: string;

  @Column({ name: 'resumo_ia', type: 'text', nullable: true })
  resumoIa: string | null;

  @Column({ name: 'tags_ia', type: 'text', array: true, nullable: true })
  tagsIa: string[] | null;

  @Column({ type: 'text', unique: true, nullable: true })
  url: string;

  @Column({ name: 'data_inicio', type: 'date', nullable: true })
  dataInicio: string | null;

  @Column({ name: 'data_fim', type: 'date', nullable: true })
  dataFim: string | null;

  @Column({ name: 'notificado_novo', type: 'boolean', default: false, nullable: true })
  notificadoNovo: boolean;

  @Column({ name: 'notificado_prazo', type: 'boolean', default: false, nullable: true })
  notificadoPrazo: boolean;

  @CreateDateColumn({ name: 'criado_em', type: 'timestamp without time zone', default: () => 'CURRENT_TIMESTAMP' })
  criadoEm: Date;
}
