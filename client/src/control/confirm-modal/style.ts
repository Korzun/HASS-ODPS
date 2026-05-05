import { createUseStyles, type Theme } from '~/provider/theme';
import { applyTransparency } from '~/utils';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    cursor: 'default',
    borderRadius: theme.borderRadius.md,
    border: 'none',
    marginTop: '100px',
    marginLeft: 'auto',
    marginRight: 'auto',
    marginBottom: '50px',
    '&::backdrop': {
      backgroundColor: applyTransparency('#000', 0.8),
      backdropFilter: 'saturate(0%)',
    },
  },
  dialog: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '500px',
    backgroundColor: '#ffffff',
    boxShadow: '0px 2px 0px #D9D9D9',
  },
  header: {
    fontWeight: '600',
    fontSize: '1.25rem',
    padding: '1rem',
  },
  body: {
    paddingLeft: '1rem',
    paddingRight: '1rem',
    paddingBottom: '1rem',
    color: '#5A6375',
  },
  footer: {
    borderTopStyle: 'solid',
    borderTopColor: '#D0D0D0',
    borderTopWidth: '1px',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'end',
    gap: '0.25rem',
    paddingTop: '0.5rem',
    paddingBottom: '0.5rem',
    paddingLeft: '0.5rem',
    paddingRight: '0.5rem',
  },
}));
