import { createUseStyles, type Theme } from '~/provider/theme';

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
  },
  title: {
    margin: '0 0 0.25rem',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: theme.colors.text.primary,
  },
  author: {
    color: theme.colors.text.secondary,
    marginBottom: '0.375rem',
  },
  meta: {
    color: theme.colors.text.muted,
    fontSize: '0.875rem',
  },
  readingOrderLabel: {
    marginBottom: '.2rem',
    // margin: '0 0 0.2rem',
    fontSize: '1rem',
    fontWeight: 600,
    color: theme.colors.text.secondary,
  },
  bookList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  bookListContainer: {},
}));
