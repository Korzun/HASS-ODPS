import { useAuth } from '../../auth/auth-provider';
import { useStyle } from './style';

export type TabName = 'library' | 'users';

interface TabBarProps {
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
        onClick={() => onTabChange('library')}
      >
        Library
      </button>
      {isAdmin && (
        <button
          type="button"
          className={active === 'users' ? styles.tabActive : styles.tab}
          onClick={() => onTabChange('users')}
        >
          Users
        </button>
      )}
    </nav>
  );
}
