import { renderWithProviders } from '../../../test-utils';
import { CoverStack, LIST_STACK_OFFSETS, HERO_STACK_OFFSETS } from './index';
import type { Book } from '../../../types';

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'test-id',
    title: 'Test Book',
    author: 'Author',
    fileAs: 'Author',
    publisher: '',
    series: 'Test Series',
    seriesIndex: 1,
    subjects: [],
    identifiers: [],
    hasCover: false,
    size: 1000,
    addedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

it('renders container with correct pixel dimensions', () => {
  const { container } = renderWithProviders(
    <CoverStack
      books={[]}
      containerWidth={58}
      containerHeight={74}
      layerWidth={44}
      layerHeight={62}
      offsets={LIST_STACK_OFFSETS}
    />
  );
  const root = container.firstChild as HTMLElement;
  expect(root.style.width).toBe('58px');
  expect(root.style.height).toBe('74px');
});

it('renders an img with the cover URL for a book with hasCover=true', () => {
  const book = makeBook({ id: 'b1', hasCover: true });
  const { getByRole } = renderWithProviders(
    <CoverStack
      books={[book]}
      containerWidth={58}
      containerHeight={74}
      layerWidth={44}
      layerHeight={62}
      offsets={LIST_STACK_OFFSETS}
    />
  );
  expect(getByRole('img')).toHaveAttribute('src', '/api/books/b1/cover');
});

it('renders no img for a book without a cover', () => {
  const book = makeBook({ hasCover: false });
  const { container } = renderWithProviders(
    <CoverStack
      books={[book]}
      containerWidth={58}
      containerHeight={74}
      layerWidth={44}
      layerHeight={62}
      offsets={LIST_STACK_OFFSETS}
    />
  );
  expect(container.querySelectorAll('img')).toHaveLength(0);
});

it('gives ghost back layer opacity 0.3 and ghost middle layer 0.45', () => {
  const { container } = renderWithProviders(
    <CoverStack
      books={[]}
      containerWidth={58}
      containerHeight={74}
      layerWidth={44}
      layerHeight={62}
      offsets={LIST_STACK_OFFSETS}
    />
  );
  const layers = container.querySelectorAll<HTMLElement>('div > div');
  expect(layers[0].style.opacity).toBe('0.3');
  expect(layers[1].style.opacity).toBe('0.45');
});

it('exports LIST_STACK_OFFSETS and HERO_STACK_OFFSETS with 3 offsets each', () => {
  expect(LIST_STACK_OFFSETS).toHaveLength(3);
  expect(HERO_STACK_OFFSETS).toHaveLength(3);
});
