import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { NewCard, Page } from '~/component';
import { Button, NumberInput, Switch, TextArea, TextInput, TextInputList } from '~/control';
import { useBook, usePatchBookMetadata } from '~/provider/book';
import { path } from '~/router';
import { areObjectArraysIdentical, areStringArraysIdentical } from '~/utils';

import { useStyle } from './style';

type SubjectRow = { values: [string]; _key: string };
type IdentifierRow = { values: [string, string]; _key: string };

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
  const handleSubjectAdd = useCallback(() => {
    setSubjects((prev) => [...prev, { values: [''], _key: crypto.randomUUID() }]);
  }, []);
  const handleRemoveSubject = useCallback((removeKey: string) => {
    setSubjects((prev) => prev.filter(({ _key }) => removeKey !== _key));
  }, []);
  const handleSubjectUpdate = useCallback(
    (subjectKey: string, valueIndex: number, newValue: string) => {
      setSubjects((prev) =>
        prev.map((row) =>
          subjectKey === row._key
            ? {
                ...row,
                values: row.values.map((value, index) =>
                  index === valueIndex ? newValue : value
                ) as [string],
              }
            : row
        )
      );
    },
    []
  );

  const [identifiers, setIdentifiers] = useState<IdentifierRow[]>([]);
  const handleIdentifierAdd = useCallback(() => {
    setIdentifiers((prev) => [...prev, { values: ['', ''], _key: crypto.randomUUID() }]);
  }, []);
  const handleIdentifierRemove = useCallback((removeKey: string) => {
    setIdentifiers((prev) => prev.filter(({ _key }) => removeKey !== _key));
  }, []);
  const handleIdentifierChange = useCallback(
    (identifierKey: string, valueIndex: number, newValue: string) => {
      setIdentifiers((prev) =>
        prev.map((row) =>
          identifierKey === row._key
            ? {
                ...row,
                values: row.values.map((value, index) =>
                  index === valueIndex ? newValue : value
                ) as [string, string],
              }
            : row
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
      setIsSeries(!!original.series);
      setSeries(original.series);
      setSeriesIndex(original.seriesIndex);
      setDescription(original.description ?? '');
      setSubjects(
        original.subjects.map((subject) => ({ values: [subject], _key: crypto.randomUUID() }))
      );
      setIdentifiers(
        original.identifiers.map((identifier) => ({
          values: [identifier.scheme, identifier.value],
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const newIdentifiers = identifiers.map(({ _key: _, ...rest }) => rest);
    const newSubjects = subjects.map((subject: SubjectRow) => subject.value.trim()).filter(Boolean);
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
      // identifiers: !areObjectArraysIdentical(newIdentifiers, original.identifiers)
      //   ? newIdentifiers
      //   : undefined,
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
        <TextInputList
          name="subjects"
          label="Subjects"
          valueList={subjects}
          onRowAdd={handleSubjectAdd}
        />
      </NewCard>

      {/*<NewCard>
        <div className={styles.identifierSection}>
          <span className={styles.label}>Subjects</span>
          {subjects.map((subject, index) => (
            <div key={subject._key} className={styles.identifierRow}>
              <Button danger onClick={() => handleRemoveSubject(index)}>
                x
              </Button>
              <input
                className={styles.input}
                placeholder="subject"
                value={subject.value}
                onChange={(event) => handleSubjectUpdate(index, event.target.value)}
              />
            </div>
          ))}
          <Button onClick={handleSubjectAdd}>Add</Button>
        </div>
      </NewCard>*/}

      <NewCard title="Identifiers">
        <TextInputList
          name="identifiers"
          label="Identifiers"
          valueList={identifiers}
          onRowAdd={handleIdentifierAdd}
          onFieldChange={handleIdentifierChange}
        />
      </NewCard>
      {/*<NewCard>
        <div className={styles.identifierSection}>
          <span className={styles.label}>Identifiers</span>
          {identifiers.map((identifier, index) => (
            <div key={identifier._key} className={styles.identifierRow}>
              <Button danger onClick={() => handleIdentifierRemove(index)} text="x" />
              <input
                className={styles.input}
                placeholder="scheme (e.g. isbn)"
                value={identifier.scheme}
                onChange={(event) => handleIdentifierChange(index, 'scheme', event.target.value)}
              />
              <input
                className={styles.input}
                placeholder="value"
                value={identifier.value}
                onChange={(event) => handleIdentifierChange(index, 'value', event.target.value)}
              />
            </div>
          ))}
          <Button onClick={handleIdentifierAdd} text="Add" />
        </div>
      </NewCard>*/}
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
