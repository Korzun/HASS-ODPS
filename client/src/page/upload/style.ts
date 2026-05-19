import { createUseStyles } from '~/provider/theme';

export const useStyle = createUseStyles({
  queue: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  scanRow: {
    display: 'flex',
  },
  spacer: {
    flexGrow: 1,
  },
});
