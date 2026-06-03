import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    padding: `${theme.space.xs} ${theme.space.md}`,
    background: theme.color.brand.light,
    color: theme.color.brand.default,
    borderRadius: theme.radius.md,
    fontSize: theme.fontSize.sm,
    border: `1px solid ${theme.color.brand.outline}`,
  },
}));
