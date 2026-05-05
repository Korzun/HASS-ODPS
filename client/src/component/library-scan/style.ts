import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => {
  return {
    root: {
      marginBottom: '1rem',
    },
    statusOk: { color: theme.colors.success, fontSize: '.875rem' },
    statusErr: { color: theme.colors.danger, fontSize: '.875rem' },
  };
});
