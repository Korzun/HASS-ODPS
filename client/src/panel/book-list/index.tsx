import { useMemo } from 'react';

import { BookRow } from '../../component/book-row';
import { SeriesRow } from '../../component/series-row';
import { useSeriesList, useStandaloneBookList } from '../../provider/book';

export const BookListPanel = () => {
  const [standaloneBookList] = useStandaloneBookList();
  const [seriesBookList] = useSeriesList();
  const bookList = useMemo(() => {
    return [...seriesBookList, ...standaloneBookList].sort((bookOrSeriesA, bookOrSeriesB) => {
      const titleA = Array.isArray(bookOrSeriesA) ? bookOrSeriesA[0] : bookOrSeriesA.title;
      const titleB = Array.isArray(bookOrSeriesB) ? bookOrSeriesB[0] : bookOrSeriesB.title;
      return titleA.localeCompare(titleB);
    });
  }, [standaloneBookList, seriesBookList]);

  return bookList.map((book) =>
    Array.isArray(book) ? (
      <SeriesRow key={book[0]} seriesName={book[0]} />
    ) : (
      <BookRow key={book.id} bookId={book.id} />
    )
  );
};
