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
    width: '600px',
    backgroundColor: '#FAFAFA',
  },
  header: {
    fontWeight: '600',
    fontSize: '1.25rem',
    padding: '1rem',
  },
  chapterDisplay: {
    textAlign: 'center',
    padding: '0.5rem 1rem',
  },
  chapterNumber: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: theme.colors.text.primary,
  },
  chapterNumberMuted: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: theme.colors.text.faint,
  },
  chapterName: {
    fontSize: '0.85rem',
    fontStyle: 'italic',
    color: theme.colors.text.muted,
    marginTop: '0.125rem',
    minHeight: '1.25em',
  },
  chapterSubtitle: {
    fontSize: '0.8rem',
    color: theme.colors.text.muted,
    marginTop: '0.125rem',
  },
  sliderSection: {
    padding: '0.75rem 1rem 1.5rem',
  },
  error: {
    color: theme.colors.danger,
    fontSize: '0.8rem',
    padding: '0 1rem 0.75rem',
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
