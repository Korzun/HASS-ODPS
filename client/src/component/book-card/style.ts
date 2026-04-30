import { createUseStyles } from '../../provider/theme';
import type { Theme } from '../../provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: '.75rem',
  },
  cover: {
    flexShrink: 0,
    borderRadius: theme.borderRadius.sm,
  },
  coverImg: {
    width: 40,
    height: 56,
    objectFit: 'cover',
    borderRadius: 2,
    display: 'block',
  },
  coverPlaceholder: {
    width: 40,
    height: 56,
    background: '#e0e0e0',
    borderRadius: 2,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontWeight: 500,
    marginBottom: '.125rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  meta: {
    fontSize: '.75rem',
    color: theme.colors.text.muted,
    marginBottom: '.1rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  format: {
    fontSize: '.75rem',
    color: theme.colors.text.faint,
  },
  progress: {
    fontSize: '.75rem',
    color: theme.colors.success,
    fontWeight: 500,
    marginRight: '.25rem',
    flexShrink: 0,
  },
}));
