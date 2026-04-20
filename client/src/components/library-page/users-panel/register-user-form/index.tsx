import { useState } from 'react';
import { registerUser } from '../../../../api/users';
import { useStyle } from './style';

interface RegisterUserFormProps {
  onSuccess: () => void;
}

interface Status {
  text: string;
  ok: boolean;
}

export function RegisterUserForm({ onSuccess }: RegisterUserFormProps) {
  const styles = useStyle();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setStatus(null);
    if (!username.trim() || !password) {
      setStatus({ text: '✗ Username and password are required', ok: false });
      return;
    }
    setLoading(true);
    try {
      await registerUser(username.trim(), password);
      setStatus({ text: '✓ User registered', ok: true });
      setUsername('');
      setPassword('');
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setStatus({ text: `✗ ${msg}`, ok: false });
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') void handleSubmit();
  }

  return (
    <div className={styles.root}>
      <div className={styles.title}>Register User</div>
      <div className={styles.row}>
        <input
          type="text"
          className={styles.input}
          placeholder="Username"
          autoComplete="off"
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <input
          type="password"
          className={styles.input}
          placeholder="Password"
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className={styles.btn}
          onClick={() => void handleSubmit()}
          disabled={loading}
        >
          {loading ? 'Registering…' : 'Register'}
        </button>
      </div>
      {status && (
        <div className={status.ok ? styles.statusOk : styles.statusErr}>
          {status.text}
        </div>
      )}
    </div>
  );
}
