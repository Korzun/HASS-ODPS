import { createUseStyles } from 'react-jss';
import type { Theme } from '../../../theme/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {},
  loading: {
    color: theme.colors.text.muted,
    textAlign: 'center',
    padding: '2rem',
  },
  empty: {
    color: theme.colors.text.muted,
    textAlign: 'center',
    padding: '1rem 0',
  },
  list: { listStyle: 'none', padding: 0, margin: 0 },
}));
