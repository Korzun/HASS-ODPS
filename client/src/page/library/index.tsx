import { useMemo } from 'react';

import { Page, BookRow, SeriesRow, LibraryScan } from '~/component';
import { useIsAdmin } from '~/provider/auth';
import { useSeriesList, useStandaloneBookList } from '~/provider/book';

import { useStyle } from './style';

export const LibraryPage = () => {
  const style = useStyle();

  const [isAdmin] = useIsAdmin();
  const [standaloneBookList] = useStandaloneBookList();
  const [seriesBookList] = useSeriesList();

  const bookList = useMemo(() => {
    return [...seriesBookList, ...standaloneBookList].sort((bookOrSeriesA, bookOrSeriesB) => {
      const titleA = Array.isArray(bookOrSeriesA) ? bookOrSeriesA[0] : bookOrSeriesA.title;
      const titleB = Array.isArray(bookOrSeriesB) ? bookOrSeriesB[0] : bookOrSeriesB.title;
      return titleA.localeCompare(titleB);
    });
  }, [standaloneBookList, seriesBookList]);

  return (
    <Page>
      <div className={style.root}>
        {bookList.map((book) =>
          Array.isArray(book) ? (
            <SeriesRow key={book[0]} seriesName={book[0]} />
          ) : (
            <BookRow key={book.id} bookId={book.id} />
          )
        )}
      </div>
      {isAdmin && (
        <div className={style.buttonContainer}>
          <div className={style.spacer} />
          <LibraryScan />
        </div>
      )}
    </Page>
  );
};
