import { useCallback, useContext, useMemo, useState } from 'react';

import { Context } from '../context';
import type { BookList, Book} from '../type';

type FetchBookList = () => Promise<void>;

export type UseFetchBookList = 
  | { fetchBookList: FetchBookList, loading: false, error: false, errorMessage: undefined}  // Initial state
  | { fetchBookList: FetchBookList, loading: true, error: false, errorMessage: undefined}   // Data is being loaded
  | { fetchBookList: FetchBookList, loading: false, error: true, errorMessage: undefined}   // There was an unspecified error while loading data
  | { fetchBookList: FetchBookList, loading: false, error: true, errorMessage: string};     // There was a specified error while loading data
export const useFetchBookList = (): UseFetchBookList => {
  const { setBookList } = useContext(Context);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const fetchBookList = useCallback(async () => {
    // Prevent multiple parallel requests 
    if(loading === true) {
      return;
    }

    setLoading(true);
    setError(false);
    setErrorMessage(undefined);
    try {
      const response = await fetch('/api/books');
      if (!response.ok) {
        throw new Error('Failed to fetch books');
      }
      const bookList = await (response.json() as Promise<Book[]>)
      setBookList(bookList.reduce((keyedBookList, book) => {
        return {...keyedBookList, [book.id]: book}
      }, {} as BookList));
    } catch (error) {
      setError(true);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [setBookList]);

  return useMemo(
    () => ({ fetchBookList, loading, error, errorMessage }) as UseFetchBookList,
    [fetchBookList, loading, error, errorMessage],
  );
};
