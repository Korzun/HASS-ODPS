import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../test-utils';
import { RegisterUserForm } from './index';
import { registerUser } from '../../../../api/users';

vi.mock('../../../../api/users', () => ({
  registerUser: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

it('renders username input, password input, and register button', () => {
  renderWithProviders(<RegisterUserForm onSuccess={() => {}} />);
  expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
});

it('shows validation error when submitted with empty fields', async () => {
  const user = userEvent.setup();
  renderWithProviders(<RegisterUserForm onSuccess={() => {}} />);
  await user.click(screen.getByRole('button', { name: 'Register' }));
  expect(screen.getByText(/username and password are required/i)).toBeInTheDocument();
});

it('clears the form and calls onSuccess on successful registration', async () => {
  const u = userEvent.setup();
  vi.mocked(registerUser).mockResolvedValue(undefined);
  const onSuccess = vi.fn();
  renderWithProviders(<RegisterUserForm onSuccess={onSuccess} />);
  await u.type(screen.getByPlaceholderText('Username'), 'alice');
  await u.type(screen.getByPlaceholderText('Password'), 'secret');
  await u.click(screen.getByRole('button', { name: 'Register' }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  expect(screen.getByPlaceholderText('Username')).toHaveValue('');
  expect(screen.getByPlaceholderText('Password')).toHaveValue('');
});

it('shows "already taken" message when registerUser throws that error', async () => {
  const u = userEvent.setup();
  vi.mocked(registerUser).mockRejectedValue(new Error('Username already taken'));
  renderWithProviders(<RegisterUserForm onSuccess={() => {}} />);
  await u.type(screen.getByPlaceholderText('Username'), 'alice');
  await u.type(screen.getByPlaceholderText('Password'), 'secret');
  await u.click(screen.getByRole('button', { name: 'Register' }));
  await waitFor(() =>
    expect(screen.getByText(/username already taken/i)).toBeInTheDocument()
  );
});
