import { CollapsibleSection } from '../../component/collapsible-section';
import { SeriesRow } from '../../component/series-row';
import { useSeriesBookList } from '../../provider/book/hook';

export const SeriesList = () => {
  const [seriesList] = useSeriesBookList();
  const bookCount = seriesList.reduce((bookCount, [, books]) => bookCount + books.length, 0);
  const subTitle = `${bookCount} book${bookCount !== 1 ? 's' : ''}`;

  return (
    <CollapsibleSection title="Series" subTitle={subTitle}>
      {seriesList.map(([name, books]) => (
        <SeriesRow key={name} seriesName={name} books={books} />
      ))}
    </CollapsibleSection>
  );
};
