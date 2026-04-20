import { createUseStyles } from 'react-jss';
import type { Theme } from '../../theme/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    maxWidth: 680,
    margin: '0 auto',
    padding: '1rem',
  },
  loading: {
    color: theme.colors.text.muted,
    padding: '2rem',
    textAlign: 'center',
  },
  notFound: {
    color: theme.colors.text.muted,
    padding: '2rem',
    textAlign: 'center',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: theme.colors.primary,
    cursor: 'pointer',
    fontSize: '0.875rem',
    padding: '0.25rem 0',
    marginBottom: '1.25rem',
    '&:hover': { color: theme.colors.primaryHover },
  },
  hero: {
    display: 'flex',
    gap: '1.25rem',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  heroInfo: {},
  title: {
    margin: '0 0 0.375rem',
    fontSize: '1.5rem',
    fontWeight: 700,
    color: theme.colors.text.primary,
  },
  meta: {
    color: theme.colors.text.muted,
    fontSize: '0.875rem',
  },
  readingOrderLabel: {
    margin: '0 0 0.75rem',
    fontSize: '1rem',
    fontWeight: 600,
    color: theme.colors.text.secondary,
  },
  bookList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
}));
