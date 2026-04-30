import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { Context } from '../context';
import type { User } from '../type';

export const sortUserList = (userA: User, userB: User) =>
  userA.username.localeCompare(userB.username);

export type UseUserList =
  | [User[], true, false, undefined] // Loading
  | [User[], false, false, undefined] // Loaded
  | [User[], false, true, undefined] // Unspecified error
  | [User[], false, true, string]; // Specified error
export const useUserList = (): UseUserList => {
  const { userList, setUserList } = useContext(Context);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const getUserList = useCallback(async () => {
    setLoading(true);
    setError(false);
    setErrorMessage(undefined);

    try {
      const response = await fetch('/api/users');
      const users = await (response.json() as Promise<User[]>);
      setUserList(
        users.reduce(
          (record, user) => ({ ...record, [user.username]: user }),
          {} as Record<string, User>
        )
      );
    } catch (error) {
      setError(true);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [setUserList]);

  useEffect(() => {
    getUserList();
  }, [getUserList]);

  return useMemo(
    () => [Object.values(userList).sort(sortUserList), loading, error, errorMessage] as UseUserList,
    [userList, loading, error, errorMessage]
  );
};
