import { useState, useEffect } from 'react';
import { getUsers, deleteUser } from '../../../api/users';
import { RegisterUserForm } from './register-user-form';
import { UserRow } from './user-row';
import { useStyle } from './style';
import type { Book, User } from '../../../types';

interface UsersPanelProps {
  books: Book[];
}

export function UsersPanel({ books }: UsersPanelProps) {
  const styles = useStyle();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadUsers() {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadUsers(); }, []);

  async function handleDelete(username: string) {
    try {
      await deleteUser(username);
      void loadUsers();
    } catch {
      alert('Failed to delete user.');
    }
  }

  function handleProgressCleared() {
    void loadUsers();
  }

  if (loading) return <p className={styles.loading}>Loading…</p>;

  return (
    <div className={styles.root}>
      <RegisterUserForm onSuccess={() => void loadUsers()} />
      {users.length === 0 ? (
        <p className={styles.empty}>No KOSync users registered yet.</p>
      ) : (
        <ul className={styles.list}>
          {users.map(u => (
            <UserRow
              key={u.username}
              user={u}
              books={books}
              onDelete={handleDelete}
              onProgressCleared={handleProgressCleared}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
