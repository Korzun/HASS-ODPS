import { useState, ReactNode } from 'react';

import { Context } from './context';
import type { ProgressList } from './type';

export type ProgressProviderProps = { children: ReactNode };
export const ProgressProvider = ({ children }: ProgressProviderProps) => {
  const [progressList, setProgressList] = useState<ProgressList>({});
  return (
    <Context.Provider value={{ progressList, setProgressList }}>
      {children}
    </Context.Provider>
  );
};
