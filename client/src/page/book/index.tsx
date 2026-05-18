import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Card, Page, Tag } from '~/component';
import { MetadataList, type Metadata } from '~/component/metadata-list';
import {
  Button,
  ProgressIndicator,
  ChapterProgress,
  DeleteBookButton,
  SetProgressModal,
} from '~/control';
import { useIsAdmin } from '~/provider/auth';
import { useBook } from '~/provider/book';
import { useMyProgress } from '~/provider/progress';
import { path } from '~/router';
import { formatSize, hashString } from '~/utils';

import { useStyle } from './style';

export const BookPage = () => {
  const styles = useStyle();

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isAdmin] = useIsAdmin();

  const [book, loading, error] = useBook(id!, true);
  const [progress] = useMyProgress(id!);
  const [progressModalOpen, setProgressModalOpen] = useState(false);

  const handleEditMetadata = useCallback(
    () => navigate(path.bookEdit(book?.id ?? '')),
    [book, navigate]
  );

  const handleSeriesNavigate = useCallback(() => {
    if (book?.series) {
      navigate(path.series(book.series));
    }
  }, [book, navigate]);

  // Metadata
  const metadata = (() => {
    const metadataList: Metadata[] = [];
    if (book === undefined) {
      return metadataList;
    }
    metadataList.push({
      title: 'progress',
      value: <ProgressIndicator value={progress ? progress.percentage : 0} size={12} />,
    });
    if (
      progress &&
      progress.percentage > 0 &&
      book.chapterCount > 0 &&
      progress.currentChapter != null
    ) {
      metadataList.push({
        title: 'chapters',
        value: (
          <ChapterProgress
            current={progress.currentChapter}
            total={book.chapterCount}
            name={progress.currentChapterName}
          />
        ),
      });
    }
    if (book.publisher) {
      metadataList.push({ title: 'publisher', value: book.publisher });
    }
    metadataList.push({ title: 'format', value: 'EPUB' });
    metadataList.push({ title: 'size', value: formatSize(book.size) });
    if (book.addedAt) {
      metadataList.push({ title: 'added', value: new Date(book.addedAt).toLocaleDateString() });
    }
    return metadataList;
  })();

  // Description
  const description = useMemo(() => {
    if (book?.description === undefined) {
      return [];
    }
    return book.description
      .replace(/<\/?[^>]+(>|$)/g, '')
      .split(/\r?\n/)
      .filter((paragraph) => paragraph.trim())
      .map((paragraph) => <p key={hashString(paragraph.trim())}>{paragraph.trim()}</p>);
  }, [book]);

  if (loading) {
    return (
      <Page>
        <Card>
          <p className={styles.loading}>Loading…</p>
        </Card>
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <Card>
          <p className={styles.notFound}>Book not found.</p>
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <Card>
        <div className={styles.cardContainer}>
          <div className={styles.detail}>
            {book.hasCover ? (
              <img
                className={styles.coverImg}
                src={`/api/books/${encodeURIComponent(book.id)}/cover?width=170`}
                alt={book.title}
                width={80}
                height={114}
              />
            ) : (
              <div className={styles.coverPlaceholder} />
            )}
            <div className={styles.info}>
              <h1 className={styles.title}>{book.title}</h1>
              {book.author.length > 0 && <div className={styles.author}>{book.author}</div>}
              {book.series.length > 0 && (
                <div className={styles.series} onClick={handleSeriesNavigate}>
                  <Tag>
                    {book.series}
                    {book.seriesIndex > 0 ? ` #${book.seriesIndex}` : ''}
                  </Tag>
                </div>
              )}
            </div>
          </div>
          <div className={styles.metadata}>
            <MetadataList metadata={metadata} />
          </div>
        </div>
      </Card>
      <Card title="Description">
        <div className={styles.description}>{description}</div>
      </Card>
      <Card title="Subjects">
        {book.subjects.length > 0 && (
          <div className={styles.subjects}>
            {book.subjects.map((subject, index) => (
              <Tag key={subject + index}>{subject}</Tag>
            ))}
          </div>
        )}
      </Card>
      {isAdmin && (
        <div className={styles.buttonContainer}>
          <div className={styles.spacer} />
          <Button onClick={handleEditMetadata}>Edit metadata</Button>
          <DeleteBookButton bookId={book.id} />
        </div>
      )}
      {!isAdmin && book.chapterCount > 0 && (
        <div className={styles.buttonContainer}>
          <div className={styles.spacer} />
          <Button onClick={() => setProgressModalOpen(true)}>Set progress</Button>
        </div>
      )}
      <SetProgressModal
        isOpen={progressModalOpen}
        bookId={book.id}
        chapterCount={book.chapterCount}
        initialChapter={progress?.currentChapter ?? 0}
        chapterSpineMap={book.chapterSpineMap ?? []}
        chapterNames={book.chapterNames ?? []}
        onClose={() => setProgressModalOpen(false)}
      />
    </Page>
  );
};
