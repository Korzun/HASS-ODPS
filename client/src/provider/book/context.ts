import { createContext } from 'react';

import type { BookList } from './type';

export type BookContext = {
  bookList: BookList;
  setBookList: (newBookList: BookList) => void;
};

export const Context = createContext<BookContext>({
  bookList: {},
  setBookList: () => {},
});
