import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/app', { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <span className={styles.logo}>Editais</span>
        </div>
        <main className={styles.main}>
          <p className={styles.heroSubtitle}>Carregando...</p>
        </main>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.backdrop} />
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          Edital Notify
        </Link>
        <nav className={styles.nav}>
          <Link to="/sobre" className={styles.aboutBtn}>
            Sobre
          </Link>
          <Link to="/login" className={styles.loginBtn}>
            Login
          </Link>
          <Link to="/login?cadastro" className={styles.cadastroBtn}>
            Cadastre-se
          </Link>
        </nav>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.heroEyebrow}>Monitoramento universitario de oportunidades</span>
            <h1 className={styles.heroTitle}>
              Descubra chamadas e editais sem depender de busca manual.
            </h1>
            <p className={styles.heroSubtitle}>
              O Edital Notify consolida fontes como CNPq, FINEP, FUNCAP e outras
              em uma experiencia unica de acompanhamento para pesquisa,
              extensao e inovacao.
            </p>
            <div className={styles.cta}>
              <Link to="/login" className={styles.ctaPrimary}>
                Entrar na plataforma
              </Link>
              <Link to="/login?cadastro" className={styles.ctaSecondary}>
                Criar acesso
              </Link>
            </div>
            <div className={styles.statRow}>
              <div className={styles.statCard}>
                <strong>Fontes monitoradas</strong>
                <span>CNPq, FINEP, FUNCAP e RNP</span>
              </div>
              <div className={styles.statCard}>
                <strong>Fluxo centralizado</strong>
                <span>Consulta web + coleta automatica</span>
              </div>
            </div>
          </div>

          <div className={styles.heroPanel}>
            <div className={styles.heroPanelTop}>
              <span className={styles.panelLabel}>Radar de editais</span>
              <span className={styles.panelPill}>Atualizacao continua</span>
            </div>
            <div className={styles.signalGrid}>
              <article className={styles.signalCard}>
                <span className={styles.signalSource}>FUNCAP</span>
                <h2>MULHERES EMPREENDEDORAS</h2>
                <p>Chamada em destaque com acesso direto ao documento oficial.</p>
              </article>
              <article className={styles.signalCard}>
                <span className={styles.signalSource}>CNPq</span>
                <h2>Chamadas abertas reunidas em um painel unico.</h2>
                <p>Menos tempo navegando em portais, mais tempo avaliando oportunidades.</p>
              </article>
            </div>
            <div className={styles.timeline}>
              <div>
                <strong>Coleta</strong>
                <span>Rastreamento automatizado das fontes</span>
              </div>
              <div>
                <strong>Curadoria</strong>
                <span>Links consolidados e prontos para consulta</span>
              </div>
              <div>
                <strong>Acompanhamento</strong>
                <span>Interface web para busca e filtragem</span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.aboutGrid}>
          <article className={styles.about}>
            <h2 className={styles.aboutTitle}>Leitura rapida do cenario</h2>
            <p className={styles.aboutText}>
              A plataforma organiza editais em um front unico, reduz ruído de
              busca e facilita a triagem inicial por fonte e situacao.
            </p>
          </article>
          <article className={styles.about}>
            <h2 className={styles.aboutTitle}>Arquitetura de apoio</h2>
            <p className={styles.aboutText}>
              O backend web orquestra autenticacao e consulta, enquanto o motor
              de scraping em Python alimenta a base consolidada do sistema.
            </p>
          </article>
          <article className={styles.about}>
            <h2 className={styles.aboutTitle}>Uso academico imediato</h2>
            <p className={styles.aboutText}>
              O foco e transformar paginas dispersas em um painel util para
              laboratorios, pesquisadores e equipes universitarias.
            </p>
          </article>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>Edital Notify</p>
      </footer>
    </div>
  );
}
