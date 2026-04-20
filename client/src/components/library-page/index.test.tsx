import { act, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils';
import { LibraryPage } from './index';
import { getBooks } from '../../api/books';
import { getMyProgress } from '../../api/progress';
import type { TabName } from '../tab-bar';

vi.mock('../tab-bar', () => ({
  TabBar: ({ onTabChange }: { active: TabName; onTabChange: (t: TabName) => void }) => (
    <div data-testid="tab-bar" onClick={() => onTabChange('users')} />
  ),
}));
vi.mock('./upload-zone', () => ({
  UploadZone: () => <div data-testid="upload-zone" />,
}));
vi.mock('./book-list', () => ({
  BookList: () => <div data-testid="book-list" />,
}));
vi.mock('./users-panel', () => ({
  UsersPanel: () => <div data-testid="users-panel" />,
}));
vi.mock('../../api/books', () => ({
  getBooks: vi.fn(),
  deleteBook: vi.fn(),
}));
vi.mock('../../api/progress', () => ({
  getMyProgress: vi.fn(),
  deleteMyProgress: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getBooks).mockResolvedValue([]);
  vi.mocked(getMyProgress).mockResolvedValue([]);
});

it('shows loading state initially', () => {
  vi.mocked(getBooks).mockReturnValue(new Promise(() => {}));
  renderWithProviders(<LibraryPage />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});

it('renders upload-zone and book-list after data loads', async () => {
  renderWithProviders(<LibraryPage />);
  await waitFor(() => expect(screen.getByTestId('book-list')).toBeInTheDocument());
  expect(screen.getByTestId('upload-zone')).toBeInTheDocument();
});

it('shows users-panel when users tab is clicked', async () => {
  renderWithProviders(
    <LibraryPage />,
    { user: { username: 'admin', isAdmin: true } }
  );
  await waitFor(() => expect(screen.getByTestId('tab-bar')).toBeInTheDocument());
  act(() => {
    screen.getByTestId('tab-bar').click();
  });
  expect(screen.getByTestId('users-panel')).toBeInTheDocument();
  expect(screen.queryByTestId('book-list')).not.toBeInTheDocument();
});

it('does not call getMyProgress for admin users', async () => {
  renderWithProviders(
    <LibraryPage />,
    { user: { username: 'admin', isAdmin: true } }
  );
  await waitFor(() => expect(screen.getByTestId('book-list')).toBeInTheDocument());
  expect(vi.mocked(getMyProgress)).not.toHaveBeenCalled();
});
