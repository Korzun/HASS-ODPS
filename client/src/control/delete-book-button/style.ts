import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  book: {
    color: '#FF4D4F',
  },
  undone: {
    fontWeight: 600,
  },
}));
