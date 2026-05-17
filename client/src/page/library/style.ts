import { createUseStyles } from '../../provider/theme';
import type { Theme } from '../../provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 1rem',
    gap: '0.5rem',
  },
  emptyStateTitle: {
    fontSize: theme.text.size.lg,
    fontWeight: 600,
    color: theme.colors.text.muted,
  },
  emptyStateSubtitle: {
    fontSize: theme.text.size.md,
    color: theme.colors.text.faint,
  },
  buttonContainer: {
    display: 'flex',
    gap: '0.5rem',
  },
  spacer: {
    flexGrow: 1,
  },
}));
