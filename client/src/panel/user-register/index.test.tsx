import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { registerUser } from '../../api/users';
import { renderWithProviders } from '../../test-utils';

import { UserRegisterPanel } from './index';

vi.mock('../../api/users', () => ({
  registerUser: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

it('renders username input, password input, and register button', () => {
  renderWithProviders(<UserRegisterPanel />);
  expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
});

it('shows validation error when submitted with empty fields', async () => {
  const user = userEvent.setup();
  renderWithProviders(<UserRegisterPanel />);
  await user.click(screen.getByRole('button', { name: 'Register' }));
  expect(screen.getByText(/username and password are required/i)).toBeInTheDocument();
});

it('clears the form on successful registration', async () => {
  const u = userEvent.setup();
  vi.mocked(registerUser).mockResolvedValue(undefined);
  renderWithProviders(<UserRegisterPanel />);
  await u.type(screen.getByPlaceholderText('Username'), 'alice');
  await u.type(screen.getByPlaceholderText('Password'), 'secret');
  await u.click(screen.getByRole('button', { name: 'Register' }));
  expect(screen.getByPlaceholderText('Username')).toHaveValue('');
  expect(screen.getByPlaceholderText('Password')).toHaveValue('');
});

it('shows "already taken" message when registerUser throws that error', async () => {
  const u = userEvent.setup();
  vi.mocked(registerUser).mockRejectedValue(new Error('Username already taken'));
  renderWithProviders(<UserRegisterPanel />);
  await u.type(screen.getByPlaceholderText('Username'), 'alice');
  await u.type(screen.getByPlaceholderText('Password'), 'secret');
  await u.click(screen.getByRole('button', { name: 'Register' }));
  await waitFor(() => expect(screen.getByText(/username already taken/i)).toBeInTheDocument());
});
