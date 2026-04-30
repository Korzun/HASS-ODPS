import { createUseStyles } from '../../provider/theme';

export const useStyle = createUseStyles(() => ({
  figure: {
    flexShrink: 0,
    margin: 0,
    padding: 0,
    marginBottom: '-6px',
  },
  wrapper: {
    position: 'absolute',
    inset: 0,
  },
}));
