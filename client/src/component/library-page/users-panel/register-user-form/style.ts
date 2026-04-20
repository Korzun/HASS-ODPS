import { createUseStyles } from 'react-jss';
import type { Theme } from '../../../../theme/theme';

const statusBase = { marginTop: '.4rem', fontSize: '.8rem', minHeight: '1rem' };

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    background: theme.colors.bg.card,
    borderRadius: theme.borderRadius.md,
    padding: '.75rem 1rem',
    marginBottom: '1rem',
    boxShadow: theme.shadows.card,
  },
  title: {
    fontSize: '.8rem',
    fontWeight: 600,
    color: theme.colors.text.secondary,
    marginBottom: '.5rem',
    textTransform: 'uppercase',
    letterSpacing: '.05em',
  },
  row: {
    display: 'flex',
    gap: '.5rem',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    minWidth: 120,
    padding: '.4rem .6rem',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: '.875rem',
    fontFamily: 'inherit',
    background: theme.colors.bg.input,
    color: theme.colors.text.primary,
  },
  btn: {
    background: theme.colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: theme.borderRadius.sm,
    padding: '.4rem .9rem',
    fontSize: '.875rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
    '&:disabled': { opacity: 0.6, cursor: 'not-allowed' },
  },
  statusOk: { ...statusBase, color: theme.colors.success },
  statusErr: { ...statusBase, color: theme.colors.danger },
}));
