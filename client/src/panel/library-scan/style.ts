import { createUseStyles } from '../../provider/theme';
import { Theme } from '../../provider/theme';

export const useStyle = createUseStyles((theme: Theme) => {
  return {
    root: {
      // display: 'flex',
      // alignItems: 'center',
      // gap: '.75rem',
      marginBottom: '1rem',
    },
    statusOk: { color: theme.colors.success, fontSize: '.875rem' },
    statusErr: { color: theme.colors.danger, fontSize: '.875rem' },
  };
});
