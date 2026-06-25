import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getEditais,
  getCandidaturas,
  getLatestCollectionStatus,
  getOpsHealth,
  getUserProfile,
  triggerCollection,
  updateUserProfile,
  toggleFavorite,
  setApplicationStatus,
  removeApplicationStatus,
  setReminder,
  removeReminder,
  type ApplicationStatus,
  type CollectionStatus,
  type Edital,
  type OpsHealthResponse,
} from '../lib/api';
import EditalCard, { STATUS_OPTIONS } from '../components/EditalCard';
import EditalChatModal from '../components/EditalChatModal';
import styles from './HomePage.module.css';

type Tab = 'editais' | 'candidaturas';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [items, setItems] = useState<Edital[]>([]);
  const [candidaturas, setCandidaturas] = useState<Edital[]>([]);
  const [tab, setTab] = useState<Tab>('editais');
  const [loading, setLoading] = useState(true);
  const [loadingCandidaturas, setLoadingCandidaturas] = useState(false);
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
  const [chatEdital, setChatEdital] = useState<Edital | null>(null);

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

  const loadCandidaturas = async () => {
    setLoadingCandidaturas(true);
    try {
      setCandidaturas(await getCandidaturas());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar candidaturas';
      setError(message);
    } finally {
      setLoadingCandidaturas(false);
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
    void loadCandidaturas();
  }, []);

  useEffect(() => {
    if (tab === 'candidaturas') {
      void loadCandidaturas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

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

  const patchEdital = (id: number, patch: Partial<Edital>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    setCandidaturas((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleToggleFavorite = async (id: number) => {
    try {
      const { isFavorite } = await toggleFavorite(id);
      patchEdital(id, { isFavorite });
      if (favoritesOnly && !isFavorite) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao favoritar');
    }
  };

  const handleChangeStatus = async (id: number, nextStatus: ApplicationStatus | null) => {
    setError(null);
    try {
      if (nextStatus === null) {
        await removeApplicationStatus(id);
      } else {
        await setApplicationStatus(id, nextStatus);
      }
      patchEdital(id, { applicationStatus: nextStatus });
      await loadCandidaturas();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar candidatura');
    }
  };

  const handleChangeReminder = async (id: number, daysBefore: number | null) => {
    setError(null);
    try {
      if (daysBefore === null) {
        await removeReminder(id);
        patchEdital(id, { reminder: null });
      } else {
        const info = await setReminder(id, daysBefore);
        patchEdital(id, { reminder: info });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao definir lembrete');
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

  const handleRemoveKeyword = async (keyword: string) => {
    setSavingProfile(true);
    setError(null);
    try {
      const nextKeywords = profileKeywords.filter((entry) => entry !== keyword);
      const response = await updateUserProfile(nextKeywords);
      setProfileKeywords(response.profileKeywords);
      setProfileInput(response.profileKeywords.join(', '));
      await loadItems();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover palavra-chave';
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

  const candidaturaGroups = useMemo(
    () =>
      STATUS_OPTIONS.map((opt) => ({
        ...opt,
        items: candidaturas.filter((item) => item.applicationStatus === opt.value),
      })).filter((group) => group.items.length > 0),
    [candidaturas]
  );

  const renderCard = (edital: Edital) => (
    <EditalCard
      key={edital.id}
      edital={edital}
      onToggleFavorite={handleToggleFavorite}
      onChangeStatus={handleChangeStatus}
      onChangeReminder={handleChangeReminder}
      onOpenChat={setChatEdital}
    />
  );

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
            <span className={styles.metricLabel}>Acompanhando</span>
            <strong>{candidaturas.length}</strong>
            <p>Editais no seu pipeline de candidaturas.</p>
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
                  <span>{tag}</span>
                  <button
                    type="button"
                    className={styles.tagRemoveBtn}
                    onClick={() => handleRemoveKeyword(tag)}
                    title={`Remover ${tag}`}
                    aria-label={`Remover ${tag}`}
                    disabled={savingProfile}
                  >
                    X
                  </button>
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

        <section className={styles.tabBar}>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === 'editais' ? styles.tabActive : ''}`}
            onClick={() => setTab('editais')}
          >
            Editais
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === 'candidaturas' ? styles.tabActive : ''}`}
            onClick={() => setTab('candidaturas')}
          >
            Minhas candidaturas{candidaturas.length > 0 ? ` (${candidaturas.length})` : ''}
          </button>
        </section>

        {tab === 'editais' ? (
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
        ) : null}

        {error ? <p className={styles.error}>{error}</p> : null}

        {tab === 'editais' ? (
          loading ? (
            <p className={styles.hint}>Carregando editais...</p>
          ) : (
            <section className={styles.list}>
              {items.length === 0 ? (
                <p className={styles.hint}>Nenhum edital encontrado.</p>
              ) : (
                items.map(renderCard)
              )}
            </section>
          )
        ) : loadingCandidaturas ? (
          <p className={styles.hint}>Carregando candidaturas...</p>
        ) : candidaturas.length === 0 ? (
          <p className={styles.hint}>
            Você ainda não acompanha nenhum edital. Na aba <strong>Editais</strong>, use o seletor
            "Candidatura" de um edital para começar a acompanhar.
          </p>
        ) : (
          <div className={styles.pipeline}>
            {candidaturaGroups.map((group) => (
              <div key={group.value} className={styles.pipelineGroup}>
                <h3 className={styles.pipelineTitle}>
                  {group.label} <span>({group.items.length})</span>
                </h3>
                <section className={styles.list}>{group.items.map(renderCard)}</section>
              </div>
            ))}
          </div>
        )}
      </main>

      {chatEdital ? (
        <EditalChatModal edital={chatEdital} onClose={() => setChatEdital(null)} />
      ) : null}
    </div>
  );
}
