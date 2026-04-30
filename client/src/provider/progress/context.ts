import { createContext } from 'react';

import type { ProgressList } from './type';

export type BookContext = {
  progressList: ProgressList;
  setProgressList: (newProgressList: ProgressList) => void;
};

export const Context = createContext<BookContext>({
  progressList: {},
  setProgressList: () => {},
});
