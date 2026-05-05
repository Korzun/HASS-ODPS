import { Page } from '../../component/page';
import { UserList } from '../../component/user-list';
import { UserRegister } from '../../component/user-register';

export const UserListPage = () => (
  <Page>
    <UserRegister />
    <UserList />
  </Page>
);
