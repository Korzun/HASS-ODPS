import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  rowContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  inputContainer: {
    display: 'flex',
  },
  input: {
    flexGrow: 1,
  },
}));
