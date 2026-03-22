import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getEditais, getLatestCollectionStatus, triggerCollection, type CollectionStatus, type Edital } from '../lib/api';
import styles from './HomePage.module.css';

export default function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Edital[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'abertos' | 'encerrados'>('abertos');
  const [latestCollection, setLatestCollection] = useState<CollectionStatus | null>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, latest] = await Promise.all([
        getEditais({ q: query.trim() || undefined, status, limit: 100 }),
        getLatestCollectionStatus(),
      ]);
      setItems(list.items);
      setLatestCollection(latest);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadData();
  };

  const handleRunCollection = async () => {
    setLoadingCollection(true);
    setError(null);
    try {
      const latest = await triggerCollection();
      setLatestCollection(latest);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao executar coleta';
      setError(message);
    } finally {
      setLoadingCollection(false);
    }
  };

  const collectionSummary = useMemo(() => {
    if (!latestCollection) return 'Nenhuma coleta registrada ainda.';
    const finished = latestCollection.finished_at ?? 'em execução';
    return `Última coleta #${latestCollection.id} - ${latestCollection.status} - finalizada: ${finished}`;
  }, [latestCollection]);

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1>Edital Notify</h1>
        <div className={styles.userRow}>
          <span className={styles.username}>{user?.username}</span>
          <button type="button" onClick={handleLogout} className={styles.logoutBtn}>
            Sair
          </button>
        </div>
      </header>
      <main className={styles.main}>
        <p className={styles.welcome}>
          Olá, <strong>{user?.username}</strong>. Aqui você acompanha os editais.
        </p>
        <p className={styles.hint}>{collectionSummary}</p>

        <section className={styles.actions}>
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <input
              type="text"
              placeholder="Buscar por título ou descrição"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={styles.input}
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as 'abertos' | 'encerrados')}
              className={styles.select}
            >
              <option value="abertos">Abertos</option>
              <option value="encerrados">Encerrados</option>
            </select>
            <button type="submit" className={styles.primaryBtn}>
              Filtrar
            </button>
          </form>
          <button
            type="button"
            onClick={handleRunCollection}
            className={styles.primaryBtn}
            disabled={loadingCollection}
          >
            {loadingCollection ? 'Coletando...' : 'Atualizar Agora'}
          </button>
        </section>

        {error ? <p className={styles.error}>{error}</p> : null}

        {loading ? (
          <p className={styles.hint}>Carregando editais...</p>
        ) : (
          <section className={styles.list}>
            {items.length === 0 ? (
              <p className={styles.hint}>Nenhum edital encontrado.</p>
            ) : (
              items.map((edital) => (
                <article key={edital.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2>{edital.titulo}</h2>
                    <span>{edital.orgao}</span>
                  </div>
                  <p>{edital.descricao}</p>
                  <p className={styles.meta}>
                    Início: {edital.data_inicio ?? 'não informado'} | Fim: {edital.data_fim ?? 'não informado'}
                  </p>
                  <a href={edital.url} target="_blank" rel="noreferrer">
                    Abrir edital
                  </a>
                </article>
              ))
            )}
          </section>
        )}
      </main>
    </div>
  );
}
