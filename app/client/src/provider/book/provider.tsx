import { useCallback, useState, type ReactNode } from 'react';

import { Context } from './context';
import type { BookList, DisplayUnit } from './type';

export type BookProviderProps = { children: ReactNode };
export const BookProvider = ({ children }: BookProviderProps) => {
  const [bookList, setBookListRaw] = useState<BookList>({});
  const [bookListFetched, setBookListFetched] = useState(false);
  const [bookListLoading, setBookListLoading] = useState(false);
  const [bookListError, setBookListError] = useState<string | undefined>();
  const [loadingByBookId, setLoadingByBookIdRaw] = useState<Record<string, boolean>>({});
  const [errorByBookId, setErrorByBookIdRaw] = useState<Record<string, string | undefined>>({});
  const [completeBookIds, setCompleteBookIdsRaw] = useState(new Set<string>());
  const [bookListItems, setBookListItemsRaw] = useState<DisplayUnit[]>([]);
  const [nextCursor, setNextCursorRaw] = useState<string | null>(null);

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
  const setBookComplete = useCallback((bookId: string) => {
    setCompleteBookIdsRaw((prev) => new Set([...prev, bookId]));
  }, []);
  const clearCompleteBookIds = useCallback(() => {
    setCompleteBookIdsRaw(new Set());
  }, []);
  const setBookListItems = useCallback(
    (updater: (prev: DisplayUnit[]) => DisplayUnit[]) => setBookListItemsRaw(updater),
    []
  );
  const setNextCursor = useCallback((cursor: string | null) => setNextCursorRaw(cursor), []);

  return (
    <Context.Provider
      value={{
        bookList,
        bookListFetched,
        bookListLoading,
        bookListError,
        loadingByBookId,
        errorByBookId,
        completeBookIds,
        bookListItems,
        nextCursor,
        setBookList,
        setBookListFetched,
        setBookListLoading,
        setBookListError,
        setLoadingForBook,
        setErrorForBook,
        setBookComplete,
        clearCompleteBookIds,
        setBookListItems,
        setNextCursor,
      }}
    >
      {children}
    </Context.Provider>
  );
};
