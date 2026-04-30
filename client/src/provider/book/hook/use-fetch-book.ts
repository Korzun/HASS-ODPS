import { useCallback, useContext, useMemo, useState } from "react";

import { Context } from "../context";
import { Book } from '../type';

type FetchBook = (bookId: string) => Promise<void>;
export type UseFetchBook =
  | [FetchBook, false, false, undefined]  // Initial state
  | [FetchBook, true, false, undefined]   // Data is being loaded
  | [FetchBook, false, true, undefined]   // There was an unspecified error while loading data
  | [FetchBook, false, true, string];     // There was a specified error while loading data
export const useFetchBook = (): UseFetchBook => {
  const { bookList, setBookList } = useContext(Context);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const fetchBook = useCallback(async (bookId: string): Promise<void> => {
    // Prevent multiple parallel requests 
    if(loading === true) {
      return;
    }

    setLoading(true);
    setError(false);
    setErrorMessage(undefined);
    try {
      const response = await fetch(`/api/books/${encodeURIComponent(bookId)}`);
      if (!response.ok) throw new Error('Book not found');
      const book = await (response.json() as Promise<Book>);
      setBookList({...bookList, [book.id]: book});
    } catch (error) {
      setError(true);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [bookList, setBookList]);

  return useMemo(
    () => [fetchBook, loading, error, errorMessage] as UseFetchBook,
    [fetchBook, loading, error, errorMessage],
  );
};
