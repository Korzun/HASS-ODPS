import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  root: {
    backgroundColor: '#FAFAFA',
    padding: '6px',
    borderRadius: '10px',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: '#DDDDDD',
  },
  clickable: {
    cursor: 'pointer',
  },
}));
