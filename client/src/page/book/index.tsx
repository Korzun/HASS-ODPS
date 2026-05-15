import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { NewCard, Page } from '~/component';
import { MetadataList, type Metadata } from '~/component/metadata-list';
import { Button, DeleteBookButton } from '~/control';
import { useIsAdmin } from '~/provider/auth';
import { useBook } from '~/provider/book';
import { path } from '~/router';
import { formatSize, hashString } from '~/utils';

import { useStyle } from './style';

export const BookPage = () => {
  const styles = useStyle();

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isAdmin] = useIsAdmin();

  const [book, loading, error] = useBook(id!, true);

  const handleEditMetadata = useCallback(() => navigate(path.bookEdit(book?.id ?? '')), [book]);

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

  if (loading) return <p className={styles.loading}>Loading…</p>;
  if (error) return <p className={styles.notFound}>Book not found.</p>;

  return (
    <Page>
      <NewCard>
        <div className={styles.cardContainer}>
          <div className={styles.detail}>
            {book.hasCover ? (
              <img
                className={styles.coverImg}
                src={`/api/books/${encodeURIComponent(book.id)}/cover`}
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
                  {book.series}
                  {book.seriesIndex > 0 ? ` #${book.seriesIndex}` : ''}
                </div>
              )}
            </div>
          </div>
          <div>
            <MetadataList metadata={metadata} />
          </div>
        </div>
      </NewCard>
      <NewCard title="Description">
        <div className={styles.description}>{description}</div>
      </NewCard>
      <NewCard title="Subjects">
        {book.subjects.length > 0 && (
          <div className={styles.subjects}>
            {book.subjects.map((subject, index) => (
              <span key={subject + index} className={styles.pill}>
                {subject}
              </span>
            ))}
          </div>
        )}
      </NewCard>
      {/*<NewCard>
          <div className={styles.cardTitle}>Identifiers</div>
          {book.identifiers.length > 0 && (
            <div className={styles.identifiers}>
              {book.identifiers.map(({ scheme, value }) => (
                <div key={value + scheme} className={styles.identifier}>
                  <span className={styles.scheme}>{scheme}</span>: {value}
                </div>
              ))}
            </div>
          )}
        </NewCard>*/}
      {isAdmin && (
        <div className={styles.buttonContainer}>
          <div className={styles.spacer} />
          <Button onClick={handleEditMetadata}>Edit metadata</Button>
          <DeleteBookButton bookId={book.id} />
        </div>
      )}
    </Page>
  );
};
