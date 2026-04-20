import { useAuth } from '../../auth/auth-provider';
import { useStyle } from './style';

export function Header() {
  const { username } = useAuth();
  const styles = useStyle();

  return (
    <header className={styles.root}>
      <h1 className={styles.title}>HASS-ODPS Library</h1>
      <div className={styles.actions}>
        <span className={styles.username}>{username}</span>
        <form method="POST" action="/logout" style={{ margin: 0 }}>
          <button type="submit" className={styles.signOut}>Sign Out</button>
        </form>
      </div>
    </header>
  );
}
