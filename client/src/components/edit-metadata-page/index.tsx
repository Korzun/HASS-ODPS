import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { getBook, patchBookMetadata } from '../../api/books';
import { useAuth } from '../../auth/auth-provider';
import { useStyle } from './style';
import type { Book } from '../../types';

interface IdentifierRow {
  scheme: string;
  value: string;
}

export function EditMetadataPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const styles = useStyle();

  const [original, setOriginal] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!id || !isAdmin) { setLoading(false); return; }
    getBook(id)
      .then(book => {
        setOriginal(book);
        setTitle(book.title);
        setAuthor(book.author);
        setFileAs(book.fileAs);
        setPublisher(book.publisher);
        setSeries(book.series);
        setSeriesIndex(book.seriesIndex !== 0 ? String(book.seriesIndex) : '');
        setDescription(book.description ?? '');
        setSubjects(book.subjects.join(', '));
        setIdentifiers(book.identifiers);
      })
      .catch(() => setError('Failed to load book.'))
      .finally(() => setLoading(false));
  }, [id, isAdmin]);

  if (!isAdmin) return <Navigate to="/" replace />;
  if (loading) return <p className={styles.loading}>Loading…</p>;
  if (!original) return <p className={styles.error}>{error ?? 'Book not found.'}</p>;

  async function handleSave() {
    if (!original || !id) return;
    setSaving(true);
    setError(null);
    const trim = (s: string) => s.trim();
    try {
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
      if (JSON.stringify(identifiers) !== JSON.stringify(original.identifiers)) {
        fd.append('identifiers', JSON.stringify(identifiers));
      }
      if (cover) fd.append('cover', cover);
      await patchBookMetadata(id, fd);
      navigate(`/books/${encodeURIComponent(id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function addIdentifier() {
    setIdentifiers(prev => [...prev, { scheme: '', value: '' }]);
  }

  function removeIdentifier(index: number) {
    setIdentifiers(prev => prev.filter((_, i) => i !== index));
  }

  function updateIdentifier(index: number, field: 'scheme' | 'value', val: string) {
    setIdentifiers(prev =>
      prev.map((row, i) => i === index ? { ...row, [field]: val } : row)
    );
  }

  return (
    <div className={styles.root}>
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
        <input className={styles.input} value={title} onChange={e => setTitle(e.target.value)} />

        <label className={styles.label}>Author</label>
        <input className={styles.input} value={author} onChange={e => setAuthor(e.target.value)} />

        <label className={styles.label}>File As</label>
        <input className={styles.input} value={fileAs} onChange={e => setFileAs(e.target.value)} />

        <label className={styles.label}>Publisher</label>
        <input className={styles.input} value={publisher} onChange={e => setPublisher(e.target.value)} />

        <label className={styles.label}>Series</label>
        <input className={styles.input} value={series} onChange={e => setSeries(e.target.value)} />

        <label className={styles.label}>Series #</label>
        <input
          className={styles.input}
          type="number"
          value={seriesIndex}
          onChange={e => setSeriesIndex(e.target.value)}
        />

        <label className={styles.label}>Description</label>
        <textarea
          className={styles.textarea}
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
        />

        <label className={styles.label}>Subjects</label>
        <input
          className={styles.input}
          value={subjects}
          onChange={e => setSubjects(e.target.value)}
          placeholder="comma-separated"
        />

        <label className={styles.label}>Cover Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={e => setCover(e.target.files?.[0] ?? null)}
        />

        <div className={styles.identifierSection}>
          <div className={styles.identifierHeader}>
            <span className={styles.label}>Identifiers</span>
            <button type="button" className={styles.addBtn} onClick={addIdentifier}>
              + Add
            </button>
          </div>
          {identifiers.map((row, i) => (
            <div key={i} className={styles.identifierRow}>
              <input
                className={styles.input}
                placeholder="scheme (e.g. isbn)"
                value={row.scheme}
                onChange={e => updateIdentifier(i, 'scheme', e.target.value)}
              />
              <input
                className={styles.input}
                placeholder="value"
                value={row.value}
                onChange={e => updateIdentifier(i, 'value', e.target.value)}
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
    </div>
  );
}
