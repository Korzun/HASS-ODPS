import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    listStyle: 'none',
    background: theme.colors.bg.card,
    borderRadius: theme.borderRadius.md,
    boxShadow: theme.shadows.card,
    marginBottom: '.5rem',
  },
  progressList: {
    listStyle: 'none',
    padding: '.5rem .75rem',
    margin: 0,
    background: theme.colors.primaryLight,
    borderTop: `1px solid ${theme.colors.borderLight}`,
  },
  progressEmpty: {
    color: theme.colors.text.muted,
    fontSize: '.875rem',
    padding: '.4rem 0',
  },
  username: {
    color: '#FF4D4F',
  },
  undone: {
    fontWeight: 600,
  },
}));
