import { createUseStyles, type Theme } from '~/provider/theme';
import { applyTransparency } from '~/utils';

export const useStyle = createUseStyles((theme: Theme) => ({
  '@global': {
    'body:has(dialog[open])': {
      overflow: 'hidden',
    },
  },
  root: {
    cursor: 'default',
    borderRadius: '16px',
    border: 'none',
    marginTop: '100px',
    marginLeft: 'auto',
    marginRight: 'auto',
    marginBottom: '50px',
    outline: 'none',
    '&::backdrop': {
      backgroundColor: applyTransparency('#000', 0.7),
      backdropFilter: 'blur(2px) saturate(0%)',
    },
  },
  dialog: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '500px',
    backgroundColor: '#FAFAFA',
  },
  header: {
    fontWeight: '600',
    fontSize: '1.25rem',
    padding: '1rem',
  },
  icon: {
    height: '24px',
    display: 'inline',
    paddingRight: '0.5rem',
    '& svg': {
      position: 'relative',
      top: '5px',
    },
  },
  iconDanger: {
    color: '#FF4D4F',
  },
  body: {
    paddingLeft: '1rem',
    paddingRight: '1rem',
    paddingBottom: '1.5rem',
    color: '#5A6375',
  },
  footer: {
    backgroundColor: '#EEEEEE',
    borderTopStyle: 'solid',
    borderTopColor: '#D0D0D0',
    borderTopWidth: '1px',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'end',
    gap: '0.5rem',
    paddingTop: '0.75rem',
    paddingBottom: '0.75rem',
    paddingLeft: '0.75rem',
    paddingRight: '0.75rem',
  },
}));
