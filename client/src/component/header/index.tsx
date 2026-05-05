import cx from 'classnames';
import { Link, useLocation } from 'react-router-dom';

import { Button } from '~/control';
import { BookIcon, BooksIcon, UsersIcon } from '~/icon';
import { useIsAdmin, useLogout, useUsername } from '~/provider/auth';
import { path } from '~/router';

import { useStyle } from './style';

export const Header = () => {
  const [username] = useUsername();
  const [isAdmin] = useIsAdmin();
  const [logout, loading] = useLogout();
  const styles = useStyle();
  const { pathname } = useLocation();

  return (
    <header className={styles.root}>
      <h1 className={styles.title}>
        <BooksIcon /> HASS-ODPS Library
      </h1>
      {isAdmin && (
        <nav className={styles.navigation}>
          <Link
            className={cx(styles.navigationItem, {
              [styles.active]: pathname.startsWith(path.library()),
            })}
            to={path.library()}
          >
            <BookIcon height={14} width={14} /> Library
          </Link>
          <Link
            className={cx(styles.navigationItem, {
              [styles.active]: pathname === path.userList(),
            })}
            to={path.userList()}
          >
            <UsersIcon height={14} width={14} /> Users
          </Link>
        </nav>
      )}
      <div className={styles.actions}>
        {username && <span className={styles.username}>{username}</span>}
        {username && <Button onClick={logout} loading={loading} text="Sign Out" />}
      </div>
    </header>
  );
};
