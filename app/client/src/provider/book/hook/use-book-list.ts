import { useContext, useEffect, useMemo, useRef } from 'react';

import { useLibraryTarget } from '~/provider/library-target';

import { Context } from '../context';
import type { Book } from '../type';

import { useFetchBookList } from './use-fetch-book-list';

export type UseBookList =
  | [Book[], false, false, undefined]
  | [Book[], true, false, undefined]
  | [Book[], false, true, undefined]
  | [Book[], false, true, string];

export const useBookList = (): UseBookList => {
  const {
    bookList,
    bookListFetched,
    bookListLoading,
    bookListError,
    setBookListFetched,
    clearCompleteBookIds,
  } = useContext(Context);
  const fetchBookList = useFetchBookList();
  const [targetUsername] = useLibraryTarget();

  useEffect(() => {
    if (!bookListLoading && bookListError === undefined && !bookListFetched) {
      void fetchBookList();
    }
  }, [bookListFetched, bookListLoading, bookListError, fetchBookList]);

  const prevTargetRef = useRef(targetUsername);
  useEffect(() => {
    if (prevTargetRef.current === targetUsername) return;
    prevTargetRef.current = targetUsername;
    clearCompleteBookIds();
    setBookListFetched(false);
    void fetchBookList();
  }, [targetUsername, fetchBookList, setBookListFetched, clearCompleteBookIds]);

  return useMemo(
    () =>
      [
        Object.values(bookList).sort((a, b) => a.title.localeCompare(b.title)),
        bookListLoading,
        bookListError !== undefined,
        bookListError,
      ] as UseBookList,
    [bookList, bookListLoading, bookListError]
  );
};
