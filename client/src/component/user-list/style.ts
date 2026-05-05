import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  loading: {
    color: theme.colors.text.muted,
    textAlign: 'center',
    padding: '2rem',
  },
}));
