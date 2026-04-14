import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { deactivateAccount, updateUserAccount } from '../lib/api';
import styles from './UserSettingsPage.module.css';

export default function UserSettingsPage() {
  const navigate = useNavigate();
  const { user, refreshUser, logout } = useAuth();

  const [usernameInput, setUsernameInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    setUsernameInput(user?.username ?? '');
  }, [user?.username]);

  const handleSaveUsername = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = usernameInput.trim();
    if (!normalized) {
      setError('Informe um username válido.');
      return;
    }
    if (normalized === user?.username) {
      setSuccess('O username já está atualizado.');
      setError(null);
      return;
    }

    setSavingUsername(true);
    setError(null);
    setSuccess(null);
    try {
      await updateUserAccount({ username: normalized });
      await refreshUser();
      setSuccess('Username atualizado com sucesso.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar username';
      setError(message);
    } finally {
      setSavingUsername(false);
    }
  };

  const handleSavePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newPassword) {
      setError('Informe a nova senha.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('A confirmação da senha não confere.');
      return;
    }

    setSavingPassword(true);
    setError(null);
    setSuccess(null);
    try {
      await updateUserAccount({ password: newPassword });
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Senha atualizada com sucesso.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar senha';
      setError(message);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeactivate = async () => {
    const confirmed = window.confirm(
      'Tem certeza que deseja desativar sua conta? Esta ação é irreversível e você será desconectado.'
    );
    if (!confirmed) return;

    setDeactivating(true);
    setError(null);
    setSuccess(null);
    try {
      await deactivateAccount();
      await logout();
      window.location.replace('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao desativar conta';
      setError(message);
      setDeactivating(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.topRow}>
          <h1>Configurações do usuário</h1>
          <button type="button" onClick={() => navigate('/app')} className={styles.backBtn}>
            Voltar ao painel
          </button>
        </div>

        <section className={styles.card}>
          <h2>Username</h2>
          <p>Atualize o nome de usuário utilizado no login.</p>
          <form onSubmit={handleSaveUsername} className={styles.form}>
            <input
              type="text"
              value={usernameInput}
              onChange={(event) => setUsernameInput(event.target.value)}
              className={styles.input}
              minLength={3}
              maxLength={50}
              pattern="[a-zA-Z0-9_]+"
              required
            />
            <button type="submit" className={styles.primaryBtn} disabled={savingUsername}>
              {savingUsername ? 'Salvando...' : 'Salvar username'}
            </button>
          </form>
        </section>

        <section className={styles.card}>
          <h2>Senha</h2>
          <p>Defina uma nova senha para a sua conta.</p>
          <form onSubmit={handleSavePassword} className={styles.form}>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Nova senha"
              className={styles.input}
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              required
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirmar nova senha"
              className={styles.input}
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              required
            />
            <button type="submit" className={styles.primaryBtn} disabled={savingPassword}>
              {savingPassword ? 'Atualizando...' : 'Atualizar senha'}
            </button>
          </form>
        </section>

        <section className={`${styles.card} ${styles.dangerCard}`}>
          <h2>Desativar conta</h2>
          <p>
            Esta ação bloqueia o acesso da conta. Depois da desativação, você será desconectado
            imediatamente.
          </p>
          <button
            type="button"
            onClick={handleDeactivate}
            className={styles.dangerBtn}
            disabled={deactivating}
          >
            {deactivating ? 'Desativando...' : 'Desativar conta'}
          </button>
        </section>

        {error ? <p className={styles.error}>{error}</p> : null}
        {success ? <p className={styles.success}>{success}</p> : null}
      </div>
    </div>
  );
}
