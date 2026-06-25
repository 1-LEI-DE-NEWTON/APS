import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Edital as EditalEntity } from '../../editais/entities/edital.entity';
import {
  ApplicationStatus,
  UserApplication,
} from '../../user/entities/user-application.entity';
import { UserReminder } from '../../user/entities/user-reminder.entity';

export type ReminderInfo = {
  daysBefore: number;
  dueDate: string | null;
  daysLeft: number | null;
  isApproaching: boolean;
  isOverdue: boolean;
};

export type TrackedEdital = {
  id: number;
  titulo: string;
  orgao: string;
  descricao: string;
  resumo_ia: string | null;
  tags_ia: string[] | null;
  url: string;
  data_inicio: string | null;
  data_fim: string | null;
  criado_em: string;
  applicationStatus: ApplicationStatus;
  reminder: ReminderInfo | null;
  updatedAt: string;
};

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(UserApplication)
    private readonly applicationRepository: Repository<UserApplication>,
    @InjectRepository(UserReminder)
    private readonly reminderRepository: Repository<UserReminder>,
    @InjectRepository(EditalEntity)
    private readonly editalRepository: Repository<EditalEntity>,
  ) {}

  // ----- Candidaturas (status) -----

  async setStatus(
    userId: string,
    editalId: number,
    status: ApplicationStatus,
  ): Promise<{ status: ApplicationStatus }> {
    await this.ensureEditalExists(editalId);

    const existing = await this.applicationRepository.findOne({
      where: { userId, editalId },
    });

    if (existing) {
      existing.status = status;
      await this.applicationRepository.save(existing);
    } else {
      await this.applicationRepository.save({ userId, editalId, status });
    }

    return { status };
  }

  async removeStatus(userId: string, editalId: number): Promise<{ status: null }> {
    await this.applicationRepository.delete({ userId, editalId });
    return { status: null };
  }

  async listCandidaturas(userId: string): Promise<TrackedEdital[]> {
    const applications = await this.applicationRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
    if (applications.length === 0) {
      return [];
    }

    const editalIds = applications.map((app) => app.editalId);
    const [editais, reminderMap] = await Promise.all([
      this.editalRepository.findBy({ id: In(editalIds) }),
      this.getReminderMap(userId),
    ]);
    const editalMap = new Map(editais.map((edital) => [edital.id, edital]));

    const result: TrackedEdital[] = [];
    for (const app of applications) {
      const edital = editalMap.get(app.editalId);
      if (!edital) {
        continue;
      }
      const reminderDays = reminderMap.get(app.editalId);
      result.push({
        ...this.toApiShape(edital),
        applicationStatus: app.status,
        reminder:
          reminderDays !== undefined
            ? this.buildReminderInfo(reminderDays, edital.dataFim)
            : null,
        updatedAt: app.updatedAt.toISOString(),
      });
    }
    return result;
  }

  // ----- Lembretes de prazo -----

  async setReminder(
    userId: string,
    editalId: number,
    daysBefore: number,
  ): Promise<ReminderInfo> {
    const edital = await this.ensureEditalExists(editalId);

    const existing = await this.reminderRepository.findOne({
      where: { userId, editalId },
    });

    if (existing) {
      existing.daysBefore = daysBefore;
      await this.reminderRepository.save(existing);
    } else {
      await this.reminderRepository.save({ userId, editalId, daysBefore });
    }

    return this.buildReminderInfo(daysBefore, edital.dataFim);
  }

  async removeReminder(userId: string, editalId: number): Promise<{ reminder: null }> {
    await this.reminderRepository.delete({ userId, editalId });
    return { reminder: null };
  }

  // ----- Mapas usados para anotar a listagem de editais -----

  async getStatusMap(userId: string): Promise<Map<number, ApplicationStatus>> {
    const applications = await this.applicationRepository.find({
      where: { userId },
      select: ['editalId', 'status'],
    });
    return new Map(applications.map((app) => [app.editalId, app.status]));
  }

  async getReminderMap(userId: string): Promise<Map<number, number>> {
    const reminders = await this.reminderRepository.find({
      where: { userId },
      select: ['editalId', 'daysBefore'],
    });
    return new Map(reminders.map((reminder) => [reminder.editalId, reminder.daysBefore]));
  }

  buildReminderInfo(daysBefore: number, dataFim: string | null): ReminderInfo {
    const info: ReminderInfo = {
      daysBefore,
      dueDate: null,
      daysLeft: null,
      isApproaching: false,
      isOverdue: false,
    };

    if (!dataFim) {
      return info;
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    const end = new Date(`${dataFim}T00:00:00`);
    if (Number.isNaN(end.getTime())) {
      return info;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysLeft = Math.ceil((end.getTime() - today.getTime()) / msPerDay);
    const due = new Date(end.getTime() - daysBefore * msPerDay);

    info.daysLeft = daysLeft;
    info.isOverdue = daysLeft < 0;
    info.isApproaching = daysLeft >= 0 && daysLeft <= daysBefore;
    info.dueDate = due.toISOString().slice(0, 10);
    return info;
  }

  private async ensureEditalExists(editalId: number): Promise<EditalEntity> {
    const edital = await this.editalRepository.findOne({ where: { id: editalId } });
    if (!edital) {
      throw new NotFoundException('Edital não encontrado no banco');
    }
    return edital;
  }

  private toApiShape(edital: EditalEntity): Omit<
    TrackedEdital,
    'applicationStatus' | 'reminder' | 'updatedAt'
  > {
    return {
      id: edital.id,
      titulo: edital.titulo,
      orgao: edital.orgao,
      descricao: edital.descricao,
      resumo_ia: edital.resumoIa,
      tags_ia: edital.tagsIa,
      url: edital.url,
      data_inicio: edital.dataInicio,
      data_fim: edital.dataFim,
      criado_em:
        edital.criadoEm instanceof Date
          ? edital.criadoEm.toISOString()
          : String(edital.criadoEm),
    };
  }
}
