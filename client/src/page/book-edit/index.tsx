import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { Page } from '../../component/page';
import { useIsAdmin } from '../../provider/auth';
import { useBook, usePatchBookMetadata } from '../../provider/book';

import { useStyle } from './style';

type IdentifierRow = { scheme: string; value: string; _key: string };

export const BookEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isAdmin, isAdminLoading] = useIsAdmin();
  const styles = useStyle();

  const [original, loading, error] = useBook(id!);
  const [patchBookMetadata, saving] = usePatchBookMetadata();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [fileAs, setFileAs] = useState('');
  const [publisher, setPublisher] = useState('');
  const [series, setSeries] = useState('');
  const [seriesIndex, setSeriesIndex] = useState('');
  const [description, setDescription] = useState('');
  const [subjects, setSubjects] = useState('');
  const [identifiers, setIdentifiers] = useState<IdentifierRow[]>([]);
  const [cover, setCover] = useState<File | null>(null);

  useEffect(() => {
    if (original && isAdmin) {
      setTitle(original.title);
      setAuthor(original.author);
      setFileAs(original.fileAs);
      setPublisher(original.publisher);
      setSeries(original.series);
      setSeriesIndex(original.seriesIndex !== 0 ? String(original.seriesIndex) : '');
      setDescription(original.description ?? '');
      setSubjects(original.subjects.join(', '));
      setIdentifiers(original.identifiers.map((row) => ({ ...row, _key: crypto.randomUUID() })));
    }
  }, [original, id, isAdmin]);

  if (isAdmin === false && isAdminLoading === false) {
    console.log({ isAdmin, isAdminLoading });
    return <Navigate to="/" replace />;
  }
  if (loading) return <p className={styles.loading}>Loading…</p>;
  if (!original) return <p className={styles.error}>{error ?? 'Book not found.'}</p>;

  async function handleSave() {
    if (!original || !id) return;
    const trim = (s: string) => s.trim();
    const fd = new FormData();
    if (title.trim() !== original.title) fd.append('title', title.trim());
    if (author.trim() !== original.author) fd.append('author', author.trim());
    if (fileAs.trim() !== original.fileAs) fd.append('fileAs', fileAs.trim());
    if (publisher.trim() !== original.publisher) fd.append('publisher', publisher.trim());
    if (series.trim() !== original.series) fd.append('series', series.trim());
    const origIdx = original.seriesIndex !== 0 ? String(original.seriesIndex) : '';
    if (seriesIndex.trim() !== origIdx) fd.append('seriesIndex', seriesIndex.trim());
    if (description.trim() !== (original.description ?? '')) {
      fd.append('description', description.trim());
    }
    const newSubjects = subjects.split(',').map(trim).filter(Boolean);
    if (JSON.stringify(newSubjects) !== JSON.stringify(original.subjects)) {
      fd.append('subjects', JSON.stringify(newSubjects));
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cleanIdentifiers = identifiers.map(({ _key: _, ...rest }) => rest);
    if (JSON.stringify(cleanIdentifiers) !== JSON.stringify(original.identifiers)) {
      fd.append('identifiers', JSON.stringify(cleanIdentifiers));
    }
    if (cover) fd.append('cover', cover);
    await patchBookMetadata(id, fd);
    navigate(`/books/${encodeURIComponent(id)}`);
  }

  function addIdentifier() {
    setIdentifiers((prev) => [...prev, { scheme: '', value: '', _key: crypto.randomUUID() }]);
  }

  function removeIdentifier(index: number) {
    setIdentifiers((prev) => prev.filter((_, i) => i !== index));
  }

  function updateIdentifier(index: number, field: 'scheme' | 'value', val: string) {
    setIdentifiers((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: val } : row)));
  }

  return (
    <Page>
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={() => navigate(`/books/${encodeURIComponent(id!)}`)}
        >
          Cancel
        </button>
        <h1 className={styles.heading}>Edit Metadata</h1>
        <button
          type="button"
          className={styles.saveBtn}
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.form}>
        <label className={styles.label}>Title</label>
        <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} />

        <label className={styles.label}>Author</label>
        <input
          className={styles.input}
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />

        <label className={styles.label}>File As</label>
        <input
          className={styles.input}
          value={fileAs}
          onChange={(e) => setFileAs(e.target.value)}
        />

        <label className={styles.label}>Publisher</label>
        <input
          className={styles.input}
          value={publisher}
          onChange={(e) => setPublisher(e.target.value)}
        />

        <label className={styles.label}>Series</label>
        <input
          className={styles.input}
          value={series}
          onChange={(e) => setSeries(e.target.value)}
        />

        <label className={styles.label}>Series #</label>
        <input
          className={styles.input}
          type="number"
          value={seriesIndex}
          onChange={(e) => setSeriesIndex(e.target.value)}
        />

        <label className={styles.label}>Description</label>
        <textarea
          className={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />

        <label className={styles.label}>Subjects</label>
        <input
          className={styles.input}
          value={subjects}
          onChange={(e) => setSubjects(e.target.value)}
          placeholder="comma-separated"
        />

        <label className={styles.label}>Cover Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setCover(e.target.files?.[0] ?? null)}
        />

        <div className={styles.identifierSection}>
          <div className={styles.identifierHeader}>
            <span className={styles.label}>Identifiers</span>
            <button type="button" className={styles.addBtn} onClick={addIdentifier}>
              + Add
            </button>
          </div>
          {identifiers.map((row, i) => (
            <div key={row._key} className={styles.identifierRow}>
              <input
                className={styles.input}
                placeholder="scheme (e.g. isbn)"
                value={row.scheme}
                onChange={(e) => updateIdentifier(i, 'scheme', e.target.value)}
              />
              <input
                className={styles.input}
                placeholder="value"
                value={row.value}
                onChange={(e) => updateIdentifier(i, 'value', e.target.value)}
              />
              <button
                type="button"
                className={styles.removeBtn}
                aria-label={`Remove identifier ${i + 1}`}
                onClick={() => removeIdentifier(i)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
};
