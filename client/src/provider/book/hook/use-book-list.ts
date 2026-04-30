import { useContext, useEffect, useMemo } from 'react';

import { Context } from '../context';
import type { Book } from '../type';

import { useFetchBookList } from './use-fetch-book-list';


export type UseBookList =
  | [Book[], false, false, undefined]  // Data was successfully loaded
  | [Book[], true, false, undefined]   // Data was already successfully loaded and new data is being loaded
  | [Book[], true, false, undefined]   // Data is being loaded
  | [Book[], false, true, undefined]   // There was an unspecified error while loading data
  | [Book[], false, true, string];     // There was a specified error while loading data
export const useBookList = (): UseBookList => {
  const { bookList } = useContext(Context);
  const { fetchBookList, loading, error, errorMessage } = useFetchBookList();

  useEffect(() => { 
    if(!loading && !error && Object.keys(bookList).length === 0) {
      void fetchBookList();
    }
  }, [fetchBookList]);

  return useMemo(
    () => [
      Object.values(bookList).sort((bookA, bookB) => bookA.title.localeCompare(bookB.title)),
      loading,
      error,
      errorMessage
    ] as UseBookList,
    [bookList, loading, error, errorMessage],
  );
};
