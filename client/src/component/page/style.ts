import { createUseStyles, type Theme } from '~/provider/theme';

export type PageTypeValue = 'default' | 'minimal';
export enum PageType {
  default = 'default',
  minimal = 'minimal',
}

export const useStyle = createUseStyles((theme: Theme) => ({
  '@global': {
    body: {
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: theme.colors.bg.page,
      color: theme.colors.text.primary,
      minHeight: '100vh',
    },
  },
  [PageType.default]: {
    maxWidth: 800,
    margin: '2rem auto',
    padding: '0 1rem',
    display: 'flex',
    gap: '0.875rem',
    flexDirection: 'column',
  },
  [PageType.minimal]: {},
  noise: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0.2,
    pointerEvents: 'none',
    zIndex: -1,
  },
}));
