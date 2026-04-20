import { createUseStyles } from 'react-jss';
import type { Theme } from '../../theme/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  main: {
    maxWidth: 800,
    margin: '2rem auto',
    padding: '0 1rem',
  },
  loading: {
    color: theme.colors.text.muted,
    textAlign: 'center',
    padding: '2rem',
  },
}));
