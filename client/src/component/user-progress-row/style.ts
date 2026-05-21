import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  loading: {
    fontSize: '.875rem',
    color: theme.colors.text.muted,
  },
  error: {
    fontSize: '.875rem',
    color: theme.colors.danger,
  },
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: '.5rem',
  },
  progress: {
    display: 'flex',
    alignItems: 'center',
  },
  book: {
    fontSize: '.875rem',
    flexGrow: 1,
  },
  metadata: {
    fontSize: '.875rem',
  },
}));
