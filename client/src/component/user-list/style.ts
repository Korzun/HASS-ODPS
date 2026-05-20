import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  loading: {
    color: theme.colors.text.muted,
    textAlign: 'center',
    padding: '2rem',
  },
}));
