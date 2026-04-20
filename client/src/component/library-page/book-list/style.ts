import { createUseStyles } from 'react-jss';
import type { Theme } from '../../../theme/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  empty: {
    color: theme.colors.text.muted,
    textAlign: 'center',
    padding: '2rem',
  },
}));
