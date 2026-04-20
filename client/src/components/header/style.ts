import { createUseStyles } from 'react-jss';
import type { Theme } from '../../theme/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    background: theme.colors.primary,
    color: '#fff',
    padding: '1rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: '1.25rem' },
  actions: { display: 'flex', alignItems: 'center', gap: '.75rem' },
  username: { fontSize: '.875rem', opacity: 0.85 },
  signOut: {
    background: 'transparent',
    color: '#fff',
    border: '1px solid rgba(255,255,255,.5)',
    borderRadius: theme.borderRadius.sm,
    padding: '.375rem .75rem',
    cursor: 'pointer',
    fontSize: '.875rem',
    '&:hover': { background: 'rgba(255,255,255,.1)' },
  },
}));
