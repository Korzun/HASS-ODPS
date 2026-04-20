import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test-utils';
import { BookCard } from './index';
import type { Book } from '../../../types';

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'book-1',
    title: 'Dune',
    author: 'Frank Herbert',
    fileAs: 'Herbert, Frank',
    publisher: 'Chilton',
    series: 'Dune',
    seriesIndex: 1,
    subjects: [],
    identifiers: [],
    hasCover: false,
    size: 1_048_576,
    addedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const noop = () => {};

it('renders the book title', () => {
  renderWithProviders(
    <BookCard book={makeBook()} progress={undefined} isAdmin={false}
      onDelete={noop} onClearProgress={noop} onClick={noop} />
  );
  expect(screen.getByText('Dune')).toBeInTheDocument();
});

it('shows a cover img when hasCover is true', () => {
  renderWithProviders(
    <BookCard book={makeBook({ id: 'b1', hasCover: true })} progress={undefined}
      isAdmin={false} onDelete={noop} onClearProgress={noop} onClick={noop} />
  );
  expect(screen.getByRole('img')).toHaveAttribute('src', '/api/books/b1/cover');
});

it('shows formatted file size', () => {
  renderWithProviders(
    <BookCard book={makeBook({ size: 1_048_576 })} progress={undefined}
      isAdmin={false} onDelete={noop} onClearProgress={noop} onClick={noop} />
  );
  expect(screen.getByText(/1\.0 MB/)).toBeInTheDocument();
});

it('shows progress percentage when provided', () => {
  renderWithProviders(
    <BookCard book={makeBook()} progress={0.75} isAdmin={false}
      onDelete={noop} onClearProgress={noop} onClick={noop} />
  );
  expect(screen.getByText('75%')).toBeInTheDocument();
});

it('does not show progress text when undefined', () => {
  renderWithProviders(
    <BookCard book={makeBook()} progress={undefined} isAdmin={false}
      onDelete={noop} onClearProgress={noop} onClick={noop} />
  );
  expect(screen.queryByText(/%/)).not.toBeInTheDocument();
});

it('shows delete button for admin', () => {
  renderWithProviders(
    <BookCard book={makeBook()} progress={undefined} isAdmin={true}
      onDelete={noop} onClearProgress={noop} onClick={noop} />
  );
  expect(screen.getByTitle('Delete')).toBeInTheDocument();
});

it('hides delete button for non-admin', () => {
  renderWithProviders(
    <BookCard book={makeBook()} progress={undefined} isAdmin={false}
      onDelete={noop} onClearProgress={noop} onClick={noop} />
  );
  expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
});

it('shows clear button for non-admin when progress exists', () => {
  renderWithProviders(
    <BookCard book={makeBook()} progress={0.5} isAdmin={false}
      onDelete={noop} onClearProgress={noop} onClick={noop} />
  );
  expect(screen.getByTitle('Clear reading status')).toBeInTheDocument();
});

it('hides clear button when no progress', () => {
  renderWithProviders(
    <BookCard book={makeBook()} progress={undefined} isAdmin={false}
      onDelete={noop} onClearProgress={noop} onClick={noop} />
  );
  expect(screen.queryByTitle('Clear reading status')).not.toBeInTheDocument();
});

it('calls onClick with book id when card is clicked', async () => {
  const user = userEvent.setup();
  const handleClick = vi.fn();
  renderWithProviders(
    <BookCard book={makeBook({ id: 'b2' })} progress={undefined} isAdmin={false}
      onDelete={noop} onClearProgress={noop} onClick={handleClick} />
  );
  await user.click(screen.getByText('Dune'));
  expect(handleClick).toHaveBeenCalledWith('b2');
});

it('calls onDelete and does not trigger onClick when delete button is clicked', async () => {
  const user = userEvent.setup();
  const handleDelete = vi.fn();
  const handleClick = vi.fn();
  renderWithProviders(
    <BookCard book={makeBook({ id: 'b3', title: 'Dune' })} progress={undefined}
      isAdmin={true} onDelete={handleDelete} onClearProgress={noop} onClick={handleClick} />
  );
  await user.click(screen.getByTitle('Delete'));
  expect(handleDelete).toHaveBeenCalledWith('b3', 'Dune');
  expect(handleClick).not.toHaveBeenCalled();
});

it('calls onClearProgress and does not trigger onClick when clear button is clicked', async () => {
  const user = userEvent.setup();
  const handleClear = vi.fn();
  const handleClick = vi.fn();
  renderWithProviders(
    <BookCard book={makeBook({ id: 'b4' })} progress={0.5} isAdmin={false}
      onDelete={noop} onClearProgress={handleClear} onClick={handleClick} />
  );
  await user.click(screen.getByTitle('Clear reading status'));
  expect(handleClear).toHaveBeenCalledWith('b4');
  expect(handleClick).not.toHaveBeenCalled();
});
