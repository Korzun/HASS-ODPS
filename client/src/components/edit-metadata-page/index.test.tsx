import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../../test-utils';
import { EditMetadataPage } from './index';
import type { Book } from '../../types';
import { getBook, patchBookMetadata } from '../../api/books';

vi.mock('../../api/books', () => ({ getBook: vi.fn(), patchBookMetadata: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'b1', title: 'Dune', author: 'Frank Herbert', fileAs: 'Herbert, Frank',
    publisher: 'Chilton Books', series: '', seriesIndex: 0,
    subjects: ['Science Fiction'], identifiers: [],
    hasCover: false, size: 1_000_000, addedAt: '2024-01-01T00:00:00.000Z',
    description: 'A desert planet.', ...overrides,
  };
}

function renderEdit(isAdmin = true) {
  return renderWithProviders(
    <Routes>
      <Route path="/books/:id/edit" element={<EditMetadataPage />} />
      <Route path="/books/:id" element={<div data-testid="detail" />} />
      <Route path="/" element={<div data-testid="home" />} />
    </Routes>,
    {
      initialEntries: ['/books/b1/edit'],
      user: { username: isAdmin ? 'admin' : '', isAdmin },
    }
  );
}

it('redirects to / when not admin', async () => {
  renderEdit(false);
  await waitFor(() => expect(screen.getByTestId('home')).toBeInTheDocument());
});

it('renders form fields populated from book data', async () => {
  vi.mocked(getBook).mockResolvedValue(makeBook());
  renderEdit();
  await waitFor(() => expect(screen.getByDisplayValue('Dune')).toBeInTheDocument());
  expect(screen.getByDisplayValue('Frank Herbert')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Herbert, Frank')).toBeInTheDocument();
});

it('shows error message when save fails', async () => {
  const u = userEvent.setup();
  vi.mocked(getBook).mockResolvedValue(makeBook());
  vi.mocked(patchBookMetadata).mockRejectedValue(new Error('Server error'));
  renderEdit();
  await waitFor(() => expect(screen.getByDisplayValue('Dune')).toBeInTheDocument());
  await u.click(screen.getByRole('button', { name: /^save$/i }));
  await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument());
});

it('calls patchBookMetadata with only changed fields', async () => {
  const u = userEvent.setup();
  vi.mocked(getBook).mockResolvedValue(makeBook());
  vi.mocked(patchBookMetadata).mockResolvedValue(makeBook({ title: 'New Title' }));
  renderEdit();
  await waitFor(() => expect(screen.getByDisplayValue('Dune')).toBeInTheDocument());

  const titleInput = screen.getByDisplayValue('Dune');
  await u.clear(titleInput);
  await u.type(titleInput, 'New Title');

  await u.click(screen.getByRole('button', { name: /^save$/i }));

  await waitFor(() => expect(patchBookMetadata).toHaveBeenCalled());
  const fd = vi.mocked(patchBookMetadata).mock.calls[0][1] as FormData;
  expect(fd.get('title')).toBe('New Title');
  expect(fd.get('author')).toBeNull();
});
