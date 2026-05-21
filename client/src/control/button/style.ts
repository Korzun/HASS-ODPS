import { createUseStyles, type Theme } from '~/provider/theme';
import { applyTransparency } from '~/utils';

export type ButtonTypeValue = 'default' | 'primary' | 'text' | 'link' | 'dashed';
export enum ButtonType {
  Default = 'default',
  Primary = 'primary',
  Text = 'text',
  Link = 'link',
  Dashed = 'dashed',
}

export type StyleProps = {
  type: ButtonType;
};
export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    display: 'flex',
    gap: '0.5em',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#1e1e1e',
    outlineWidth: '2px',
    outlineStyle: 'solid',
    outlineColor: 'transparent',
    borderColor: 'transparent',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderRadius: '8px',
    padding: '.5rem 1rem',
    cursor: 'pointer',
    fontSize: '0.80rem',
    userSelect: 'none',
    '-webkit-user-select': 'none',
    transitionProperty: 'color, background-color',
    transitionDuration: '0.1s',
    transitionTimingFunction: 'ease-in',
    '&:hover, &:focus, &:active': {
      transitionDuration: '0s',
    },
  },

  [ButtonType.Default]: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D9D9D9',
    borderStyle: 'solid',
    borderWidth: '1px',
    boxShadow: `0px 2px 0px ${applyTransparency('#D9D9D9', 0.2)}`,
    color: '#1f1f1f',
    '&:focus': {
      borderColor: '#FFF',
      outlineColor: '#91CAFF',
      boxShadow: `0px 2px 0px transparent`,
    },
    '&:hover': {
      borderColor: '#3f96fe',
      color: '#3f96fe',
      outlineColor: 'transparent',
    },
    '&:active': {
      borderColor: '#0758d9',
      color: '#0758d9',
    },
    '&$disabled': {
      cursor: 'not-allowed',
      filter: 'saturate(0)',
      '&:hover': {
        borderColor: '#D9D9D9',
        color: '#1f1f1f',
        outlineColor: 'transparent',
      },
    },
    '&$loading': {
      cursor: 'default',
      borderColor: '#e6e6e6',
      color: '#6d6d6d',
      boxShadow: `0px 2px 0px transparent`,
      outlineColor: 'transparent',
      '&:focus': {
        borderColor: '#e6e6e6',
        color: '#6d6d6d',
      },
      '&:hover': {
        borderColor: '#87BAFF',
        color: '#87BAFF',
      },
      '&:active': {
        borderColor: '#6893e7',
        color: '#6893e7',
      },
      '&$disabled': {
        cursor: 'not-allowed',
        filter: 'saturate(0)',
      },
    },
    '&$danger': {
      color: '#FF4D4F',
      borderColor: '#FF4D4F',
      boxShadow: `0px 2px 0px ${applyTransparency('#FF4D4F', 0.1)}`,
      '&:focus': {
        color: '#ff7874',
        borderColor: '#FFF',
        outlineColor: applyTransparency('#ff7874', 0.5),
        boxShadow: `0px 2px 0px transparent`,
      },
      '&:hover': {
        color: '#ff7874aa',
        borderColor: '#ff7874aa',
        outlineColor: 'transparent',
      },
      '&:active': {
        color: '#D9373e',
        borderColor: '#D9373e',
      },
      '&$loading': {
        cursor: 'default',
        borderColor: '#ff7874',
        color: '#ff7874',
        outlineColor: 'transparent',
        boxShadow: `0px 2px 0px transparent`,
        '&:focus': {
          borderColor: '#ff7874',
          color: '#ff7874',
        },
        '&:hover': {
          borderColor: '#FFA8A6',
          color: '#FFA8A6',
        },
        '&:active': {
          borderColor: '#e98182',
          color: '#e98182',
        },
      },
      '&$disabled': {
        cursor: 'not-allowed',
        filter: 'saturate(0)',
      },
    },
  },

  [ButtonType.Dashed]: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D9D9D9',
    borderStyle: 'dashed',
    borderWidth: '1px',
    color: '#1f1f1f',
    '&:focus': {
      borderColor: '#FFF',
      outlineColor: '#91CAFF',
    },
    '&:hover': {
      borderColor: '#3f96fe',
      color: '#3f96fe',
      outlineColor: 'transparent',
    },
    '&:active': {
      borderColor: '#0758d9',
      color: '#0758d9',
    },
    '&$disabled': {
      cursor: 'not-allowed',
      filter: 'saturate(0)',
      '&:hover': {
        borderColor: '#D9D9D9',
        color: '#1f1f1f',
        outlineColor: 'transparent',
      },
    },
    '&$loading': {
      cursor: 'default',
      borderColor: '#e6e6e6',
      color: '#6d6d6d',
      outlineColor: 'transparent',
      '&:focus': {
        borderColor: '#e6e6e6',
        color: '#6d6d6d',
      },
      '&:hover': {
        borderColor: '#87BAFF',
        color: '#87BAFF',
      },
      '&:active': {
        borderColor: '#6893e7',
        color: '#6893e7',
      },
      '&$disabled': {
        cursor: 'not-allowed',
        filter: 'saturate(0)',
      },
    },
    '&$danger': {
      color: '#FF4D4F',
      borderColor: '#FF4D4F',
      '&:focus': {
        color: '#ff7874',
        borderColor: '#FFF',
        outlineColor: applyTransparency('#ff7874', 0.5),
      },
      '&:hover': {
        color: '#ff7874aa',
        borderColor: '#ff7874aa',
        outlineColor: 'transparent',
      },
      '&:active': {
        color: '#D9373e',
        borderColor: '#D9373e',
      },
      '&$loading': {
        cursor: 'default',
        borderColor: '#ff7874',
        color: '#ff7874',
        outlineColor: 'transparent',
        '&:focus': {
          borderColor: '#ff7874',
          color: '#ff7874',
        },
        '&:hover': {
          borderColor: '#FFA8A6',
          color: '#FFA8A6',
        },
        '&:active': {
          borderColor: '#e98182',
          color: '#e98182',
        },
      },
      '&$disabled': {
        cursor: 'not-allowed',
        filter: 'saturate(0)',
      },
    },
  },

  [ButtonType.Primary]: {
    backgroundColor: '#1777FF',
    boxShadow: `0px 2px 0px ${applyTransparency('#1777FF', 0.2)}`,
    color: '#FFFFFF',
    '&:focus': {
      backgroundColor: '#3696fe',
      borderColor: '#FFFFFF',
      outlineColor: applyTransparency('#3696fe', 0.5),
      boxShadow: `0px 2px 0px transparent`,
    },
    '&:hover': {
      backgroundColor: '#3696fe',
      outlineColor: 'transparent',
      borderColor: 'transparent',
    },
    '&:active': {
      backgroundColor: '#0758d9',
      outlineColor: 'transparent',
      borderColor: 'transparent',
    },
    '&$loading': {
      cursor: 'default',
      backgroundColor: '#73A6FF',
      boxShadow: `0px 2px 0px transparent`,
      '&:focus': {
        outlineColor: 'transparent',
        borderColor: 'transparent',
      },
      '&:hover': {
        backgroundColor: '#87BAFF',
        outlineColor: 'transparent',
      },
      '&:active': {
        backgroundColor: '#6893e7',
      },
    },
    '&$disabled': {
      cursor: 'not-allowed',
      filter: 'saturate(0)',
    },

    '&$danger': {
      backgroundColor: '#FF4D4F',
      boxShadow: `0px 2px 0px ${applyTransparency('#FF4D4F', 0.1)}`,
      '&:focus': {
        backgroundColor: '#ff7874',
        borderColor: '#FFFFFF',
        outlineColor: applyTransparency('#ff7874', 0.5),
        boxShadow: `0px 2px 0px transparent`,
      },
      '&:hover': {
        backgroundColor: '#ff7874',
        outlineColor: 'transparent',
        borderColor: 'transparent',
      },
      '&:active': {
        backgroundColor: '#D9373e',
        outlineColor: 'transparent',
        borderColor: 'transparent',
      },
      '&$loading': {
        cursor: 'default',
        backgroundColor: '#FF8E8E',
        boxShadow: `0px 2px 0px transparent`,
        '&:hover': {
          backgroundColor: '#FFA8A6',
          outlineColor: 'transparent',
        },
        '&:active': {
          backgroundColor: '#e98182',
        },
        '&:focus': {
          outlineColor: 'transparent',
        },
      },
      '&$disabled': {
        cursor: 'not-allowed',
        filter: 'saturate(0)',
      },
    },
  },

  [ButtonType.Text]: {
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: '#f0f0f0',
    },
    '&:active': {
      backgroundColor: '#d9d9d9',
    },
    '&$disabled': {
      cursor: 'not-allowed',
      filter: 'saturate(0)',
      '&:hover': {
        backgroundColor: 'transparent',
      },
    },
    '&$loading': {
      cursor: 'default',
      color: '#6d6d6d',
      '&:hover': {
        backgroundColor: '#f0f0f0',
      },
    },
    '&$danger': {
      color: '#FF4D4F',
      '&:hover': {
        backgroundColor: '#fff1f0',
      },
      '&$loading': {
        cursor: 'default',
        color: '#ff7874',
        '&:hover': {
          backgroundColor: '#fff1f0',
        },
      },
    },
  },

  [ButtonType.Link]: {
    cursor: 'pointer',
    display: 'inline',
    borderStyle: 'none',
    outlineStyle: 'none',
    padding: '0',
    color: '#1777FF',
    '&:hover': {
      color: '#3696fe',
    },
    '&:active': {
      color: '#0758d9',
    },
    '&$disabled': {
      cursor: 'default',
      color: '#6b7280',
    },
    '&$loading': {
      cursor: 'default',
      color: '#6d6d6d',
      '&:hover': {
        color: '#87BAFF',
      },
      '&:active': {
        color: '#6893e7',
      },
    },
    '&$danger': {
      color: '#FF4D4F',
      '&:hover': {
        color: '#ff7874',
      },
      '&:active': {
        color: '#D9373e',
      },
      '&$loading': {
        cursor: 'default',
        color: '#FF8E8E',
        '&:hover': {
          color: '#FFA8A6',
        },
        '&:active': {
          color: '#e98182',
        },
      },
    },
  },
  danger: {},
  disabled: {
    opacity: 0.5,
  },
  loading: {},
  spinner: {
    animation: '$rotation 1s infinite linear',
    height: '1em',
    width: '1em',
  },
  '@keyframes rotation': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
}));
