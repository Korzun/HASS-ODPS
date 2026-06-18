import { createUseStyles } from '~/provider/theme';

export type StyleProps = {
  layerWidth: number;
  layerHeight: number;
};

export const useStyle = createUseStyles({
  figure: {
    flexShrink: 0,
    margin: 0,
    padding: 0,
    position: 'relative',
    overflow: 'hidden',
    width: ({ layerWidth }: StyleProps) => layerWidth + 6,
    height: ({ layerHeight }: StyleProps) => layerHeight,
  },
  wrapper: {
    position: 'absolute',
    inset: 0,
  },
});
