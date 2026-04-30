import { createUseStyles } from '../../provider/theme';
import type { Theme } from '../../provider/theme';
import { applyTransparency } from '../../utils';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    minHeight: '1rem',
    marginBottom: '.4rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    position: 'relative',
    backgroundColor: '#FFF',
    outlineWidth: '2px',
    outlineStyle: 'solid',
    outlineColor: 'transparent',
    transitionProperty: 'border-color, outline-color, box-shadow',
    transitionDuration: '0.1s',
    transitionTimingFunction: 'ease-in',
    boxShadow: theme.shadows.card,
    padding: '4px',
    cursor: 'pointer',
    '&:hover, &:focus': {
      transitionDuration: '0s',
      borderColor: theme.colors.primary,
      outlineColor: applyTransparency(theme.colors.primary, 0.1),
    },
  },
  contentContainer: {
    height: '100%',
    width: '100%',
    borderRadius: theme.borderRadius.sm,
    position: 'relative',
    padding: '0.5rem',
  },
}));
