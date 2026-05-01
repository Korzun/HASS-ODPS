import { createUseStyles } from '../../provider/theme';

export const useStyle = createUseStyles(() => ({
  root: {
    display: 'flex',
    fontSize: '0.80rem',
    alignItems: 'baseline',
    gap: '0.2rem',
    marginBottom: '1rem',
    marginTop: '0.5rem',
  },
  seperator: {
    color: '#9ca3af',
    cursor: 'default',
  },
}));
