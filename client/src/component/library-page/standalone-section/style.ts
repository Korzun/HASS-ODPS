import { createUseStyles } from 'react-jss';
import type { Theme } from '../../../theme/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: { marginTop: '1.25rem' },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '.5rem',
    padding: '.5rem .25rem',
    cursor: 'pointer',
    userSelect: 'none',
    marginBottom: '.4rem',
  },
  chevron: { fontSize: '.65rem', color: theme.colors.text.faint, width: 12, flexShrink: 0 },
  label: {
    fontSize: '.75rem',
    fontWeight: 600,
    color: theme.colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: '.05em',
  },
  count: { fontSize: '.7rem', color: theme.colors.text.faint, marginLeft: '.25rem' },
}));
