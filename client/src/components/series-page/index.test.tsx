import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../../test-utils';
import { SeriesPage } from './index';
import type { Book } from '../../types';
import { getBooks } from '../../api/books';
import { getMyProgress } from '../../api/progress';

vi.mock('../../api/books', () => ({ getBooks: vi.fn() }));
vi.mock('../../api/progress', () => ({ getMyProgress: vi.fn(), deleteMyProgress: vi.fn() }));
vi.mock('./cover-stack', () => ({
  CoverStack: () => <div data-testid="cover-stack" />,
  HERO_STACK_OFFSETS: [],
}));
vi.mock('../shared/book-card', () => ({
  BookCard: ({ book, progress }: { book: Book; progress?: number }) => (
    <div data-testid="book-card">
      {book.title}
      {progress != null && <span>{Math.round(progress * 100)}%</span>}
    </div>
  ),
}));

beforeEach(() => vi.clearAllMocks());

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'b1', title: 'Dune', author: 'Frank Herbert', fileAs: 'Herbert, Frank',
    publisher: '', series: 'Dune', seriesIndex: 1, subjects: [], identifiers: [],
    hasCover: false, size: 1000, addedAt: '2024-01-01T00:00:00.000Z', ...overrides,
  };
}

function renderSeries(name = 'Dune') {
  return renderWithProviders(
    <Routes>
      <Route path="/series/:name" element={<SeriesPage />} />
      <Route path="/" element={<div data-testid="home" />} />
    </Routes>,
    { initialEntries: [`/series/${name}`] }
  );
}

it('renders series title and book count', async () => {
  vi.mocked(getBooks).mockResolvedValue([
    makeBook({ id: 'b1', seriesIndex: 1 }),
    makeBook({ id: 'b2', seriesIndex: 2 }),
  ]);
  vi.mocked(getMyProgress).mockResolvedValue([]);
  renderSeries();
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Dune' })).toBeInTheDocument());
  expect(screen.getByText(/2 books/)).toBeInTheDocument();
});

it('shows "Series not found." when no books match', async () => {
  vi.mocked(getBooks).mockResolvedValue([]);
  vi.mocked(getMyProgress).mockResolvedValue([]);
  renderSeries();
  await waitFor(() => expect(screen.getByText('Series not found.')).toBeInTheDocument());
});

it('navigates to / when back button is clicked', async () => {
  const user = userEvent.setup();
  vi.mocked(getBooks).mockResolvedValue([makeBook()]);
  vi.mocked(getMyProgress).mockResolvedValue([]);
  renderSeries();
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Dune' })).toBeInTheDocument());
  await user.click(screen.getByRole('button', { name: /library/i }));
  expect(screen.getByTestId('home')).toBeInTheDocument();
});

it('shows progress percentage on book cards', async () => {
  vi.mocked(getBooks).mockResolvedValue([makeBook({ id: 'b1' })]);
  vi.mocked(getMyProgress).mockResolvedValue([{ document: 'b1', percentage: 0.75 }]);
  renderSeries();
  await waitFor(() => expect(screen.getByText('75%')).toBeInTheDocument());
});
