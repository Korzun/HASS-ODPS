import { createUseStyles } from '../../provider/theme';
import type { Theme } from '../../provider/theme';

const statusBase = {
  marginTop: '.4rem',
  fontSize: '.8rem',
  minHeight: '1rem',
};

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    background: theme.colors.bg.card,
    borderRadius: theme.borderRadius.md,
    padding: '.75rem 1rem',
    marginBottom: '1rem',
    boxShadow: theme.shadows.card,
  },
  title: {
    fontWeight: 500,
    marginBottom: '.5rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
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
    padding: '.45rem .6rem',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: '.875rem',
    fontFamily: 'inherit',
    background: theme.colors.bg.input,
    color: theme.colors.text.primary,
  },
  statusOk: { ...statusBase, color: theme.colors.success },
  statusErr: { ...statusBase, color: theme.colors.danger },
}));
