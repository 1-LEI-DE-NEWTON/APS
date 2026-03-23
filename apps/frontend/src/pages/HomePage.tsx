import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getEditais, getLatestCollectionStatus, triggerCollection, type CollectionStatus, type Edital } from '../lib/api';
import styles from './HomePage.module.css';

export default function HomePage() {
  const { user, logout } = useAuth();
  const [items, setItems] = useState<Edital[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [orgao, setOrgao] = useState('');
  const [status, setStatus] = useState<'abertos' | 'encerrados'>('abertos');
  const [latestCollection, setLatestCollection] = useState<CollectionStatus | null>(null);
  const visibleSources = new Set(items.map((item) => item.orgao)).size;

  const truncateDescription = (text: string, maxLength = 180) => {
    if (text.length <= maxLength) {
      return text;
    }
    return `${text.slice(0, maxLength).trimEnd()}...`;
  };

  const handleLogout = async () => {
    await logout();
    window.location.replace('/');
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, latest] = await Promise.all([
        getEditais({
          q: query.trim() || undefined,
          orgao: orgao || undefined,
          status,
          limit: 100,
        }),
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
        <div>
          <p className={styles.headerLabel}>Painel operacional</p>
          <h1>Edital Notify</h1>
        </div>
        <div className={styles.userRow}>
          <span className={styles.username}>{user?.username}</span>
          <button type="button" onClick={handleLogout} className={styles.logoutBtn}>
            Sair
          </button>
        </div>
      </header>
      <main className={styles.main}>
        <section className={styles.heroPanel}>
          <div>
            <p className={styles.heroEyebrow}>Radar consolidado de oportunidades</p>
            <p className={styles.welcome}>
              Olá, <strong>{user?.username}</strong>. Aqui você acompanha o fluxo
              de editais em uma visão única.
            </p>
            <p className={styles.hint}>{collectionSummary}</p>
          </div>
          <div className={styles.heroBadge}>
            <strong>{items.length}</strong>
            <span>editais no recorte atual</span>
          </div>
        </section>

        <section className={styles.metricsGrid}>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Volume exibido</span>
            <strong>{items.length}</strong>
            <p>Itens filtrados na consulta atual.</p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Fontes ativas</span>
            <strong>{visibleSources}</strong>
            <p>Orgaos presentes no resultado visivel.</p>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Ultima coleta</span>
            <strong>{latestCollection?.status ?? 'sem historico'}</strong>
            <p>
              Inseridos: {latestCollection?.inserted_count ?? 0} | Novos avisos: {latestCollection?.notified_new_count ?? 0}
            </p>
          </article>
        </section>

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
              value={orgao}
              onChange={(event) => setOrgao(event.target.value)}
              className={styles.select}
            >
              <option value="">Todas as fontes</option>
              <option value="CNPq">CNPq</option>
              <option value="FINEP">FINEP</option>
              <option value="FUNCAP">FUNCAP</option>
            </select>
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
                <a
                  key={edital.id}
                  href={edital.url}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.card}
                >
                  <div className={styles.cardHeader}>
                    <div>
                      <span className={styles.cardSource}>{edital.orgao}</span>
                      <h2>{edital.titulo}</h2>
                    </div>
                    <span className={styles.cardTag}>{edital.data_fim ? 'Prazo definido' : 'Sem prazo informado'}</span>
                  </div>
                  <p>{truncateDescription(edital.descricao)}</p>
                  <p className={styles.meta}>
                    Início: {edital.data_inicio ?? 'não informado'} | Fim: {edital.data_fim ?? 'não informado'}
                  </p>
                  <div className={styles.cardFooter}>
                    <span className={styles.cardAction}>Abrir documento</span>
                    <span className={styles.cardLinkHint}>Documento oficial</span>
                  </div>
                </a>
              ))
            )}
          </section>
        )}
      </main>
    </div>
  );
}
