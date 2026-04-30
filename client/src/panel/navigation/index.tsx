import { useNavigate } from 'react-router-dom';

import { useIsAdmin } from '../../provider/auth';
import * as path from '../../router/path';

import { useStyle } from './style';

export type TabName = 'library' | 'user-list';

export interface NavigationPanelProps {
  active: TabName;
}

export function NavigationPanel({ active }: NavigationPanelProps) {
  const styles = useStyle();
  
  const [ isAdmin ] = useIsAdmin();
  const navigate = useNavigate();

  return (
    <nav className={styles.root}>
      <button
        type="button"
        className={active === 'library' ? styles.tabActive : styles.tab}
        aria-current={active === 'library' ? 'page' : undefined}
        onClick={() => navigate(path.library())}
      >
        Library
      </button>
      {isAdmin && (
        <button
          type="button"
          className={active === 'user-list' ? styles.tabActive : styles.tab}
          aria-current={active === 'user-list' ? 'page' : undefined}
          onClick={() => navigate(path.userList())}
        >
          Users
        </button>
      )}
    </nav>
  );
}
