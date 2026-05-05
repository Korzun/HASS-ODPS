import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: theme.colors.bg.page,
  },
  form: {
    backgroundColor: theme.colors.bg.card,
    padding: '2rem',
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.cover,
    width: '320px',
    border: `1px solid ${theme.colors.border}`,
  },
  title: {
    margin: '0 0 1.5rem',
    fontSize: theme.text.size.xlg,
    color: theme.colors.text.primary,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '.5rem',
    justifyContent: 'center',
  },
  label: {
    display: 'block',
    marginBottom: '0.25rem',
    fontSize: theme.text.size.md,
    color: theme.colors.text.secondary,
  },
  input: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    marginBottom: '1rem',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.text.size.lg,
    backgroundColor: theme.colors.bg.input,
    color: theme.colors.text.primary,
    boxSizing: 'border-box',
    '&:focus': {
      outline: `2px solid ${theme.colors.primary}`,
      outlineOffset: '-1px',
      borderColor: theme.colors.primary,
    },
  },
  login: {
    marginTop: '0.5rem',
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.text.size.md,
    marginBottom: '1rem',
  },
}));
