import type { ApplicationStatus, Edital } from '../lib/api';
import styles from '../pages/HomePage.module.css';

export const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'interesse', label: 'Tenho interesse' },
  { value: 'inscrever', label: 'Vou me inscrever' },
  { value: 'inscrito', label: 'Inscrito' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'descartado', label: 'Descartado' },
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = STATUS_OPTIONS.reduce(
  (acc, opt) => ({ ...acc, [opt.value]: opt.label }),
  {} as Record<ApplicationStatus, string>
);

const REMINDER_OPTIONS = [3, 7, 15, 30];

type EditalCardProps = {
  edital: Edital;
  busy?: boolean;
  onToggleFavorite: (id: number) => void;
  onChangeStatus: (id: number, status: ApplicationStatus | null) => void;
  onChangeReminder: (id: number, daysBefore: number | null) => void;
  onOpenChat: (edital: Edital) => void;
};

const truncate = (text: string, maxLength = 180) =>
  text.length <= maxLength ? text : `${text.slice(0, maxLength).trimEnd()}...`;

function ReminderBadge({ edital }: { edital: Edital }) {
  const reminder = edital.reminder;
  if (!reminder) return null;

  if (reminder.isOverdue) {
    return <span className={`${styles.reminderBadge} ${styles.reminderOverdue}`}>Prazo encerrado</span>;
  }
  if (reminder.isApproaching) {
    const dias = reminder.daysLeft ?? 0;
    return (
      <span className={`${styles.reminderBadge} ${styles.reminderApproaching}`}>
        ⏰ {dias === 0 ? 'Encerra hoje!' : `Faltam ${dias} dia${dias === 1 ? '' : 's'}`}
      </span>
    );
  }
  return (
    <span className={styles.reminderBadge}>🔔 Lembrete {reminder.daysBefore}d antes</span>
  );
}

export default function EditalCard({
  edital,
  busy = false,
  onToggleFavorite,
  onChangeStatus,
  onChangeReminder,
  onOpenChat,
}: EditalCardProps) {
  const hasDeadline = Boolean(edital.data_fim);

  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardMainInfo}>
          <span className={styles.cardSource}>{edital.orgao}</span>
          <h2>{edital.titulo}</h2>
          <div className={styles.cardBadges}>
            <span className={styles.cardTag}>
              {edital.data_fim ? 'Prazo definido' : 'Sem prazo informado'}
            </span>
            {edital.applicationStatus ? (
              <span className={`${styles.statusBadge} ${styles[`status_${edital.applicationStatus}`]}`}>
                {STATUS_LABELS[edital.applicationStatus]}
              </span>
            ) : null}
            <ReminderBadge edital={edital} />
          </div>
        </div>
        <div className={styles.cardTagGroup}>
          <button
            type="button"
            onClick={() => onToggleFavorite(edital.id)}
            className={`${styles.favoriteBtn} ${edital.isFavorite ? styles.favoriteActive : ''}`}
            title={edital.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            disabled={busy}
          >
            {edital.isFavorite ? '★' : '☆'}
          </button>
          {typeof edital.relevance_score === 'number' ? (
            <span className={styles.scoreTag}>{edital.relevance_score}% relevante</span>
          ) : null}
        </div>
      </div>

      {edital.resumo_ia ? (
        <>
          <p className={styles.aiSummary}>{truncate(edital.resumo_ia, 220)}</p>
          <span className={styles.aiBadge}>Resumo gerado por IA</span>
        </>
      ) : (
        <p>{truncate(edital.descricao)}</p>
      )}

      {edital.tags_ia && edital.tags_ia.length > 0 ? (
        <div className={styles.tagsRow}>
          {edital.tags_ia.map((tag) => (
            <span key={`${edital.id}-${tag}`} className={styles.aiTag}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <p className={styles.meta}>
        Início: {edital.data_inicio ?? 'não informado'} | Fim: {edital.data_fim ?? 'não informado'}
      </p>

      <div className={styles.actionsBar}>
        <label className={styles.controlField}>
          <span>Candidatura</span>
          <select
            className={styles.controlSelect}
            value={edital.applicationStatus ?? ''}
            disabled={busy}
            onChange={(event) =>
              onChangeStatus(
                edital.id,
                event.target.value ? (event.target.value as ApplicationStatus) : null
              )
            }
          >
            <option value="">— Não acompanhar —</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.controlField}>
          <span>Lembrete de prazo</span>
          <select
            className={styles.controlSelect}
            value={edital.reminder?.daysBefore ?? ''}
            disabled={busy || !hasDeadline}
            title={hasDeadline ? undefined : 'Edital sem prazo definido'}
            onChange={(event) =>
              onChangeReminder(edital.id, event.target.value ? Number(event.target.value) : null)
            }
          >
            <option value="">{hasDeadline ? 'Desativado' : 'Sem prazo'}</option>
            {REMINDER_OPTIONS.map((days) => (
              <option key={days} value={days}>
                {days} dias antes
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.cardFooter}>
        <button
          type="button"
          className={styles.assistantBtn}
          onClick={() => onOpenChat(edital)}
        >
          💬 Assistente IA
        </button>
        <a className={styles.cardAction} href={edital.url} target="_blank" rel="noreferrer">
          Abrir documento
        </a>
      </div>
    </article>
  );
}
