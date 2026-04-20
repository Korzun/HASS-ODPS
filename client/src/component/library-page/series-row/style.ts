import { createUseStyles } from 'react-jss';
import type { Theme } from '../../../theme/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    background: theme.colors.bg.card,
    borderRadius: theme.borderRadius.md,
    padding: '.75rem 1rem',
    marginBottom: '.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '.9rem',
    boxShadow: theme.shadows.card,
    cursor: 'pointer',
    border: '1px solid transparent',
    '&:hover': { borderColor: theme.colors.primaryBorder },
  },
  info: { flex: 1, minWidth: 0 },
  name: {
    fontWeight: 600,
    fontSize: '.92rem',
    color: theme.colors.text.primary,
    marginBottom: '.15rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  meta: {
    fontSize: '.75rem',
    color: theme.colors.text.muted,
    marginBottom: '.1rem',
  },
  progress: {
    color: theme.colors.success,
    fontWeight: 500,
  },
  link: {
    fontSize: '.7rem',
    color: theme.colors.primary,
    fontWeight: 500,
  },
}));
