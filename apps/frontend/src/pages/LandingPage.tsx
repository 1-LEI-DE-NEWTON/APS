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
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          Editais
        </Link>
        <nav className={styles.nav}>
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
          <h1 className={styles.heroTitle}>
            Visualize editais em um só lugar
          </h1>
          <p className={styles.heroSubtitle}>
            Informações obtidas a partir do sistema de scraping de editais.
            Acesse com sua conta para consultar e acompanhar os dados
            atualizados.
          </p>
          <div className={styles.cta}>
            <Link to="/login" className={styles.ctaPrimary}>
              Entrar
            </Link>
            <Link to="/login?cadastro" className={styles.ctaSecondary}>
              Criar conta
            </Link>
          </div>
        </section>

        <section className={styles.about}>
          <h2 className={styles.aboutTitle}>Sobre o sistema</h2>
          <p className={styles.aboutText}>
            Esta interface consolida e exibe os editais coletados automaticamente
            por um sistema de scraping. Os dados são processados e disponibilizados
            aqui para consulta e análise.
          </p>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>Edital Notify</p>
      </footer>
    </div>
  );
}
