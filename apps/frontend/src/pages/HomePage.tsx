import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import styles from './HomePage.module.css';

export default function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

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
        <p className={styles.hint}>
          Os dados exibidos nesta área vêm do sistema de scraping de editais.
          A integração com o scraper será concluída em breve.
        </p>
      </main>
    </div>
  );
}
