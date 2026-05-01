import { useCallback, useContext } from 'react';

import { Context } from '../context';
import type { Book, BookList } from '../type';

export type FetchBookList = () => Promise<void>;

export const useFetchBookList = (): FetchBookList => {
  const { bookListLoading, setBookList, setBookListLoading, setBookListError } =
    useContext(Context);

  return useCallback(async () => {
    if (bookListLoading) return;

    setBookListLoading(true);
    setBookListError(undefined);
    try {
      const response = await fetch('/api/books');
      if (!response.ok) throw new Error('Failed to fetch books');
      const bookListArray = await (response.json() as Promise<Book[]>);
      setBookList(() =>
        bookListArray.reduce((acc, book) => ({ ...acc, [book.id]: book }), {} as BookList)
      );
    } catch (err) {
      setBookListError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setBookListLoading(false);
    }
  }, [bookListLoading, setBookList, setBookListLoading, setBookListError]);
};
