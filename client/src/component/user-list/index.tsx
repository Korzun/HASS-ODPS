import { UserRow } from '../../component/user-row';
import { useUserList } from '../../provider/user';

import { useStyle } from './style';

export const UserList = () => {
  const styles = useStyle();
  const [userList, loading] = useUserList();

  if (loading) return <p className={styles.loading}>Loading…</p>;

  return (
    <ul className={styles.root}>
      {userList.map((user) => (
        <UserRow key={user.username} username={user.username} />
      ))}
    </ul>
  );
};
