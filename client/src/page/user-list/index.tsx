import { Page } from '../../component/page';
import { NavigationPanel } from '../../panel/navigation';
import { UserListPanel } from '../../panel/user-list';
import { UserRegisterPanel } from '../../panel/user-register';

export const UserListPage = () => (
  <Page>
    <NavigationPanel active='user-list'/>
    <UserRegisterPanel/>
    <UserListPanel />
  </Page>
);
