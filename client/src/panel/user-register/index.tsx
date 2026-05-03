import { useCallback, useState } from 'react';

import { Button } from '../../control/button';
import { useRegisterUser } from '../../provider/user';

import { useStyle } from './style';

export const UserRegisterPanel = () => {
  const styles = useStyle();

  const [registerUser, loading, okay, error, errorMessage] = useRegisterUser();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const handleRegisterUser = useCallback(() => {
    registerUser(username, password);
  }, [username, password]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleRegisterUser();
    }
  }, []);

  return (
    <div className={styles.root}>
      <div className={styles.title}>Register new User</div>
      <div className={styles.row}>
        <input
          type="text"
          className={styles.input}
          placeholder="Username"
          autoComplete="off"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <input
          type="password"
          className={styles.input}
          placeholder="Password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button
          type="primary"
          loading={loading}
          text={loading ? 'Registering…' : 'Register'}
          onClick={handleRegisterUser}
        />
      </div>
      {(okay || error) && (
        <div className={okay ? styles.statusOk : styles.statusErr}>
          {error ? `✗ ${errorMessage}` : '✓ User registered'}
        </div>
      )}
    </div>
  );
};
