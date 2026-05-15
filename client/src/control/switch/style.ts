import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((_theme: Theme) => ({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    userSelect: 'none',
    '-webkit-user-select': 'none',
  },
  track: {
    position: 'relative',
    width: '28px',
    height: '16px',
    borderRadius: '8px',
    backgroundColor: '#D9D9D9',
    transitionProperty: 'background-color',
    transitionDuration: '0.1s',
    transitionTimingFunction: 'ease-in',
    outlineWidth: '2px',
    outlineStyle: 'solid',
    outlineColor: 'transparent',
    transitionProperty: 'background-color, outline-color',
    '$root:hover &': {
      outlineColor: '#91CAFF',
    },
    '$root:focus &': {
      outlineColor: '#91CAFF',
    },
    '&$checked': {
      backgroundColor: '#1777FF',
    },
    '&$disabled': {
      opacity: 0.4,
      cursor: 'not-allowed',
    },
  },
  thumb: {
    position: 'absolute',
    top: '2px',
    left: '2px',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#FFFFFF',
    transitionProperty: 'left',
    transitionDuration: '0.1s',
    transitionTimingFunction: 'ease-in',
    '$checked &': {
      left: '14px',
    },
  },
  label: {
    fontWeight: 600,
    fontSize: '0.875rem',
    color: '#6E6E6E',
  },
  checked: {},
  disabled: {},
}));
