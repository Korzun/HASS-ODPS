import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3em',
  },
  track: {
    fill: 'transparent',
  },
  sector: {
    fill: '#1777FF',
  },
  ring: {
    fill: 'none',
    stroke: theme.colors.text.primary,
    strokeWidth: 6,
  },
  label: {
    fontSize: '0.75rem',
    color: theme.colors.text.primary,
  },
}));
