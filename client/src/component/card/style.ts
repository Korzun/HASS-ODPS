import { createUseStyles, type Theme } from '~/provider/theme';
import { applyTransparency } from '~/utils';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    backgroundColor: '#FAFAFA',
    borderRadius: '16px',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: '#DDDDDD',
    overflow: 'hidden',
    boxShadow: `0px 2px 0px ${applyTransparency('#D9D9D9', 0.2)}`,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.5rem 0.75rem',
    backgroundColor: '#EEEEEE',
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    borderBottomColor: '#DDDDDD',
    textSelect: 'none',
    '-webkit-user-select': 'none',
    '&$danger': {
      color: '#FF4D4F',
    },
    '&$collapsed': {
      borderBottomStyle: 'none',
    },
  },
  title: {
    fontWeight: 600,
    fontSize: '0.875rem',
    color: '#6E6E6E',
  },
  subTitle: {
    fontSize: '.7rem',
    color: theme.colors.text.faint,
    marginLeft: '.25rem',
  },
  spacer: {
    flexGrow: 1,
  },
  content: {
    padding: '0.75rem',
  },
  clickable: {
    cursor: 'pointer',
  },
  collapsed: {},
}));
