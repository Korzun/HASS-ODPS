import { Fragment, ReactNode, useCallback, useState } from 'react';

import { Button, ConfirmModal } from '~/control';
import { AlertOctagonIcon } from '~/icon';
import { useUserProgressList } from '~/provider/progress';
import { useDeleteUser, useUser } from '~/provider/user';

import { Card } from '../card';
import { CollapsibleSection } from '../collapsible-section';
import { UserBookRow } from '../user-book-row';

import { useStyle } from './style';

interface UserRowProps {
  username: string;
}

export const UserRow = ({ username }: UserRowProps) => {
  const styles = useStyle();
  const [user] = useUser(username);

  const [userProgressList, loading, error] = useUserProgressList(username);
  const [deleteUser, deleting] = useDeleteUser();

  const [showDeleteUserModal, setShowDeleteUserModal] = useState<boolean>(false);
  const handleDeleteUser = useCallback(() => {
    setShowDeleteUserModal(true);
  }, []);
  const handleDeleteUserCancel = useCallback(() => {
    setShowDeleteUserModal(false);
  }, []);
  const handleDeleteUserConfirm = useCallback(() => {
    setShowDeleteUserModal(false);
    deleteUser(username);
  }, [deleteUser, username]);

  return (
    <Fragment>
      <Card
        title={username}
        subTitle={user ? `${user.progressCount} synced` : undefined}
        headerAction={
          <Button type="link" danger onClick={handleDeleteUser} loading={deleting}>
            Delete
          </Button>
        }
      ></Card>
      <ConfirmModal
        isOpen={showDeleteUserModal}
        onCancel={handleDeleteUserCancel}
        onConfirm={handleDeleteUserConfirm}
        icon={AlertOctagonIcon}
        danger
        title={`Delete user permanently?`}
        confirmText="Delete"
      >
        This action will delete “<span className={styles.username}>{username}</span>”, all their
        reading progress, and <span className={styles.undone}>can not be undone</span>.
      </ConfirmModal>
    </Fragment>

    // <li className={styles.root}>
    //   <CollapsibleSection
    //     title={username}
    //     subTitle={user ? `${user.progressCount} synced` : undefined}
    //     actions={[
    //       <Button type="link" danger onClick={handleDeleteUser} loading={deleting}>
    //         Delete
    //       </Button>,
    //     ]}
    //   >
    //     <ul className={styles.progressList}>
    //       {loading ? (
    //         <li className={styles.progressEmpty}>Loading…</li>
    //       ) : error ? (
    //         <li className={styles.progressEmpty}>Error loading user's progress</li>
    //       ) : userProgressList && Object.keys(userProgressList).length === 0 ? (
    //         <li className={styles.progressEmpty}>No progress records.</li>
    //       ) : (
    //         (Object.values(userProgressList ?? {}).map((progress) => {
    //           <UserBookRow
    //             key={progress.document}
    //             bookId={progress.document}
    //             username={username}
    //           />;
    //         }) as ReactNode[])
    //       )}
    //     </ul>
    //   </CollapsibleSection>
    //   <ConfirmModal
    //     isOpen={showDeleteUserModal}
    //     onCancel={handleDeleteUserCancel}
    //     onConfirm={handleDeleteUserConfirm}
    //     danger
    //     title={`Delete “${username}” permanently?`}
    //     confirmText="Delete"
    //   >
    //     This action will delete the user and all their reading progress. This action cannot be
    //     undone.
    //   </ConfirmModal>
    // </li>
  );
};
