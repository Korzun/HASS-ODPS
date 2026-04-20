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
    display: 'block',
    '&:hover': { color: theme.colors.primaryHover },
  },
  detail: {
    display: 'flex',
    gap: '1.25rem',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
  },
  coverPlaceholder: {
    width: 80,
    height: 114,
    background: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    flexShrink: 0,
  },
  coverImg: {
    flexShrink: 0,
    borderRadius: theme.borderRadius.sm,
    display: 'block',
    objectFit: 'cover',
  },
  info: {
    flex: 1,
    minWidth: 0,
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
  series: {
    display: 'inline-block',
    padding: '0.125rem 0.5rem',
    background: theme.colors.primaryLight,
    color: theme.colors.primary,
    borderRadius: theme.borderRadius.pill,
    fontSize: '0.75rem',
    marginBottom: '0.5rem',
  },
  meta: {
    color: theme.colors.text.muted,
    fontSize: '0.875rem',
    marginBottom: '0.125rem',
  },
  editBtn: {
    marginTop: '0.75rem',
    padding: '0.375rem 0.75rem',
    background: theme.colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: theme.borderRadius.sm,
    cursor: 'pointer',
    fontSize: '0.875rem',
    '&:hover': { background: theme.colors.primaryHover },
  },
  description: {
    color: theme.colors.text.secondary,
    lineHeight: 1.6,
    marginBottom: '1rem',
    whiteSpace: 'pre-wrap',
  },
  subjects: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  pill: {
    padding: '0.25rem 0.625rem',
    background: theme.colors.primaryLight,
    color: theme.colors.primary,
    borderRadius: theme.borderRadius.pill,
    fontSize: '0.75rem',
  },
  identifiers: {
    marginTop: '0.5rem',
  },
  identifier: {
    fontSize: '0.875rem',
    color: theme.colors.text.muted,
    marginBottom: '0.125rem',
  },
  scheme: {
    fontWeight: 600,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    fontSize: '0.75rem',
  },
}));
