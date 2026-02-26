import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [searchParams] = useSearchParams();
  const cadastro = searchParams.get('cadastro') != null;
  const [isRegister, setIsRegister] = useState(cadastro);
  const { login, register, error, setError, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/app';

  useEffect(() => {
    setIsRegister(cadastro);
  }, [cadastro]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isRegister) {
        await register(username, password);
      } else {
        await login(username, password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao autenticar');
    }
  };

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>Carregando...</div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>
          {isRegister ? 'Criar conta' : 'Entrar'}
        </h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Usuário
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={styles.input}
              autoComplete="username"
              required
            />
          </label>
          <label className={styles.label}>
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
            />
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.button}>
            {isRegister ? 'Cadastrar' : 'Entrar'}
          </button>
        </form>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => {
            setIsRegister((v) => !v);
            setError(null);
          }}
        >
          {isRegister ? 'Já tenho conta' : 'Criar conta'}
        </button>
      </div>
    </div>
  );
}
