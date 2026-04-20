import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../test-utils';
import { UserRow } from './index';
import type { Book, User } from '../../../../types';
import { getUserProgress, deleteUser } from '../../../../api/users';

vi.mock('../../../../api/users', () => ({
  getUserProgress: vi.fn(),
  deleteUser: vi.fn(),
  deleteUserProgress: vi.fn(),
}));

afterEach(() => vi.unstubAllGlobals());
beforeEach(() => vi.clearAllMocks());

function makeUser(username: string, progressCount = 0): User {
  return { username, progressCount };
}

function makeBook(id: string, title: string): Book {
  return {
    id, title, author: 'Author', fileAs: 'Author', publisher: '',
    series: '', seriesIndex: 0, subjects: [], identifiers: [],
    hasCover: false, size: 1000, addedAt: '2024-01-01T00:00:00.000Z',
  };
}

const noop = () => {};

it('renders the username and progress count', () => {
  renderWithProviders(
    <UserRow user={makeUser('alice', 3)} books={[]} onDelete={noop} onProgressCleared={noop} />
  );
  expect(screen.getByText('alice')).toBeInTheDocument();
  expect(screen.getByText('3 synced')).toBeInTheDocument();
});

it('fetches and shows progress items when expanded', async () => {
  const u = userEvent.setup();
  vi.mocked(getUserProgress).mockResolvedValue([
    { document: 'doc-1', percentage: 0.5 },
  ]);
  renderWithProviders(
    <UserRow user={makeUser('alice')} books={[]} onDelete={noop} onProgressCleared={noop} />
  );
  await u.click(screen.getByText('alice'));
  await waitFor(() => expect(screen.getByText('doc-1')).toBeInTheDocument());
  expect(screen.getByText('50%')).toBeInTheDocument();
});

it('shows book title when a matching book is found in books prop', async () => {
  const u = userEvent.setup();
  vi.mocked(getUserProgress).mockResolvedValue([
    { document: 'epub-1', percentage: 0.75 },
  ]);
  const books = [makeBook('epub-1', 'Dune')];
  renderWithProviders(
    <UserRow user={makeUser('alice')} books={books} onDelete={noop} onProgressCleared={noop} />
  );
  await u.click(screen.getByText('alice'));
  await waitFor(() => expect(screen.getByText('Dune')).toBeInTheDocument());
});

it('collapses the progress list when header is clicked a second time', async () => {
  const u = userEvent.setup();
  vi.mocked(getUserProgress).mockResolvedValue([]);
  renderWithProviders(
    <UserRow user={makeUser('alice')} books={[]} onDelete={noop} onProgressCleared={noop} />
  );
  await u.click(screen.getByText('alice'));
  await waitFor(() => expect(screen.getByText('No progress records.')).toBeInTheDocument());
  await u.click(screen.getByText('alice'));
  expect(screen.queryByText('No progress records.')).not.toBeInTheDocument();
});

it('calls onDelete after confirming user deletion', async () => {
  const u = userEvent.setup();
  vi.stubGlobal('confirm', () => true);
  vi.mocked(deleteUser).mockResolvedValue(undefined);
  const handleDelete = vi.fn();
  renderWithProviders(
    <UserRow user={makeUser('alice')} books={[]} onDelete={handleDelete} onProgressCleared={noop} />
  );
  await u.click(screen.getByRole('button', { name: /delete user alice/i }));
  await waitFor(() => expect(handleDelete).toHaveBeenCalledWith('alice'));
});
