import { createUseStyles } from 'react-jss';
import type { Theme } from '../../theme/theme';

const tabBase = {
  background: 'transparent',
  border: 'none',
  padding: '.625rem 1.25rem',
  cursor: 'pointer',
  fontSize: '.9rem',
  fontFamily: 'inherit',
  marginBottom: -2, // bleeds over parent border-bottom to create active indicator
};

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    display: 'flex',
    borderBottom: `2px solid ${theme.colors.borderLight}`,
    marginBottom: '1.5rem',
  },
  tab: {
    ...tabBase,
    color: theme.colors.text.muted,
    borderBottom: '2px solid transparent',
    '&:hover': { color: theme.colors.text.secondary },
  },
  tabActive: {
    ...tabBase,
    color: theme.colors.primary,
    borderBottom: `2px solid ${theme.colors.primary}`,
    fontWeight: 500,
  },
}));
