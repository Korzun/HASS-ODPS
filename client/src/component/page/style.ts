import { createUseStyles } from '../../provider/theme';
import type { Theme } from '../../provider/theme';

export type PageTypeValue = 'default' | 'minimal';
export enum PageType {
  default = 'default',
  minimal = 'minimal',
}

export const useStyle = createUseStyles((theme: Theme) => ({
  '@global': {
    body: {
      fontFamily: 'system-ui, sans-serif',
      background: theme.colors.bg.page,
      color: theme.colors.text.primary,
      minHeight: '100vh',
    },
  },
  [PageType.default]: {
    maxWidth: 800,
    margin: '2rem auto',
    padding: '0 1rem',
  },
  [PageType.minimal]: {},
}));
