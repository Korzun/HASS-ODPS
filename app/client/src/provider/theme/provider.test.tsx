import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Context } from './context';
import { ThemeProvider } from './provider';

// Controllable matchMedia: tests set `current.matches` and fire change listeners.
const current = { matches: false, listeners: new Set<(e: { matches: boolean }) => void>() };
function installMatchMedia() {
  current.matches = false;
  current.listeners.clear();
  window.matchMedia = ((query: string) => ({
    get matches() {
      return current.matches;
    },
    media: query,
    onchange: null,
    addEventListener: (_: string, cb: (e: { matches: boolean }) => void) =>
      current.listeners.add(cb),
    removeEventListener: (_: string, cb: (e: { matches: boolean }) => void) =>
      current.listeners.delete(cb),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
function setSystemDark(matches: boolean) {
  current.matches = matches;
  act(() => current.listeners.forEach((cb) => cb({ matches })));
}

// Probe renders the resolved mode from context so assertions are simple.
const Probe = () => {
  return (
    <Context.Consumer>
      {({ resolvedMode, setting, setSetting }) => (
        <div>
          <span data-testid="mode">{resolvedMode}</span>
          <span data-testid="setting">{setting}</span>
          <button onClick={() => setSetting('dark')}>go dark</button>
        </div>
      )}
    </Context.Consumer>
  );
};

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    installMatchMedia();
  });
  afterEach(() => localStorage.clear());

  it('defaults to auto and follows the OS (light)', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByTestId('setting')).toHaveTextContent('auto');
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
  });

  it('auto resolves to dark when the OS is dark', () => {
    current.matches = true;
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
  });

  it('auto updates live when the OS theme changes', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    setSystemDark(true);
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
  });

  it('persists an explicit choice and ignores the OS', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    await user.click(screen.getByText('go dark'));
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(localStorage.getItem('theme-setting')).toBe('dark');

    unmount();
    installMatchMedia(); // OS = light
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByTestId('setting')).toHaveTextContent('dark');
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
  });
});
