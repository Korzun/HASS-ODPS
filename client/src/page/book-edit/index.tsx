import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { Page } from '../../component/page';
import { Button } from '../../control/button';
import { useBook, usePatchBookMetadata } from '../../provider/book';
import { path } from '../../router';
import { areObjectArraysIdentical, areStringArraysIdentical } from '../../utils';

import { useStyle } from './style';

type SubjectRow = { value: string; _key: string };
type IdentifierRow = { scheme: string; value: string; _key: string };

export const BookEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const styles = useStyle();

  const [original, loading, error] = useBook(id!);
  const [patchBookMetadata, saving] = usePatchBookMetadata();

  const [cover, setCover] = useState<File | undefined>(undefined);
  const handleCoverChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setCover(event.target.files?.[0] ?? undefined);
  }, []);

  const [title, setTitle] = useState('');
  const handleTitleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  }, []);

  const [author, setAuthor] = useState('');
  const handleAuthorChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setAuthor(event.target.value);
  }, []);

  const [fileAs, setFileAs] = useState('');
  const handleFileAsChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setFileAs(event.target.value);
  }, []);

  const [publisher, setPublisher] = useState('');
  const handlePublisherChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setPublisher(event.target.value);
  }, []);

  const [isSeries, setIsSeries] = useState<boolean>();
  // TODO: Figure out how to handle this better

  const [series, setSeries] = useState('');
  const handleSeriesChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSeries(event.target.value);
  }, []);

  const [seriesIndex, setSeriesIndex] = useState('');
  const handleSeriesIndexChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSeriesIndex(event.target.value);
  }, []);

  const [description, setDescription] = useState('');
  const handleDescriptionChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(event.target.value);
  }, []);

  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const handleAddSubject = useCallback(() => {
    setSubjects((prev) => [...prev, { value: '', _key: crypto.randomUUID() }]);
  }, []);
  const handleRemoveSubject = useCallback((index: number) => {
    setSubjects((prev) => prev.filter((_, subjectIndex) => subjectIndex !== index));
  }, []);
  const handleUpdateSubject = useCallback((index: number, newValue: string) => {
    setSubjects((prev) =>
      prev.map((row, subjectIndex) => (subjectIndex === index ? { ...row, value: newValue } : row))
    );
  }, []);

  const [identifiers, setIdentifiers] = useState<IdentifierRow[]>([]);
  const handleAddIdentifier = useCallback(() => {
    setIdentifiers((prev) => [...prev, { scheme: '', value: '', _key: crypto.randomUUID() }]);
  }, []);
  const handleRemoveIdentifier = useCallback((index: number) => {
    setIdentifiers((prev) => prev.filter((_, i) => i !== index));
  }, []);
  const handleUpdateIdentifier = useCallback(
    (index: number, field: 'scheme' | 'value', val: string) => {
      setIdentifiers((prev) =>
        prev.map((identifier, identifierIndex) =>
          identifierIndex === index ? { ...identifier, [field]: val } : identifier
        )
      );
    },
    []
  );

  useEffect(() => {
    if (original) {
      setTitle(original.title);
      setAuthor(original.author);
      setFileAs(original.fileAs);
      setPublisher(original.publisher);
      setSeries(original.series);
      setSeriesIndex(original.seriesIndex !== 0 ? String(original.seriesIndex) : '');
      setDescription(original.description ?? '');
      setSubjects(
        original.subjects.map((subject) => ({ value: subject, _key: crypto.randomUUID() }))
      );
      setIdentifiers(
        original.identifiers.map((identifier) => ({ ...identifier, _key: crypto.randomUUID() }))
      );
    }
  }, [original, id]);

  if (loading) return <p className={styles.loading}>Loading…</p>;
  if (!original) return <p className={styles.error}>{error ?? 'Book not found.'}</p>;

  async function handleSave() {
    if (!original || !id) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const newIdentifiers = identifiers.map(({ _key: _, ...rest }) => rest);
    const newSubjects = subjects.map((subject: SubjectRow) => subject.value.trim()).filter(Boolean);
    const originalSeriesIndex = original.seriesIndex !== 0 ? String(original.seriesIndex) : '';

    const newId = await patchBookMetadata(id, {
      cover,
      author: author.trim() !== original.author ? author.trim() : undefined,
      title: title.trim() !== original.title ? title.trim() : undefined,
      fileAs: fileAs.trim() !== original.fileAs ? fileAs.trim() : undefined,
      publisher: publisher.trim() !== original.publisher ? publisher.trim() : undefined,
      // isSeries: isSeries !== original.isSeries ? isSeries : undefined,
      series: series.trim() !== original.series ? series.trim() : undefined,
      seriesIndex:
        seriesIndex.trim() !== originalSeriesIndex
          ? Number.parseFloat(seriesIndex.trim())
          : undefined,
      description:
        description.trim() !== (original.description ?? '') ? description.trim() : undefined,
      subjects: !areStringArraysIdentical(newSubjects, original.subjects) ? newSubjects : undefined,
      identifiers: !areObjectArraysIdentical(newIdentifiers, original.identifiers)
        ? newIdentifiers
        : undefined,
    });
    navigate(path.book(newId ?? id!));
  }

  return (
    <Page>
      <div className={styles.topBar}>
        <Button disabled={saving} onClick={() => navigate(path.book(id!))} text="Cancel" />
        <h1 className={styles.heading}>Edit Metadata</h1>
        <Button
          type="primary"
          text={saving ? 'Saving…' : 'Save'}
          onClick={() => void handleSave()}
          loading={saving}
        />
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.form}>
        <label className={styles.label}>Cover Image</label>
        <input type="file" accept="image/*" onChange={handleCoverChange} />

        <label className={styles.label}>Title</label>
        <input className={styles.input} value={title} onChange={handleTitleChange} />

        <label className={styles.label}>Author</label>
        <input className={styles.input} value={author} onChange={handleAuthorChange} />

        <label className={styles.label}>File As</label>
        <input className={styles.input} value={fileAs} onChange={handleFileAsChange} />

        <label className={styles.label}>Publisher</label>
        <input className={styles.input} value={publisher} onChange={handlePublisherChange} />

        <label className={styles.label}>Series</label>
        <input className={styles.input} value={series} onChange={handleSeriesChange} />

        <label className={styles.label}>Series #</label>
        <input
          className={styles.input}
          type="number"
          value={seriesIndex}
          onChange={handleSeriesIndexChange}
        />

        <label className={styles.label}>Description</label>
        <textarea
          className={styles.textarea}
          value={description}
          onChange={handleDescriptionChange}
          rows={4}
        />

        <div className={styles.identifierSection}>
          <div className={styles.identifierHeader}>
            <span className={styles.label}>Subjects</span>
            <Button onClick={handleAddSubject} text="+ Add" />
          </div>
          {subjects.map((subject, index) => (
            <div key={subject._key} className={styles.identifierRow}>
              <input
                className={styles.input}
                placeholder="subject"
                value={subject.value}
                onChange={(event) => handleUpdateSubject(index, event.target.value)}
              />
              <Button type="text" danger onClick={() => handleRemoveSubject(index)} text="x" />
            </div>
          ))}
        </div>

        <div className={styles.identifierSection}>
          <div className={styles.identifierHeader}>
            <span className={styles.label}>Identifiers</span>
            <Button onClick={handleAddIdentifier} text="+ Add" />
          </div>
          {identifiers.map((identifier, index) => (
            <div key={identifier._key} className={styles.identifierRow}>
              <input
                className={styles.input}
                placeholder="scheme (e.g. isbn)"
                value={identifier.scheme}
                onChange={(event) => handleUpdateIdentifier(index, 'scheme', event.target.value)}
              />
              <input
                className={styles.input}
                placeholder="value"
                value={identifier.value}
                onChange={(event) => handleUpdateIdentifier(index, 'value', event.target.value)}
              />
              <Button type="text" danger onClick={() => handleRemoveIdentifier(index)} text="x" />
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
};
