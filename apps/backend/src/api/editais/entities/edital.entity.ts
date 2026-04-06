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

  @Column()
  titulo: string;

  @Column()
  orgao: string;

  @Column()
  descricao: string;

  @Column({ name: 'resumo_ia', nullable: true })
  resumoIa: string | null;

  @Column({ name: 'tags_ia', type: 'text', array: true, nullable: true })
  tagsIa: string[] | null;

  @Column({ unique: true })
  url: string;

  @Column({ name: 'data_inicio', type: 'date', nullable: true })
  dataInicio: string | null;

  @Column({ name: 'data_fim', type: 'date', nullable: true })
  dataFim: string | null;

  @Column({ name: 'notificado_novo', default: false })
  notificadoNovo: boolean;

  @Column({ name: 'notificado_prazo', default: false })
  notificadoPrazo: boolean;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}
