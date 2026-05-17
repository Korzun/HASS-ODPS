import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    marginBottom: '1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.375rem',
  },
  result: {
    fontSize: theme.text.size.md,
    color: theme.colors.text.muted,
  },
  resultError: {
    fontSize: theme.text.size.md,
    color: theme.colors.danger,
  },
}));
