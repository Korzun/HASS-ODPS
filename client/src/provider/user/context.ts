import { createContext } from 'react';

import { UserList } from './type';

export type UserContext = {
  userList: UserList;
  setUserList: (newUserList: UserList) => void;
};

export const Context = createContext<UserContext>({
  userList: {},
  setUserList: () => {},
});
