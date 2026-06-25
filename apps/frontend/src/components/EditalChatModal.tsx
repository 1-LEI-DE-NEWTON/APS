import { useEffect, useRef, useState, type FormEvent } from 'react';
import { chatWithEdital, type ChatTurn, type Edital } from '../lib/api';
import styles from './EditalChatModal.module.css';

type EditalChatModalProps = {
  edital: Edital;
  onClose: () => void;
};

const SUGGESTIONS = [
  'Quem pode se inscrever neste edital?',
  'Qual é o prazo final?',
  'Resuma os principais requisitos.',
];

export default function EditalChatModal({ edital, onClose }: EditalChatModalProps) {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ provider: string; model: string } | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const history = messages;
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await chatWithEdital(edital.id, trimmed, history);
      setMeta({ provider: response.provider, model: response.model });
      setMessages((prev) => [...prev, { role: 'assistant', content: response.reply }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao consultar o assistente';
      setError(message);
      setMessages((prev) => prev.slice(0, -1));
      setInput(trimmed);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send(input);
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Assistente de IA do edital"
      >
        <header className={styles.header}>
          <div className={styles.headerInfo}>
            <span className={styles.eyebrow}>Assistente IA · pergunte sobre este edital</span>
            <h3>{edital.titulo}</h3>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>

        <div className={styles.thread} ref={threadRef}>
          {messages.length === 0 ? (
            <div className={styles.empty}>
              <p>
                Tire dúvidas sobre <strong>{edital.orgao}</strong> com base no conteúdo do edital.
                O assistente responde apenas com o que está no documento.
              </p>
              <div className={styles.suggestions}>
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className={styles.suggestion}
                    onClick={() => void send(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`${styles.bubble} ${
                  message.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant
                }`}
              >
                {message.content}
              </div>
            ))
          )}
          {loading ? <div className={`${styles.bubble} ${styles.bubbleAssistant}`}>Pensando…</div> : null}
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}

        <form className={styles.inputRow} onSubmit={handleSubmit}>
          <input
            type="text"
            className={styles.input}
            value={input}
            placeholder="Digite sua pergunta sobre o edital..."
            onChange={(event) => setInput(event.target.value)}
            disabled={loading}
            autoFocus
          />
          <button type="submit" className={styles.sendBtn} disabled={loading || !input.trim()}>
            Enviar
          </button>
        </form>

        <p className={styles.footerNote}>
          {meta
            ? `Respostas geradas por ${meta.provider} · ${meta.model}`
            : 'Modelo de IA local (configurável no .env do backend)'}
        </p>
      </div>
    </div>
  );
}
