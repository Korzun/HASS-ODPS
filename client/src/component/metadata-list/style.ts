import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    display: 'flex',
    gap: '1rem',
  },
  separator: {
    color: theme.colors.border,
    fontSize: '2rem',
    lineHeight: '0.75rem',
  },
}));
