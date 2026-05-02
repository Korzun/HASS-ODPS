import { createUseStyles } from '../../provider/theme';

export const useStyle = createUseStyles(() => ({
  figure: {
    flexShrink: 0,
    margin: 0,
    padding: 0,
    marginBottom: '-12px',
    marginRight: '-15px',
  },
  wrapper: {
    position: 'absolute',
    inset: 0,
  },
}));
