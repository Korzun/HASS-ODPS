import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  message: {
    fontSize: '0.875rem',
  },
  error: {
    color: '#FF4D4F',
  },
}));
