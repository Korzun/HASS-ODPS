import { createUseStyles, type Theme } from '~/provider/theme';

export const useStyle = createUseStyles((theme: Theme) => ({
  title: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.75rem',
  },
  chevron: {
    position: 'relative',
    top: '4.5px',
    left: '1.5px',
    display: 'block',
    height: '20px',
    width: '20px',
    margin: '-6px',
    transition: 'transform 0.3s linear',
  },
  collapsed: {
    transform: 'rotate(0deg)',
  },
  expanded: {
    transform: 'rotate(90deg)',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.1rem',
  },
  username: {
    color: '#FF4D4F',
    fontWeight: 800,
  },
  undone: {
    fontWeight: 800,
  },
}));
