import { createContext } from 'react';

import type { BookList } from './type';

export type BookContext = {
  bookList: BookList;
  bookListLoading: boolean;
  bookListError: string | undefined;
  loadingByBookId: Record<string, boolean>;
  errorByBookId: Record<string, string | undefined>;
  setBookList: (updater: (prev: BookList) => BookList) => void;
  setBookListLoading: (loading: boolean) => void;
  setBookListError: (error: string | undefined) => void;
  setLoadingForBook: (bookId: string, loading: boolean) => void;
  setErrorForBook: (bookId: string, error: string | undefined) => void;
};

export const Context = createContext<BookContext>({
  bookList: {},
  bookListLoading: false,
  bookListError: undefined,
  loadingByBookId: {},
  errorByBookId: {},
  setBookList: () => {},
  setBookListLoading: () => {},
  setBookListError: () => {},
  setLoadingForBook: () => {},
  setErrorForBook: () => {},
});
