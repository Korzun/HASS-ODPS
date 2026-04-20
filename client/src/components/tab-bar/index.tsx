import { useAuth } from '../../auth/auth-provider';
import { useStyle } from './style';

export type TabName = 'library' | 'users';

export interface TabBarProps {
  active: TabName;
  onTabChange: (tab: TabName) => void;
}

export function TabBar({ active, onTabChange }: TabBarProps) {
  const { isAdmin } = useAuth();
  const styles = useStyle();

  return (
    <nav className={styles.root}>
      <button
        type="button"
        className={active === 'library' ? styles.tabActive : styles.tab}
        aria-current={active === 'library' ? 'page' : undefined}
        onClick={() => onTabChange('library')}
      >
        Library
      </button>
      {isAdmin && (
        <button
          type="button"
          className={active === 'users' ? styles.tabActive : styles.tab}
          aria-current={active === 'users' ? 'page' : undefined}
          onClick={() => onTabChange('users')}
        >
          Users
        </button>
      )}
    </nav>
  );
}
