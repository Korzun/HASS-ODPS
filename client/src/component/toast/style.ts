import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  toast: {
    position: 'fixed' as const,
    bottom: '1.5rem',
    right: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1rem',
    borderRadius: theme.borderRadius.md,
    fontSize: '.875rem',
    fontWeight: 500,
    color: theme.colors.text.primary,
    background: theme.colors.bg.card,
    boxShadow: theme.shadows.cover,
    zIndex: 9999,
    animation: '$slideIn 0.2s ease-out',
  },
  iconSuccess: { display: 'flex', color: theme.colors.success },
  iconError: { display: 'flex', color: theme.colors.danger },
  '@keyframes slideIn': {
    from: { opacity: 0, transform: 'translateY(0.4rem)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
}));
