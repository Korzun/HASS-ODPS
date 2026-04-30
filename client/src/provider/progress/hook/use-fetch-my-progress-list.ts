import { useCallback, useContext, useMemo, useState } from 'react';

import { useUsername } from '../../../provider/auth';
import { Context } from '../context';
import type { Progress, UserProgressList} from '../type';

type FetchMyProgress = () => Promise<void>;
export type UseFetchMyProgressList =
  | [FetchMyProgress, false, false, undefined]  // Initial state
  | [FetchMyProgress, true, false, undefined]   // Progress is being loaded
  | [FetchMyProgress, false, true, undefined]   // There was an unspecified error while loading progress
  | [FetchMyProgress, false, true, string];     // There was a specified error while loading progress
export const useFetchMyProgressList = (): UseFetchMyProgressList => {
  const { progressList, setProgressList } = useContext(Context);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [ username ] = useUsername();

  const fetchMyProgress = useCallback(async () => {
    // Prevent multiple parallel requests 
    if(loading) {
      return;
    }
    
    if(username === undefined) {
      return;
    }

    setLoading(true);
    setError(false);
    setErrorMessage(undefined);
    try {
      const response = await fetch('/api/my/progress');
      if (!response.ok) {
        throw new Error('Failed to fetch books');
      }
      const myProgressList = await (response.json() as Promise<Progress[]>)
      const myKeyedProgressList = myProgressList.reduce((myKeyedProgressList, progress) => {
        return {...myKeyedProgressList, [progress.document]: progress}
      }, {} as UserProgressList);
      setProgressList({...progressList, [username]: myKeyedProgressList});
    } catch (err) {
      setError(true);
      if (err instanceof Error) setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  }, [username, progressList]);

  return useMemo(
    () => [fetchMyProgress, loading, error, errorMessage] as UseFetchMyProgressList,
    [fetchMyProgress, loading, error, errorMessage],
  );
};
