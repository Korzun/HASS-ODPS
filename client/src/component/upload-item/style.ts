import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  inner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
    gap: '0.25rem',
  },
  filename: {
    fontSize: theme.text.size.md,
    color: theme.colors.text.primary,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  progressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    flexGrow: 1,
  },

  icon: {
    lineHeight: 0,
    '& svg': {
      height: '15px',
      width: '15px',
    },
    '&$queued': {
      color: theme.colors.text.faint,
    },
    '&$uploading': {
      color: '#1777FF',
      animation: '$rotation 1s infinite linear',
    },
    '&$done': {
      color: theme.colors.success,
    },
    '&$error': {
      color: theme.colors.danger,
    },
  },
  labelContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },
  leftLabel: {
    fontSize: theme.text.size.md,
    flexGrow: 1,
    textTransform: 'capitalize',
    '&$queued': {
      color: theme.colors.text.faint,
    },
    '&$uploading': {
      color: '#1777FF',
      '& svg': {
        animation: '$rotation 1s infinite linear',
      },
    },
    '&$done': {
      color: theme.colors.success,
    },
    '&$error': {
      color: theme.colors.danger,
    },
  },
  rightLabel: {
    fontSize: theme.text.size.sm,
    color: theme.colors.text.faint,
    whiteSpace: 'nowrap',
    textAlign: 'right',
    '&$error': {
      color: theme.colors.danger,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: '12rem',
    },
  },
  barTrack: {
    flex: 1,
    height: '0.5rem',
    background: theme.colors.borderLight,
    borderRadius: '0.5rem',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '2px',
    '&$queued': {
      width: '0%',
    },
    '&$uploading': {
      background: '#1777FF',
      transition: 'width 0.1s ease',
    },
    '&$done': {
      background: theme.colors.success,
    },
    '&$error': {
      background: theme.colors.danger,
    },
  },
  queued: {},
  uploading: {},
  done: {},
  error: {},
  '@keyframes rotation': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
}));
