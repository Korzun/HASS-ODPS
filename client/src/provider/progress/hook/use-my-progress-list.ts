import { useEffect, useContext, useMemo } from "react";

import { useUsername } from "../../../provider/auth";
import { Context } from "../context";
import type { UserProgressList } from "../type";

import { useFetchMyProgressList } from "./use-fetch-my-progress-list";

export type UseMyProgressList =
  | [undefined, false, false, undefined]          // Initial State (or if no progress exists for user)
  | [UserProgressList, false, false, undefined]   // Progress was successfully loaded
  | [UserProgressList, true, false, undefined]    // Progress was already successfully loaded and new progress is being loaded
  | [undefined, true, false, undefined]           // Progress is being loaded
  | [undefined, false, true, undefined]           // There was an unspecified error while loading progress
  | [undefined, false, true, string];             // There was a specified error while loading progress
export const useMyProgressList = (): UseMyProgressList => {
  const { progressList } = useContext(Context);
  const [ username ] = useUsername();
  const [fetchMyProgress, loading, error, errorMessage] = useFetchMyProgressList();

  useEffect(() => { 
    if(username === undefined) {
      return;
    }
    const myProgressList = progressList[username];
    if(myProgressList === undefined) {
      void fetchMyProgress();
    }
   }, []);

  return useMemo((): UseMyProgressList => {
      if(username === undefined) {
        return [undefined, false, true, "User not logged in"];
      }

      if(error) {
        return [undefined, false, error, errorMessage]
      }

      return [progressList[username], loading, false, undefined]
      
    }, [progressList, loading, error, errorMessage],
  );
};
