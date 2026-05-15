import { useParams } from 'react-router-dom';

import { NewCard, CoverStack, BookRow, Page } from '~/component';
import { useSeriesBookList } from '~/provider/book';

import { useStyle } from './style';

export const SeriesPage = () => {
  const { name } = useParams<{ name: string }>();
  const style = useStyle();

  const [seriesBookList, loading, error] = useSeriesBookList(name!);

  if (loading && seriesBookList === undefined) return <p className={style.loading}>Loading…</p>;
  if (!name || error || seriesBookList.length === 0)
    return <p className={style.notFound}>Series not found.</p>;

  const author = seriesBookList[0].author;

  return (
    <Page>
      <NewCard>
        <div className={style.hero}>
          <CoverStack
            seriesName={name}
            containerWidth={100}
            containerHeight={130}
            layerWidth={80}
            layerHeight={118}
          />
          <div>
            <h1 className={style.title}>{name}</h1>
            <div className={style.author}>{author}</div>
            {/*<div className={style.meta}>
              {author} · {seriesBookList.length} book{seriesBookList.length !== 1 ? 's' : ''}
            </div>*/}
          </div>
        </div>
      </NewCard>
      <NewCard title="Reading Order">
        <div className={style.bookList}>
          {seriesBookList.map((book) => (
            <BookRow key={book.id} bookId={book.id} showAuthor={false} />
          ))}
        </div>
      </NewCard>
    </Page>
  );
};
