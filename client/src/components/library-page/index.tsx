import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/auth-provider';
import { getBooks, deleteBook } from '../../api/books';
import { getMyProgress, deleteMyProgress } from '../../api/progress';
import { TabBar, type TabName } from '../tab-bar';
import { UploadZone } from './upload-zone';
import { BookList } from './book-list';
import { UsersPanel } from './users-panel';
import { useStyle } from './style';
import type { Book, Progress } from '../../types';

export function LibraryPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const styles = useStyle();
  const [activeTab, setActiveTab] = useState<TabName>('library');
  const [books, setBooks] = useState<Book[]>([]);
  const [progressMap, setProgressMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [bookList, progressList] = await Promise.all([
        getBooks(),
        isAdmin ? Promise.resolve<Progress[]>([]) : getMyProgress(),
      ]);
      setBooks(bookList);
      setProgressMap(new Map(progressList.map(p => [p.document, p.percentage])));
    } catch {
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      await deleteBook(id);
      await loadData();
    } catch {
      alert('Failed to delete book.');
    }
  }

  async function handleClearProgress(id: string) {
    try {
      await deleteMyProgress(id);
      await loadData();
    } catch {
      alert('Failed to clear reading status.');
    }
  }

  return (
    <main className={styles.main}>
      <TabBar active={activeTab} onTabChange={setActiveTab} />
      {activeTab === 'library' ? (
        <>
          <UploadZone
            isAdmin={isAdmin}
            onUploadComplete={loadData}
            onScanComplete={loadData}
          />
          {loading ? (
            <p className={styles.loading}>Loading…</p>
          ) : (
            <BookList
              books={books}
              progressMap={progressMap}
              isAdmin={isAdmin}
              onDelete={handleDelete}
              onClearProgress={handleClearProgress}
              onBookClick={id => navigate(`/books/${encodeURIComponent(id)}`)}
              onSeriesClick={name => navigate(`/series/${encodeURIComponent(name)}`)}
            />
          )}
        </>
      ) : (
        <UsersPanel books={books} />
      )}
    </main>
  );
}
