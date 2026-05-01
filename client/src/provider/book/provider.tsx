import { useCallback, useState, type ReactNode } from 'react';

import { Context } from './context';
import type { BookList } from './type';

export type BookProviderProps = { children: ReactNode };
export const BookProvider = ({ children }: BookProviderProps) => {
  const [bookList, setBookListRaw] = useState<BookList>({});
  const [bookListLoading, setBookListLoading] = useState(false);
  const [bookListError, setBookListError] = useState<string | undefined>();
  const [loadingByBookId, setLoadingByBookIdRaw] = useState<Record<string, boolean>>({});
  const [errorByBookId, setErrorByBookIdRaw] = useState<Record<string, string | undefined>>({});

  const setBookList = useCallback(
    (updater: (prev: BookList) => BookList) => setBookListRaw(updater),
    []
  );

  const setLoadingForBook = useCallback((bookId: string, loading: boolean) => {
    setLoadingByBookIdRaw((prev) => ({ ...prev, [bookId]: loading }));
  }, []);

  const setErrorForBook = useCallback((bookId: string, error: string | undefined) => {
    setErrorByBookIdRaw((prev) => ({ ...prev, [bookId]: error }));
  }, []);

  return (
    <Context.Provider
      value={{
        bookList,
        bookListLoading,
        bookListError,
        loadingByBookId,
        errorByBookId,
        setBookList,
        setBookListLoading,
        setBookListError,
        setLoadingForBook,
        setErrorForBook,
      }}
    >
      {children}
    </Context.Provider>
  );
};
