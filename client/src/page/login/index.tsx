import { useCallback, useContext, useState } from 'react';

import { Page } from '../../component/page';
import { Button } from '../../control/button';
import { Context as AuthContext } from '../../provider/auth/context';

import { useStyle } from './style';

export const LoginPage = () => {
  const styles = useStyle();
  const { refetch } = useContext(AuthContext);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>();

  const [username, setUsername] = useState<string>('');
  const handleUsernameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(event.target.value);
  }, []);

  const [password, setPassword] = useState<string>('');
  const handlePasswordChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  }, []);

  const handleLogin = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username, password }),
      });
      if (response.ok) {
        await refetch();
      } else {
        setError('Invalid credentials');
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }, [username, password, refetch]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter') {
        event.stopPropagation();
        handleLogin();
      }
    },
    [handleLogin]
  );

  return (
    <Page type="minimal">
      <div className={styles.root}>
        <div className={styles.form}>
          <h1 className={styles.title}>HASS-ODPS</h1>
          {error && <p className={styles.error}>{error}</p>}
          <label className={styles.label} htmlFor="username">
            Username
          </label>
          <input
            className={styles.input}
            name="username"
            type="text"
            value={username}
            required
            autoFocus
            autoComplete="username"
            onChange={handleUsernameChange}
            onKeyDown={handleKeyDown}
          />
          <label className={styles.label} htmlFor="password">
            Password
          </label>
          <input
            className={styles.input}
            name="password"
            type="password"
            value={password}
            required
            autoComplete="current-password"
            onChange={handlePasswordChange}
            onKeyDown={handleKeyDown}
          />
          <div className={styles.login}>
            <Button
              loading={loading}
              type="primary"
              text={loading ? 'Signing in…' : 'Sign In'}
              onClick={handleLogin}
            />
          </div>
        </div>
      </div>
    </Page>
  );
};
