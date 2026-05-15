import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {},
  loading: {
    color: theme.colors.text.muted,
    textAlign: 'center',
    padding: '2rem',
  },
}));
