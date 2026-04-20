import { render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from './theme-provider';

function TokenDisplay() {
  const theme = useTheme();
  return (
    <div>
      <span data-testid="primary">{theme.colors.primary}</span>
      <span data-testid="success">{theme.colors.success}</span>
      <span data-testid="radius-sm">{theme.borderRadius.sm}</span>
      <span data-testid="shadow-card">{theme.shadows.card}</span>
    </div>
  );
}

it('provides theme tokens to children', () => {
  render(
    <ThemeProvider>
      <TokenDisplay />
    </ThemeProvider>
  );
  expect(screen.getByTestId('primary').textContent).toBe('#1e40af');
  expect(screen.getByTestId('success').textContent).toBe('#16a34a');
  expect(screen.getByTestId('radius-sm').textContent).toBe('4px');
  expect(screen.getByTestId('shadow-card').textContent).toBe('0 1px 3px rgba(0,0,0,.07)');
});
