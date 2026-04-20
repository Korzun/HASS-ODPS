import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test-utils';
import { UsersPanel } from './index';
import { getUsers } from '../../../api/users';
import type { User } from '../../../types';

vi.mock('./register-user-form', () => ({
  RegisterUserForm: ({ onSuccess }: { onSuccess: () => void }) => (
    <button data-testid="reg-success" onClick={onSuccess} />
  ),
}));
vi.mock('./user-row', () => ({
  UserRow: ({ user }: { user: User }) => (
    <div data-testid="user-row" data-username={user.username} />
  ),
}));
vi.mock('../../../api/users', () => ({
  getUsers: vi.fn(),
  deleteUser: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getUsers).mockResolvedValue([]);
});

it('shows loading state initially', () => {
  vi.mocked(getUsers).mockReturnValue(new Promise(() => {}));
  renderWithProviders(<UsersPanel books={[]} />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});

it('renders a UserRow per user after data loads', async () => {
  vi.mocked(getUsers).mockResolvedValue([
    { username: 'alice', progressCount: 2 },
    { username: 'bob', progressCount: 0 },
  ]);
  renderWithProviders(<UsersPanel books={[]} />);
  await waitFor(() => expect(screen.getAllByTestId('user-row')).toHaveLength(2));
});

it('shows empty state when no users are registered', async () => {
  vi.mocked(getUsers).mockResolvedValue([]);
  renderWithProviders(<UsersPanel books={[]} />);
  await waitFor(() => expect(screen.getByText(/no kosync users/i)).toBeInTheDocument());
});

it('re-fetches users when RegisterUserForm fires onSuccess', async () => {
  const u = userEvent.setup();
  vi.mocked(getUsers).mockResolvedValue([]);
  renderWithProviders(<UsersPanel books={[]} />);
  await waitFor(() => expect(screen.getByTestId('reg-success')).toBeInTheDocument());
  await u.click(screen.getByTestId('reg-success'));
  expect(vi.mocked(getUsers)).toHaveBeenCalledTimes(2);
});
