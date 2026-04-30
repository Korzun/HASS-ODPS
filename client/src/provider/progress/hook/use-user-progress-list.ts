import { useEffect, useContext, useMemo } from "react";

import { Context } from "../context";
import type { UserProgressList } from "../type";

import { useFetchUserProgressList } from "./use-fetch-user-progress-list";

export type UseUserProgressList =
  | [undefined, false, false, undefined]          // Initial State (or if no progress exists for user)
  | [UserProgressList, false, false, undefined]   // Progress was successfully loaded
  | [UserProgressList, true, false, undefined]    // Progress was already successfully loaded and new progress is being loaded
  | [undefined, true, false, undefined]           // Progress is being loaded
  | [undefined, false, true, undefined]           // There was an unspecified error while loading progress
  | [undefined, false, true, string];             // There was a specified error while loading progress
export const useUserProgressList = (username: string | undefined): UseUserProgressList => {
  const { progressList } = useContext(Context);
  const [fetchUserProgressList, loading, error, errorMessage] = useFetchUserProgressList();

  useEffect(() => {
    if (username === undefined) return;
    const userProgressList = progressList[username];
    if (userProgressList === undefined) {
      void fetchUserProgressList(username);
    }
  }, [username]);

  return useMemo((): UseUserProgressList => {
    if (username === undefined) return [undefined, false, false, undefined];
    if (error) return [undefined, false, error, errorMessage];
    return [progressList[username], loading, false, undefined];
  }, [progressList, loading, error, errorMessage, username]);
};
