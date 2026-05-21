import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3em',
    color: theme.colors.text.primary,
  },
  label: {
    fontSize: '0.75rem',
  },
}));
