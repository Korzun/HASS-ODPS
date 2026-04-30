import { screen } from '@testing-library/react';

import { renderWithProviders } from '../../test-utils';

import { Header } from './index';

it('renders the app title', () => {
  renderWithProviders(<Header />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('HASS-ODPS Library');
});

it('displays the username from auth context', () => {
  renderWithProviders(<Header />, { user: { username: 'alice', isAdmin: false } });
  expect(screen.getByText('alice')).toBeInTheDocument();
});

it('renders a sign-out button', () => {
  renderWithProviders(<Header />);
  expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
});

it('renders with empty username when no user is signed in', () => {
  renderWithProviders(<Header />);
  // default user has username: '' — component should not crash
  const span = document.querySelector('span');
  expect(span).toBeInTheDocument();
  expect(span!.textContent).toBe('');
});
