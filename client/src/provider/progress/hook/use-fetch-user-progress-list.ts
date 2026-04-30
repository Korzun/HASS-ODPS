import { useCallback, useContext, useMemo, useState } from 'react';

import { Context } from '../context';
import type { UserProgressList, Progress} from '../type';


export type FetchUserProgressList = (username: string) => Promise<void>
export type UseFetchUserProgressList =
  | [FetchUserProgressList, false, false, undefined]  // Initial State
  | [FetchUserProgressList, true, false, undefined]   // Progress is being loaded
  | [FetchUserProgressList, false, true, undefined]   // There was an unspecified error while loading progress
  | [FetchUserProgressList, false, true, string];     // There was a specified error while loading progress
export const useFetchUserProgressList = (): UseFetchUserProgressList => {
  const { progressList, setProgressList } = useContext(Context);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const fetchUserProgress = useCallback(async (username: string) => {
    // Prevent multiple parallel requests 
    if(loading) {
      return;
    }

    setLoading(true);
    setError(false);
    setErrorMessage(undefined);
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/progress`);
      if (!response.ok) {
        throw new Error('Failed to fetch books');
      }
      const userProgressList = await (response.json() as Promise<Progress[]>)
      setProgressList({
        ...progressList,
        [username]: userProgressList.reduce((keyedProgressList, progress) => {
          return {...keyedProgressList, [progress.document]: progress}
        }, {} as UserProgressList),
      });
    } catch (err) {
      setError(true);
      if (err instanceof Error) setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  }, [setProgressList]);

  return useMemo(
    () => [fetchUserProgress, loading, error, errorMessage] as UseFetchUserProgressList,
    [fetchUserProgress, loading, error, errorMessage],
  );
};
