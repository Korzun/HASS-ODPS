import { useState, type ReactNode } from 'react';

import { Context } from './context';
import type { BookList } from './type';

export type BookProviderProps = { children: ReactNode };
export const BookProvider = ({ children }: BookProviderProps) => {
  const [bookList, setBookList] = useState<BookList>({});
  return (
    <Context.Provider value={{ bookList, setBookList }}>
      {children}
    </Context.Provider>
  );
};
