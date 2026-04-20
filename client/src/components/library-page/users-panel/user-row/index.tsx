import { useState } from 'react';
import { getUserProgress, deleteUser, deleteUserProgress } from '../../../../api/users';
import { relativeTime } from '../../../../utils';
import { useStyle } from './style';
import type { Book, Progress, User } from '../../../../types';

interface UserRowProps {
  user: User;
  books: Book[];
  onDelete: (username: string) => void;
  onProgressCleared: (username: string) => void;
}

export function UserRow({ user, books, onDelete, onProgressCleared }: UserRowProps) {
  const styles = useStyle();
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<Progress[] | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);

  async function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (progress === null) {
      setLoadingProgress(true);
      try {
        const data = await getUserProgress(user.username);
        setProgress(data);
      } catch {
        setProgress([]);
      } finally {
        setLoadingProgress(false);
      }
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete user "${user.username}" and all their reading progress?`)) return;
    try {
      await deleteUser(user.username);
      onDelete(user.username);
    } catch {
      alert('Failed to delete user.');
    }
  }

  async function handleClearProgress(docId: string) {
    const book = books.find(b => b.id === docId);
    const label = book ? book.title : docId;
    if (!confirm(`Clear progress for "${label}" for user "${user.username}"?`)) return;
    try {
      await deleteUserProgress(user.username, docId);
      setProgress(prev => prev ? prev.filter(p => p.document !== docId) : null);
      onProgressCleared(user.username);
    } catch {
      alert('Failed to clear progress.');
    }
  }

  function progressMeta(p: Progress): string {
    const parts: string[] = [];
    if (p.device) parts.push(p.device);
    if (p.timestamp != null) parts.push(relativeTime(p.timestamp));
    return parts.join(' · ');
  }

  return (
    <li className={styles.root}>
      <div
        className={styles.header}
        role="button"
        tabIndex={0}
        onClick={() => void handleToggle()}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            void handleToggle();
          }
        }}
      >
        <span className={styles.chevron}>{open ? '▼' : '▶'}</span>
        <span className={styles.name}>{user.username}</span>
        <span className={styles.meta}>{user.progressCount} synced</span>
        <button
          type="button"
          className={styles.deleteBtn}
          onClick={e => { e.stopPropagation(); void handleDelete(); }}
          title="Delete user"
          aria-label={`Delete user ${user.username}`}
        >
          🗑
        </button>
      </div>
      {open && (
        <ul className={styles.progressList}>
          {loadingProgress ? (
            <li className={styles.progressEmpty}>Loading…</li>
          ) : progress && progress.length === 0 ? (
            <li className={styles.progressEmpty}>No progress records.</li>
          ) : (
            (progress ?? []).map(p => {
              const book = books.find(b => b.id === p.document);
              return (
                <li key={p.document} className={styles.progressItem}>
                  <span className={styles.progDoc}>
                    {book ? book.title : p.document}
                    {book && <small className={styles.progDocId}>{p.document}</small>}
                  </span>
                  <span className={styles.progPct}>{Math.round(p.percentage * 100)}%</span>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => void handleClearProgress(p.document)}
                    title="Clear progress"
                    aria-label={`Clear progress for ${book?.title ?? p.document}`}
                  >
                    🗑
                  </button>
                  <span className={styles.progMeta}>{progressMeta(p)}</span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </li>
  );
}
