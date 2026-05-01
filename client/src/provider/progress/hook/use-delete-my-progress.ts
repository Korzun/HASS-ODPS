import { useCallback, useMemo } from 'react';

import { useUsername } from '../../../provider/auth';

import { useDeleteUserProgress } from './use-delete-user-progress';

export type DeleteMyProgress = (bookId: string) => Promise<void>;
export type UseDeleteMyProgress =
  | [DeleteMyProgress, false, false, undefined] // Initial State
  | [DeleteMyProgress, true, false, undefined] // Progress is being deleted
  | [DeleteMyProgress, false, true, undefined] // There was an unspecified error while deleting progress
  | [DeleteMyProgress, false, true, string]; // There was a specified error while deleting progress
export const useDeleteMyProgress = (): UseDeleteMyProgress => {
  const [username] = useUsername();
  const [deleteUserProgress, deleting, error, errorMessage] = useDeleteUserProgress(username);

  const deleteMyProgress = useCallback(async (bookId: string) => {
    if (username === undefined) {
      return;
    }
    return deleteUserProgress(bookId);
  }, []);

  return useMemo(
    () => [deleteMyProgress, deleting, error, errorMessage] as UseDeleteMyProgress,
    [deleteMyProgress, deleting, error, errorMessage]
  );
};
