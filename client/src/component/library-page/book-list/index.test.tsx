import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils';
import { BookList } from './index';
import type { Book } from '../../../types';

vi.mock('../series-row', () => ({
  SeriesRow: ({ seriesName }: { seriesName: string }) => (
    <div data-testid="series-row" data-series={seriesName} />
  ),
}));

vi.mock('../standalone-section', () => ({
  StandaloneSection: ({ books }: { books: Book[] }) => (
    <div data-testid="standalone-section" data-count={String(books.length)} />
  ),
}));

function makeBook(overrides: Partial<Book>): Book {
  return {
    id: 'b1',
    title: 'Book',
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
    ...overrides,
  };
}

const noop = () => {};

it('shows empty message when books array is empty', () => {
  renderWithProviders(
    <BookList
      books={[]}
      progressMap={new Map()}
      isAdmin={false}
      onDelete={noop}
      onClearProgress={noop}
      onBookClick={noop}
      onSeriesClick={noop}
    />
  );
  expect(screen.getByText(/no books yet/i)).toBeInTheDocument();
});

it('renders a SeriesRow for a book with a series', () => {
  const book = makeBook({ id: 'b1', series: 'Dune', seriesIndex: 1 });
  renderWithProviders(
    <BookList
      books={[book]}
      progressMap={new Map()}
      isAdmin={false}
      onDelete={noop}
      onClearProgress={noop}
      onBookClick={noop}
      onSeriesClick={noop}
    />
  );
  expect(screen.getByTestId('series-row')).toBeInTheDocument();
  expect(screen.queryByTestId('standalone-section')).not.toBeInTheDocument();
});

it('renders StandaloneSection for books without a series', () => {
  const book = makeBook({ id: 'b1', series: '' });
  renderWithProviders(
    <BookList
      books={[book]}
      progressMap={new Map()}
      isAdmin={false}
      onDelete={noop}
      onClearProgress={noop}
      onBookClick={noop}
      onSeriesClick={noop}
    />
  );
  expect(screen.getByTestId('standalone-section')).toBeInTheDocument();
  expect(screen.queryByTestId('series-row')).not.toBeInTheDocument();
});

it('renders both SeriesRow and StandaloneSection for mixed books', () => {
  const books = [
    makeBook({ id: 'b1', series: 'Dune', seriesIndex: 1 }),
    makeBook({ id: 'b2', series: '' }),
  ];
  renderWithProviders(
    <BookList
      books={books}
      progressMap={new Map()}
      isAdmin={false}
      onDelete={noop}
      onClearProgress={noop}
      onBookClick={noop}
      onSeriesClick={noop}
    />
  );
  expect(screen.getByTestId('series-row')).toBeInTheDocument();
  expect(screen.getByTestId('standalone-section')).toBeInTheDocument();
});

it('renders one SeriesRow per unique series name', () => {
  const books = [
    makeBook({ id: 'b1', series: 'Dune', seriesIndex: 1 }),
    makeBook({ id: 'b2', series: 'Dune', seriesIndex: 2 }),
    makeBook({ id: 'b3', series: 'Foundation', seriesIndex: 1 }),
  ];
  renderWithProviders(
    <BookList
      books={books}
      progressMap={new Map()}
      isAdmin={false}
      onDelete={noop}
      onClearProgress={noop}
      onBookClick={noop}
      onSeriesClick={noop}
    />
  );
  expect(screen.getAllByTestId('series-row')).toHaveLength(2);
});
