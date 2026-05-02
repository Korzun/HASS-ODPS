import { Button } from '../../control/button';
import { useLogout, useUsername } from '../../provider/auth';

import { useStyle } from './style';

export const Header = () => {
  const [username] = useUsername();
  const [logout, loading] = useLogout();
  const styles = useStyle();

  return (
    <header className={styles.root}>
      <h1 className={styles.title}>HASS-ODPS Library</h1>
      <div className={styles.actions}>
        {username && <span className={styles.username}>{username}</span>}
        {username && <Button onClick={logout} loading={loading} text="Sign Out" />}
      </div>
    </header>
  );
};
