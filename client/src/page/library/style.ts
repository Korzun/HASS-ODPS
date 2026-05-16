import { createUseStyles } from '../../provider/theme';
import type { Theme } from '../../provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  buttonContainer: {
    display: 'flex',
    gap: '0.5rem',
  },
  spacer: {
    flexGrow: 1,
  },
}));
