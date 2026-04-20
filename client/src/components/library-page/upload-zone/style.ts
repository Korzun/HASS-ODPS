import { createUseStyles } from 'react-jss';
import type { Theme } from '../../../theme/theme';

// Drag-over highlight colours (higher-saturation variants of primaryBorder/primaryLight)
const DRAG_OVER_BORDER = '#3b82f6';
const DRAG_OVER_BG = '#dbeafe';

export const useStyle = createUseStyles((theme: Theme) => {
  const dropZoneBase = {
    borderRadius: theme.borderRadius.lg,
    padding: '2rem',
    textAlign: 'center' as const,
    cursor: 'pointer',
    marginBottom: '2rem',
    transition: 'background .15s',
  };

  return {
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
      ...dropZoneBase,
      border: `2px dashed ${theme.colors.primaryBorder}`,
      background: theme.colors.primaryLight,
    },
    dropZoneOver: {
      ...dropZoneBase,
      border: `2px dashed ${DRAG_OVER_BORDER}`,
      background: DRAG_OVER_BG,
    },
    dropText: { color: theme.colors.primaryHover, marginBottom: '.5rem' },
    dropSmall: { color: theme.colors.text.muted },
    statusOk: { color: theme.colors.success, fontSize: '.875rem' },
    statusErr: { color: theme.colors.danger, fontSize: '.875rem' },
  };
});
