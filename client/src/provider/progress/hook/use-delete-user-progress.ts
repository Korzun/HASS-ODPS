import { useCallback, useContext, useMemo, useState } from 'react';

import { Context } from '../context';
import { UserProgressList } from '../type';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const removeProgressById = (bookId: string, {[bookId]: _, ...rest}: UserProgressList) => rest;

export type DeleteUserProgress = (bookId: string) => Promise<void>
export type UseDeleteUserProgress =
  | [DeleteUserProgress, false, false, undefined]  // Initial State
  | [DeleteUserProgress, true, false, undefined]   // Progress is being deleted
  | [DeleteUserProgress, false, true, undefined]   // There was an unspecified error while deleting progress
  | [DeleteUserProgress, false, true, string];     // There was a specified error while deleting progress
export const useDeleteUserProgress = (username?: string): UseDeleteUserProgress => {
  const { progressList, setProgressList } = useContext(Context);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const deleteUserProgress = useCallback(async (bookId: string) => {
    // Prevent multiple parallel requests 
    if(deleting) {
      return;
    }

    if(username === undefined) {
      setError(true);
      setErrorMessage('Failed to delete progress');
      return;
    }

    // Prevent calling the API if the user & book progress doesn't exist
    const userProgressList = progressList[username];
    const progress = userProgressList?.[bookId];
    if (progress === undefined) {
      setError(true);
      setErrorMessage('Failed to delete progress');
      return;
    }

    // Optimistically remove progress
    setProgressList({
      ...progressList,
      [username]: removeProgressById(bookId, userProgressList)
    });

    try {
      setDeleting(true);
      setError(false);
      setErrorMessage(undefined);
      const response = await fetch(
        `/api/users/${encodeURIComponent(username)}/progress/${encodeURIComponent(bookId)}`,
        { method: 'DELETE' }
      );
      if (response.status !== 204) {
        throw new Error('Failed to clear progress');
      }
    } catch (error) {
      setError(true);
      setProgressList({
        ...progressList,
        [username]: {...userProgressList, [bookId]: progress }
      });
      if (error instanceof Error) {
        setErrorMessage(error.message);
      }
    } finally {
      setDeleting(false);
    }
  }, [progressList, setProgressList]);

  return useMemo(
    () => [deleteUserProgress, deleting, error, errorMessage] as UseDeleteUserProgress,
    [deleteUserProgress, deleting, error, errorMessage],
  );
};
