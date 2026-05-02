import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Page } from '../../component/page';
import { Button } from '../../control/button';
import { path } from '../../router';

import { useStyle } from './style';

export const LoginPage = () => {
  const styles = useStyle();
  const navigate = useNavigate();
  const location = useLocation();

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
    console.log({ username, password });
    try {
      setLoading(true);
      setError(undefined);
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username, password }),
      });
      if (response.ok) {
        navigate(location?.state?.from?.pathname ?? path.library());
      } else {
        setError('Invalid credentials');
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }, [username, password, location]);

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
          <Button
            loading={loading}
            type="primary"
            text={loading ? 'Signing in…' : 'Sign In'}
            onClick={handleLogin}
          />
        </div>
      </div>
    </Page>
  );
};
