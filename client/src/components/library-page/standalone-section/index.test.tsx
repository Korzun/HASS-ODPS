import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test-utils';
import { StandaloneSection } from './index';
import type { Book } from '../../../types';

vi.mock('../../shared/book-card', () => ({
  BookCard: ({ book }: { book: Book }) => (
    <div data-testid="book-card" data-id={book.id} />
  ),
}));

function makeBook(id: string): Book {
  return {
    id,
    title: `Book ${id}`,
    author: 'Author',
    fileAs: 'Author',
    publisher: '',
    series: '',
    seriesIndex: 0,
    subjects: [],
    identifiers: [],
    hasCover: false,
    size: 1000,
    addedAt: '2024-01-01T00:00:00.000Z',
  };
}

const noop = () => {};
const books = [makeBook('a'), makeBook('b')];

it('renders book count in header', () => {
  renderWithProviders(
    <StandaloneSection
      books={books}
      progressMap={new Map()}
      isAdmin={false}
      onDelete={noop}
      onClearProgress={noop}
      onBookClick={noop}
    />
  );
  expect(screen.getByText(/2 books/)).toBeInTheDocument();
});

it('renders a BookCard for each book', () => {
  renderWithProviders(
    <StandaloneSection
      books={books}
      progressMap={new Map()}
      isAdmin={false}
      onDelete={noop}
      onClearProgress={noop}
      onBookClick={noop}
    />
  );
  expect(screen.getAllByTestId('book-card')).toHaveLength(2);
});

it('collapses book list on header click', async () => {
  const user = userEvent.setup();
  renderWithProviders(
    <StandaloneSection
      books={books}
      progressMap={new Map()}
      isAdmin={false}
      onDelete={noop}
      onClearProgress={noop}
      onBookClick={noop}
    />
  );
  expect(screen.getAllByTestId('book-card')).toHaveLength(2);
  await user.click(screen.getByText(/standalone books/i));
  expect(screen.queryByTestId('book-card')).not.toBeInTheDocument();
});

it('expands again on second header click', async () => {
  const user = userEvent.setup();
  renderWithProviders(
    <StandaloneSection
      books={books}
      progressMap={new Map()}
      isAdmin={false}
      onDelete={noop}
      onClearProgress={noop}
      onBookClick={noop}
    />
  );
  await user.click(screen.getByText(/standalone books/i));
  await user.click(screen.getByText(/standalone books/i));
  expect(screen.getAllByTestId('book-card')).toHaveLength(2);
});
