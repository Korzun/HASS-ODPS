import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  pill: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.space.md,
    border: `1.5px dashed ${theme.color.border.default}`,
    borderRadius: theme.radius.md,
    padding: `${theme.space.xl} ${theme.space.xxl}`,
    backgroundColor: theme.color.bg.input,
  },
  pillIcon: {
    flexShrink: 0,
    color: theme.color.text.faint,
  },
  password: {
    fontFamily: theme.fontFamily.mono,
    flex: 1,
    color: theme.color.text.primary,
    fontSize: theme.fontSize.md,
    letterSpacing: '0.03em',
  },
  copiedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.space.xs,
    padding: `4px 10px`,
    border: `1px solid #bbf7d0`,
    borderRadius: theme.radius.md,
    backgroundColor: '#f0fdf4',
    color: theme.color.success,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    whiteSpace: 'nowrap',
  },
}));
