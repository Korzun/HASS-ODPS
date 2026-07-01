import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  loading: {
    fontSize: theme.fontSize.md,
    color: theme.color.text.muted,
  },
  error: {
    fontSize: theme.fontSize.md,
    color: theme.color.danger.default,
  },
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.space.md,
  },
  progress: {
    display: 'flex',
    alignItems: 'center',
  },
  book: {
    fontSize: theme.fontSize.md,
    flexGrow: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  metadata: {
    fontSize: theme.fontSize.md,
  },
}));
