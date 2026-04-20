import { createUseStyles } from 'react-jss';
import type { Theme } from '../../../theme/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  scanRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '.75rem',
    marginBottom: '1rem',
  },
  scanBtn: {
    background: theme.colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: theme.borderRadius.sm,
    padding: '.5rem 1rem',
    fontSize: '.875rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
    '&:hover:not(:disabled)': { background: theme.colors.primaryHover },
    '&:disabled': { opacity: 0.6, cursor: 'not-allowed' },
  },
  dropZone: {
    border: `2px dashed ${theme.colors.primaryBorder}`,
    borderRadius: theme.borderRadius.lg,
    padding: '2rem',
    textAlign: 'center',
    cursor: 'pointer',
    background: theme.colors.primaryLight,
    marginBottom: '2rem',
    transition: 'background .15s',
  },
  dropZoneOver: {
    border: '2px dashed #3b82f6',
    borderRadius: theme.borderRadius.lg,
    padding: '2rem',
    textAlign: 'center',
    cursor: 'pointer',
    background: '#dbeafe',
    marginBottom: '2rem',
    transition: 'background .15s',
  },
  dropText: { color: theme.colors.primaryHover, marginBottom: '.5rem' },
  dropSmall: { color: theme.colors.text.muted },
  statusOk: { color: theme.colors.success, fontSize: '.875rem' },
  statusErr: { color: theme.colors.danger, fontSize: '.875rem' },
}));
