import { Link } from 'react-router-dom';
import styles from './SobrePage.module.css';

export default function SobrePage() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.backdrop} />
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          Edital Notify
        </Link>
        <nav className={styles.nav}>
          <Link to="/" className={styles.linkBtn}>
            Inicio
          </Link>
          <Link to="/login" className={styles.linkBtn}>
            Login
          </Link>
          <Link to="/login?cadastro" className={styles.cadastroBtn}>
            Cadastre-se
          </Link>
        </nav>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Sobre</p>
          <h1>Uma plataforma para acompanhar editais sem busca manual.</h1>
          <p>
            O Edital Notify centraliza oportunidades de diferentes orgaos em uma unica
            experiencia de consulta, com foco em times academicos, pesquisa e inovacao.
          </p>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2>Coleta automatizada</h2>
            <p>Rastreamento periodico em fontes como CNPq, FINEP e FUNCAP.</p>
          </article>
          <article className={styles.card}>
            <h2>Consulta focada</h2>
            <p>Busca por termo, fonte e status para triagem rapida de oportunidades.</p>
          </article>
          <article className={styles.card}>
            <h2>Painel operacional</h2>
            <p>Visualizacao consolidada e acesso direto aos documentos oficiais.</p>
          </article>
        </section>
      </main>
    </div>
  );
}
