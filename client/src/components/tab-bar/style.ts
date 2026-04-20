import { createUseStyles } from 'react-jss';
import type { Theme } from '../../theme/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    display: 'flex',
    borderBottom: `2px solid ${theme.colors.borderLight}`,
    marginBottom: '1.5rem',
  },
  tab: {
    background: 'transparent',
    border: 'none',
    padding: '.625rem 1.25rem',
    cursor: 'pointer',
    fontSize: '.9rem',
    color: theme.colors.text.muted,
    borderBottom: '2px solid transparent',
    marginBottom: -2,
    fontFamily: 'inherit',
    '&:hover': { color: theme.colors.text.secondary },
  },
  tabActive: {
    background: 'transparent',
    border: 'none',
    padding: '.625rem 1.25rem',
    cursor: 'pointer',
    fontSize: '.9rem',
    fontFamily: 'inherit',
    marginBottom: -2,
    color: theme.colors.primary,
    borderBottom: `2px solid ${theme.colors.primary}`,
    fontWeight: 500,
  },
}));
