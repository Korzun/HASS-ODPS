import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { NewCard, Page } from '~/component';
import { Button, FieldList, NumberInput, Switch, TextArea, TextInput } from '~/control';
import type { FieldRow } from '~/control';
import { useBook, usePatchBookMetadata } from '~/provider/book';
import { path } from '~/router';
import { areObjectArraysIdentical, areStringArraysIdentical } from '~/utils';

import { useStyle } from './style';

type SubjectRow = { _key: string; value: string };
type IdentifierRow = { _key: string; scheme: string; value: string };

export const BookEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const styles = useStyle();

  const [isEditValid, setIsEditValid] = useState<Record<string, boolean>>({});
  const handleIsValidChange = useCallback((fieldName: string, newValid: boolean) => {
    setIsEditValid((previous) => ({ ...previous, [fieldName]: newValid }));
  }, []);

  const [original, loading, error] = useBook(id!);
  const [patchBookMetadata, saving] = usePatchBookMetadata();

  const [cover, setCover] = useState<File | undefined>(undefined);
  const handleCoverChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setCover(event.target.files?.[0] ?? undefined);
  }, []);

  const [title, setTitle] = useState<string | undefined>();
  const handleTitleChange = useCallback((newTitle: string | undefined) => {
    setTitle(newTitle);
  }, []);

  const [author, setAuthor] = useState<string | undefined>('');
  const handleAuthorChange = useCallback((newAuthor: string | undefined) => {
    setAuthor(newAuthor);
  }, []);

  const [fileAs, setFileAs] = useState<string | undefined>('');
  const handleFileAsChange = useCallback((newFileAs: string | undefined) => {
    setFileAs(newFileAs);
  }, []);

  const [publisher, setPublisher] = useState<string | undefined>();
  const handlePublisherChange = useCallback((newPublisher: string | undefined) => {
    setPublisher(newPublisher);
  }, []);

  // Series
  const [isSeries, setIsSeries] = useState<boolean>(false);
  const handleIsSeriesChange = useCallback((newIsSeries: boolean) => {
    setIsSeries(newIsSeries);
  }, []);

  const [series, setSeries] = useState<string | undefined>();
  const handleSeriesChange = useCallback((newSeries: string | undefined) => {
    setSeries(newSeries);
  }, []);

  const [seriesIndex, setSeriesIndex] = useState<number | undefined>();
  const handleSeriesIndexChange = useCallback((seriesIndex: number | undefined) => {
    setSeriesIndex(seriesIndex);
  }, []);

  // Description
  const [description, setDescription] = useState<string | undefined>();
  const handleDescriptionChange = useCallback((newDescription: string | undefined) => {
    setDescription(newDescription);
  }, []);

  const [subjects, setSubjects] = useState<SubjectRow[]>([]);

  const [identifiers, setIdentifiers] = useState<IdentifierRow[]>([]);

  useEffect(() => {
    if (original) {
      setTitle(original.title);
      setAuthor(original.author);
      setFileAs(original.fileAs);
      setPublisher(original.publisher);
      setIsSeries(!!original.series);
      setSeries(original.series);
      setSeriesIndex(original.seriesIndex);
      setDescription(original.description ?? '');
      setSubjects(
        original.subjects.map((subject) => ({ value: subject, _key: crypto.randomUUID() }))
      );
      setIdentifiers(
        original.identifiers.map((identifier) => ({
          scheme: identifier.scheme,
          value: identifier.value,
          _key: crypto.randomUUID(),
        }))
      );
    }
  }, [original, id]);

  if (loading) return <p className={styles.loading}>Loading…</p>;
  if (!original) return <p className={styles.error}>{error ?? 'Book not found.'}</p>;

  async function handleSave() {
    if (!original || !id) {
      return;
    }

    const newSubjects = subjects.map((r) => r.value).filter(Boolean);
    const newIdentifiers = identifiers.map(({ _key, ...fields }) => fields);
    const originalSeriesIndex = original.seriesIndex !== 0 ? String(original.seriesIndex) : '';

    const newId = await patchBookMetadata(id, {
      cover,
      author: author && author.trim() !== original.author ? author.trim() : undefined,
      title: title && title.trim() !== original.title ? title.trim() : undefined,
      fileAs: fileAs && fileAs.trim() !== original.fileAs ? fileAs.trim() : undefined,
      publisher:
        publisher && publisher.trim() !== original.publisher ? publisher.trim() : undefined,
      // isSeries: isSeries !== original.isSeries ? isSeries : undefined,
      series: series && series.trim() !== original.series ? series.trim() : undefined,
      seriesIndex:
        seriesIndex && seriesIndex.toString() !== originalSeriesIndex ? seriesIndex : undefined,
      description:
        description && description.trim() !== (original.description ?? '')
          ? description.trim()
          : undefined,
      subjects: !areStringArraysIdentical(newSubjects, original.subjects) ? newSubjects : undefined,
      identifiers: !areObjectArraysIdentical(newIdentifiers, original.identifiers)
        ? newIdentifiers
        : undefined,
    });
    navigate(path.book(newId ?? id!));
  }

  return (
    <Page>
      <h1 className={styles.heading}>Edit Metadata — {original?.title}</h1>
      {error && <p className={styles.error}>{error}</p>}

      <NewCard>
        <div className={styles.cardContainer}>
          <TextInput value={title} label="Title" name="title" onChange={handleTitleChange} />
          <TextInput value={author} label="Author" name="author" onChange={handleAuthorChange} />
          <TextInput value={fileAs} label="File As" name="fileAs" onChange={handleFileAsChange} />
          <TextInput
            value={publisher}
            label="Publisher"
            name="publisher"
            onChange={handlePublisherChange}
          />
        </div>
      </NewCard>

      <NewCard title="Cover Image">
        <input type="file" accept="image/*" onChange={handleCoverChange} />
      </NewCard>

      <NewCard title="Description">
        <TextArea
          value={description}
          name="description"
          layout="vertical"
          onChange={handleDescriptionChange}
        />
      </NewCard>

      <NewCard
        title="Series"
        headerAction={<Switch name="isSeries" checked={isSeries} onChange={handleIsSeriesChange} />}
      >
        {isSeries && (
          <div className={styles.cardContainer}>
            <TextInput
              value={series}
              label="Name"
              name="seriesName"
              onChange={handleSeriesChange}
            />
            <NumberInput
              name="seriesIndex"
              value={seriesIndex}
              label="Order"
              onChange={handleSeriesIndexChange}
              onValidChange={handleIsValidChange}
            />
          </div>
        )}
      </NewCard>

      <NewCard title="Subjects">
        <FieldList
          addLabel="Add subject"
          columns={[{ type: 'text', key: 'value', placeholder: 'Subject' }]}
          rows={subjects as FieldRow[]}
          onAdd={() => setSubjects((prev) => [...prev, { _key: crypto.randomUUID(), value: '' }])}
          onRemove={(key) => setSubjects((prev) => prev.filter((r) => r._key !== key))}
          onChange={(key, field, val) =>
            setSubjects((prev) => prev.map((r) => r._key === key ? { ...r, [field]: val } : r))
          }
        />
      </NewCard>

      <NewCard title="Identifiers">
        <FieldList
          addLabel="Add identifier"
          columns={[
            { type: 'text', key: 'scheme', placeholder: 'Scheme (e.g. isbn)' },
            { type: 'text', key: 'value', placeholder: 'Value' },
          ]}
          rows={identifiers as FieldRow[]}
          onAdd={() =>
            setIdentifiers((prev) => [...prev, { _key: crypto.randomUUID(), scheme: '', value: '' }])
          }
          onRemove={(key) => setIdentifiers((prev) => prev.filter((r) => r._key !== key))}
          onChange={(key, field, val) =>
            setIdentifiers((prev) => prev.map((r) => r._key === key ? { ...r, [field]: val } : r))
          }
          onValidChange={handleIsValidChange}
        />
      </NewCard>
      <div className={styles.buttonContainer}>
        <div className={styles.spacer} />
        <Button disabled={saving} onClick={() => navigate(path.book(id!))}>
          Cancel
        </Button>
        <Button
          type="primary"
          disabled={Object.values(isEditValid).some((valid) => !valid)}
          onClick={() => void handleSave()}
          loading={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Page>
  );
};
