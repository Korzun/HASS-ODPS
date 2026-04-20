import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test-utils';
import { SeriesRow } from './index';
import type { Book } from '../../../types';

vi.mock('../../series-page/cover-stack', () => ({
  CoverStack: () => <div data-testid="cover-stack" />,
  LIST_STACK_OFFSETS: [],
}));

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'b1',
    title: 'Dune',
    author: 'Frank Herbert',
    fileAs: 'Herbert, Frank',
    publisher: '',
    series: 'Dune',
    seriesIndex: 1,
    subjects: [],
    identifiers: [],
    hasCover: false,
    size: 1000,
    addedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const books = [makeBook({ id: 'b1', seriesIndex: 1 }), makeBook({ id: 'b2', seriesIndex: 2 })];

it('renders the series name', () => {
  renderWithProviders(
    <SeriesRow seriesName="Dune" books={books} progressMap={new Map()} onClick={() => {}} />
  );
  expect(screen.getByText('Dune')).toBeInTheDocument();
});

it('renders the author from the first book', () => {
  renderWithProviders(
    <SeriesRow seriesName="Dune" books={books} progressMap={new Map()} onClick={() => {}} />
  );
  expect(screen.getByText(/Frank Herbert/)).toBeInTheDocument();
});

it('renders the book count', () => {
  renderWithProviders(
    <SeriesRow seriesName="Dune" books={books} progressMap={new Map()} onClick={() => {}} />
  );
  expect(screen.getByText(/2 books/)).toBeInTheDocument();
});

it('shows average progress percentage when progressMap has entries for series books', () => {
  const progressMap = new Map([['b1', 1.0], ['b2', 0.5]]);
  renderWithProviders(
    <SeriesRow seriesName="Dune" books={books} progressMap={progressMap} onClick={() => {}} />
  );
  // avg = (1.0 + 0.5) / 2 = 0.75 → 75%
  expect(screen.getByText(/75%/)).toBeInTheDocument();
});

it('calls onClick with series name when clicked', async () => {
  const user = userEvent.setup();
  const handleClick = vi.fn();
  renderWithProviders(
    <SeriesRow seriesName="Dune" books={books} progressMap={new Map()} onClick={handleClick} />
  );
  await user.click(screen.getByText('Dune'));
  expect(handleClick).toHaveBeenCalledWith('Dune');
});
