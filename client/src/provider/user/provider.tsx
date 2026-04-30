import { ReactNode, useState } from 'react';

import { Context } from './context';
import { UserList } from './type';

export type UserProviderProps = { children: ReactNode };
export const UserProvider = ({ children }: UserProviderProps) => {
  const [userList, setUserList] = useState<UserList>({});
  return <Context.Provider value={{ userList, setUserList }}>{children}</Context.Provider>;
};
