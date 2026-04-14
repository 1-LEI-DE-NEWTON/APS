import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getEditais,
  getLatestCollectionStatus,
  getOpsHealth,
  getUserProfile,
  triggerCollection,
  updateUserProfile,
  toggleFavorite,
  type CollectionStatus,
  type Edital,
  type OpsHealthResponse,
} from '../lib/api';
import styles from './HomePage.module.css';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [items, setItems] = useState<Edital[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [orgao, setOrgao] = useState('');
  const [status, setStatus] = useState<'abertos' | 'encerrados'>('abertos');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [latestCollection, setLatestCollection] = useState<CollectionStatus | null>(null);
  const [opsHealth, setOpsHealth] = useState<OpsHealthResponse | null>(null);
  const [profileKeywords, setProfileKeywords] = useState<string[]>([]);
  const [profileInput, setProfileInput] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
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

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getEditais({
        q: debouncedQuery || undefined,
        orgao: orgao || undefined,
        status,
        favoritesOnly,
        limit: 100,
      });
      setItems(list.items);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const loadMeta = async () => {
    try {
      const [latest, profile, health] = await Promise.all([
        getLatestCollectionStatus(),
        getUserProfile(),
        getOpsHealth().catch(() => null),
      ]);
      setLatestCollection(latest);
      setProfileKeywords(profile.profileKeywords);
      setProfileInput(profile.profileKeywords.join(', '));
      setOpsHealth(health);
    } catch {
      // erros de metadados nao devem bloquear listagem
    }
  };

  useEffect(() => {
    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, orgao, status, favoritesOnly]);

  useEffect(() => {
    void loadMeta();
  }, []);

  const handleRunCollection = async () => {
    setLoadingCollection(true);
    setError(null);
    try {
      const latest = await triggerCollection();
      setLatestCollection(latest);
      await Promise.all([loadItems(), loadMeta()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao executar coleta';
      setError(message);
    } finally {
      setLoadingCollection(false);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const { isFavorite } = await toggleFavorite(id);
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isFavorite } : item))
      );
      if (favoritesOnly && !isFavorite) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao favoritar';
      setError(message);
    }
  };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    setError(null);
    try {
      const keywords = profileInput
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      const response = await updateUserProfile(keywords);
      setProfileKeywords(response.profileKeywords);
      setProfileInput(response.profileKeywords.join(', '));
      await loadItems();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar perfil';
      setError(message);
    } finally {
      setSavingProfile(false);
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
          <button
            type="button"
            onClick={() => navigate('/app/settings')}
            className={styles.logoutBtn}
          >
            Configurações do usuário
          </button>
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
            <span className={styles.metricLabel}>Status operacional</span>
            <strong>{opsHealth?.scraper.status ?? 'indisponivel'}</strong>
            <p>
              Latência scraper: {opsHealth?.scraper.latencyMs ?? '--'} ms | Última coleta:{' '}
              {latestCollection?.status ?? 'sem historico'}
            </p>
          </article>
        </section>

        <section className={styles.profileSection}>
          <div className={styles.profileHeader}>
            <span className={styles.metricLabel}>Perfil de relevância</span>
            <p className={styles.hint}>
              Palavras-chave separadas por vírgula para priorizar os editais mais aderentes.
            </p>
          </div>
          <form onSubmit={handleSaveProfile} className={styles.profileForm}>
            <input
              type="text"
              value={profileInput}
              onChange={(event) => setProfileInput(event.target.value)}
              placeholder="Ex.: inovação, biotecnologia, bolsas, extensão"
              className={styles.input}
            />
            <button type="submit" className={styles.primaryBtn} disabled={savingProfile}>
              {savingProfile ? 'Salvando...' : 'Salvar perfil'}
            </button>
          </form>
          {profileKeywords.length > 0 ? (
            <div className={styles.tagsRow}>
              {profileKeywords.map((tag) => (
                <span key={`profile-${tag}`} className={styles.aiTag}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <section className={styles.collectionActions}>
          <button
            type="button"
            onClick={handleRunCollection}
            className={styles.primaryBtn}
            disabled={loadingCollection}
          >
            {loadingCollection ? 'Coletando...' : 'Atualizar Agora'}
          </button>
        </section>

        <section className={styles.actions}>
          <div className={styles.searchForm}>
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
            <label className={styles.checkboxContainer}>
              <input
                type="checkbox"
                checked={favoritesOnly}
                onChange={(e) => setFavoritesOnly(e.target.checked)}
              />
              Apenas favoritos
            </label>
          </div>
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
                    <div className={styles.cardTagGroup}>
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(e, edital.id)}
                        className={`${styles.favoriteBtn} ${edital.isFavorite ? styles.favoriteActive : ''}`}
                        title={edital.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                      >
                        {edital.isFavorite ? '★' : '☆'}
                      </button>
                      {typeof edital.relevance_score === 'number' ? (
                        <span className={styles.scoreTag}>{edital.relevance_score}% relevante</span>
                      ) : null}
                      <span className={styles.cardTag}>{edital.data_fim ? 'Prazo definido' : 'Sem prazo informado'}</span>
                    </div>
                  </div>
                  {edital.resumo_ia ? (
                    <>
                      <p className={styles.aiSummary}>{truncateDescription(edital.resumo_ia, 220)}</p>
                      <span className={styles.aiBadge}>Resumo gerado por IA</span>
                    </>
                  ) : (
                    <p>{truncateDescription(edital.descricao)}</p>
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
