import cx from 'classnames';
import { Fragment, ReactNode, useCallback, useMemo, useState } from 'react';

import { Button, ConfirmModal } from '~/control';
import { AlertOctagonIcon, ChevronCircleIcon } from '~/icon';
import { useUserProgressList } from '~/provider/progress';
import { useDeleteUser, useUser } from '~/provider/user';

import { Card } from '../card';
import { UserProgressRow } from '../user-progress-row';

import { useStyle } from './style';

interface UserRowProps {
  username: string;
}

export const UserRow = ({ username }: UserRowProps) => {
  const styles = useStyle();
  const [user] = useUser(username);

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const handleExpandToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

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

  const cardElement = useMemo(() => {
    if (loading) {
      return 'Loading...';
    }
    if (error) {
      return 'Error loading user progress';
    }
    if (userProgressList === undefined || Object.keys(userProgressList).length === 0) {
      return 'No progress records';
    }
    return Object.values(userProgressList ?? {}).map((progress) => (
      <UserProgressRow key={progress.document} bookId={progress.document} username={username} />
    )) as ReactNode[];
  }, [error, userProgressList, loading, username]);

  return (
    <Fragment>
      <Card
        title={
          <div className={styles.title} onClick={handleExpandToggle}>
            <ChevronCircleIcon
              className={cx(styles.chevron, isExpanded ? styles.expanded : styles.collapsed)}
            />
            {username}
          </div>
        }
        subTitle={
          user
            ? `${user.progressCount} book${user.progressCount === 1 ? '' : 's'} synced`
            : undefined
        }
        headerAction={
          <Button type="link" danger onClick={handleDeleteUser} loading={deleting}>
            Delete user
          </Button>
        }
      >
        {isExpanded && <div className={styles.content}>{cardElement}</div>}
      </Card>
      <ConfirmModal
        isOpen={showDeleteUserModal}
        onCancel={handleDeleteUserCancel}
        onConfirm={handleDeleteUserConfirm}
        icon={AlertOctagonIcon}
        danger
        title={`Delete user permanently?`}
        confirmText="Delete"
      >
        This action will delete <span className={styles.username}>{username}</span>, all their
        reading progress, and <span className={styles.undone}>can not be undone</span>.
      </ConfirmModal>
    </Fragment>
  );
};
