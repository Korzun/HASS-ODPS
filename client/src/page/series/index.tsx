import { useParams } from 'react-router-dom';

import { BookRow } from '../../component/book-row';
import { CoverStack } from '../../component/cover-stack';
import { Page } from '../../component/page';
import { BreadcrumbList } from '../../panel/breadcrumb-list';
import { useSeriesBookList } from '../../provider/book';

import { useStyle } from './style';

export const SeriesPage = () => {
  const { name } = useParams<{ name: string }>();
  const styles = useStyle();

  const [seriesBookList, loading, error] = useSeriesBookList(name!);

  if (loading && seriesBookList === undefined) return <p className={styles.loading}>Loading…</p>;
  if (!name || error || seriesBookList.length === 0)
    return <p className={styles.notFound}>Series not found.</p>;

  const author = seriesBookList[0].author;

  return (
    <Page>
      <BreadcrumbList currentTitle={name} />
      <div className={styles.hero}>
        <CoverStack
          seriesName={name}
          containerWidth={68}
          containerHeight={86}
          layerWidth={52}
          layerHeight={72}
        />
        <div>
          <h1 className={styles.title}>{name}</h1>
          <div className={styles.meta}>
            {author} · {seriesBookList.length} book{seriesBookList.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
      <h2 className={styles.readingOrderLabel}>Reading Order</h2>
      <div className={styles.bookList}>
        {seriesBookList.map((book) => (
          <BookRow key={book.id} bookId={book.id} />
        ))}
      </div>
    </Page>
  );
};
