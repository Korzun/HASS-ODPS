import { createUseStyles } from 'react-jss';
import type { Theme } from '../../../theme/theme';

const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: '.75rem',
    background: theme.colors.bg.card,
    borderRadius: theme.borderRadius.md,
    padding: '.6rem .9rem',
    marginBottom: '.4rem',
    boxShadow: theme.shadows.card,
    cursor: 'pointer',
  },
  cover: { flexShrink: 0 },
  info: { flex: 1, minWidth: 0 },
  title: {
    fontWeight: 500,
    marginBottom: '.125rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  meta: {
    fontSize: '.75rem',
    color: theme.colors.text.muted,
    marginBottom: '.1rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  format: { fontSize: '.75rem', color: theme.colors.text.faint },
  progress: {
    fontSize: '.75rem',
    color: theme.colors.success,
    fontWeight: 500,
    marginRight: '.25rem',
    flexShrink: 0,
  },
  clearBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: theme.colors.text.faint,
    fontSize: '.75rem',
    padding: '.25rem .5rem',
    borderRadius: theme.borderRadius.sm,
    fontFamily: 'inherit',
    flexShrink: 0,
    '&:hover': { color: theme.colors.danger },
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: theme.colors.text.faint,
    fontSize: '1.1rem',
    padding: '.25rem .5rem',
    borderRadius: theme.borderRadius.sm,
    flexShrink: 0,
    '&:hover': { color: theme.colors.danger },
  },
}));

export { useStyle };
