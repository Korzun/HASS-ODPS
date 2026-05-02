import { createUseStyles } from '../../provider/theme';
import type { Theme } from '../../provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    background: theme.colors.primary,
    color: '#fff',
    padding: '1rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spacer: {
    flexGrow: 1,
  },
  title: {
    fontSize: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '.5rem',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '.75rem',
  },
  username: {
    fontSize: '.875rem',
    opacity: 0.85,
  },
}));
