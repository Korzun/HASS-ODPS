import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    display: 'flex',
    gap: '0.3em',
    fontSize: '0.75rem',
    color: theme.colors.text.primary,
  },
  title: {
    color: '#9ca3af',
    // color: theme.colors.text.muted,
    textTransform: 'capitalize',
  },
}));
