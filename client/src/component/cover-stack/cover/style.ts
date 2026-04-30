import { createUseStyles } from '../../../provider/theme';
import type { Theme } from '../../../provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  layer: {
    borderRadius: theme.borderRadius.sm,
    boxShadow: '1px 1px 3px rgba(0,0,0,.18)',
  },
  coverImg: {
    objectFit: 'cover',
    display: 'block',
  },
  ghost: {
    background: '#d1d5db',
  },
}));
