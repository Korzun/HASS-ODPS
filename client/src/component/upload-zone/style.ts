import { createUseStyles, type Theme } from '~/provider/theme';

// Drag-over highlight colours (higher-saturation variants of primaryBorder/primaryLight)
const DRAG_OVER_BG = '#dbeafe';

export const useStyle = createUseStyles((theme: Theme) => {
  const dropZoneBase = {
    borderRadius: theme.borderRadius.lg,
    padding: '2rem',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'background .15s',
  };

  return {
    scanRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '.75rem',
    },
    dropZone: {
      ...dropZoneBase,
      background: theme.colors.primaryLight,
    },
    dropZoneOver: {
      ...dropZoneBase,
      background: DRAG_OVER_BG,
    },
    dropText: {
      color: theme.colors.primaryHover,
    },
  };
});
