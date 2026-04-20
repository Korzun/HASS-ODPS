import { screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../../test-utils';
import { BookDetailPage } from './index';
import type { Book } from '../../types';
import { getBook } from '../../api/books';

vi.mock('../../api/books', () => ({ getBook: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'b1', title: 'Dune', author: 'Frank Herbert', fileAs: 'Herbert, Frank',
    publisher: 'Chilton Books', series: '', seriesIndex: 0, subjects: ['Science Fiction'],
    identifiers: [{ scheme: 'isbn', value: '0-441-17271-7' }],
    hasCover: false, size: 1_200_000, addedAt: '2024-01-01T00:00:00.000Z',
    description: 'A desert planet epic.', ...overrides,
  };
}

function renderDetail(id = 'b1', isAdmin = false) {
  return renderWithProviders(
    <Routes>
      <Route path="/books/:id" element={<BookDetailPage />} />
      <Route path="/" element={<div data-testid="home" />} />
    </Routes>,
    { initialEntries: [`/books/${id}`], user: { username: isAdmin ? 'admin' : '', isAdmin } }
  );
}

it('shows book title and author after loading', async () => {
  vi.mocked(getBook).mockResolvedValue(makeBook());
  renderDetail();
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Dune' })).toBeInTheDocument());
  expect(screen.getByText('Frank Herbert')).toBeInTheDocument();
});

it('shows "Book not found." when API fails', async () => {
  vi.mocked(getBook).mockRejectedValue(new Error('not found'));
  renderDetail();
  await waitFor(() => expect(screen.getByText('Book not found.')).toBeInTheDocument());
});

it('shows series name when book belongs to a series', async () => {
  vi.mocked(getBook).mockResolvedValue(makeBook({ series: 'Dune', seriesIndex: 1 }));
  renderDetail();
  await waitFor(() => expect(screen.getByText(/Dune #1/)).toBeInTheDocument());
});

it('shows Edit Metadata button for admin only', async () => {
  vi.mocked(getBook).mockResolvedValue(makeBook());
  renderDetail('b1', false);
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Dune' })).toBeInTheDocument());
  expect(screen.queryByRole('button', { name: /edit metadata/i })).not.toBeInTheDocument();

  vi.mocked(getBook).mockResolvedValue(makeBook());
  renderDetail('b1', true);
  await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Dune' }).length).toBeGreaterThan(0));
  expect(screen.getByRole('button', { name: /edit metadata/i })).toBeInTheDocument();
});
