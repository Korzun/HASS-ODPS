import { createUseStyles, Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    overflow: 'hidden',
    borderRadius: '8px',
    '&$horizontal': {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'start',
      gap: '0.5rem',
      backgroundColor: '#EEEEEE',
      '& $label': {
        marginTop: '0.5rem',
        marginLeft: '0.375rem',
        minWidth: '6rem',
        textAlign: 'right',
      },
      '& $input': {
        flexGrow: 1,
      },
    },
    '&$vertical': {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.2rem',

      backgroundColor: '#EEEEEE',
      '& $label': {
        marginTop: '0.25rem',
        marginLeft: '0.5rem',
      },
      '& $input': {
        flexGrow: 1,
      },
    },
    '&$inline': {
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: '0.5rem',
    },
  },
  label: {
    fontWeight: 600,
    fontSize: '0.875rem',
    color: '#6E6E6E',
    display: `block`,
    '&$danger': {
      color: '#FF4D4F',
    },
  },
  input: {
    outlineWidth: '2px',
    outlineStyle: 'solid',
    outlineColor: 'transparent',
    padding: '.5rem',
    resize: 'none',
    minHeight: '10rem',
    '&$outlined': {
      borderColor: '#D9D9D9',
      borderStyle: 'solid',
      borderWidth: '1px',
      borderRadius: '8px',
      '&:hover': {
        borderColor: '#91CAFF',
      },
      '&:focus': {
        borderColor: '#0758d9',
      },
      '&$danger': {
        borderColor: '#FF4D4F',
      },
    },
    '&$borderless': {
      borderStyle: 'none',
      borderRadius: '8px',
    },
  },
  danger: {},
  horizontal: {},
  vertical: {},
  inline: {},
  outlined: {},
  borderless: {},
}));
