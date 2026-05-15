import { useCallback, useState } from 'react';

import { Card } from '~/component';
import { Button, TextInput } from '~/control';
import { useRegisterUser } from '~/provider/user';

import { useStyle } from './style';

export const UserRegister = () => {
  const styles = useStyle();

  const [registerUser, loading, okay, error, errorMessage] = useRegisterUser();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const handleRegisterUser = useCallback(() => {
    registerUser(username, password);
  }, [registerUser, username, password]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        handleRegisterUser();
      }
    },
    [handleRegisterUser]
  );

  const handleUsernameChange = useCallback(
    (newValue: string | undefined) => {
      setUsername(newValue ?? '');
    },
    [setUsername]
  );

  const handlePasswordChange = useCallback(
    (newValue: string | undefined) => {
      setPassword(newValue ?? '');
    },
    [setPassword]
  );

  return (
    <Card title="Register new User">
      <div className={styles.inputContainer}>
        <TextInput
          name="username"
          value={username}
          onChange={handleUsernameChange}
          layout="horizontal"
          label="Username"
          autoComplete="off"
        />
        <TextInput
          name="password"
          password
          value={password}
          onChange={handlePasswordChange}
          layout="horizontal"
          label="Password"
          autoComplete="off"
        />
      </div>
      <Button type="primary" loading={loading} onClick={handleRegisterUser}>
        {loading ? 'Registering…' : 'Register'}
      </Button>
      {(okay || error) && (
        <div className={okay ? styles.statusOk : styles.statusErr}>
          {error ? `✗ ${errorMessage}` : '✓ User registered'}
        </div>
      )}
    </Card>
  );
};
