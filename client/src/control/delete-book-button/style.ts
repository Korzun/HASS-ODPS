import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  book: {
    color: '#FF4D4F',
    fontWeight: 800,
  },
  undone: {
    fontWeight: 800,
  },
}));
