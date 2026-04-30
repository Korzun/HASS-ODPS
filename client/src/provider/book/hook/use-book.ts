import { useContext, useEffect, useMemo } from "react";

import { Context } from "../context";
import type { Book } from "../type";

import { useFetchBook } from "./use-fetch-book";


export type UseBook =
  | [Book, false, false, undefined]       // Data was successfully loaded
  | [Book, true, false, undefined]        // Data was already successfully loaded and new data is being loaded
  | [undefined, true, false, undefined]   // Data is being loaded
  | [undefined, false, true, undefined]   // There was an unspecified error while loading data
  | [undefined, false, true, string];     // There was a specified error while loading data
export const useBook = (bookId: string): UseBook => {
  const { bookList } = useContext(Context);
  const [fetchBook, loading, error, errorMessage] = useFetchBook();

  useEffect(() => {
    if(!loading && !error && bookList[bookId] === undefined) {
      fetchBook(bookId);
    }
  }, [fetchBook])

  return useMemo(
    () => [
      bookList[bookId],
      loading === false && error === false && bookList[bookId] === undefined ? true : loading,
      error,
      errorMessage
    ] as UseBook,
    [bookList, loading, error, errorMessage],
  );
};
