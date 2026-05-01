import { createUseStyles } from '../../provider/theme';

export const useStyle = createUseStyles(() => ({
  root: {
    animation: '$rotation 1s infinite linear',
  },
  '@keyframes rotation': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
}));
