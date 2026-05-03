import { Page } from '../../component/page';
import { UserListPanel } from '../../panel/user-list';
import { UserRegisterPanel } from '../../panel/user-register';

export const UserListPage = () => (
  <Page>
    <UserRegisterPanel />
    <UserListPanel />
  </Page>
);
