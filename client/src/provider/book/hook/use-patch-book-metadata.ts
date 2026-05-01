import { useCallback, useContext, useState, useMemo } from 'react';

import { Context } from '../context';
import { Book } from '../type';

export type UsePatchBookMetadata = [
  (bookId: string, data: FormData) => Promise<void>,
  boolean,
  boolean,
  string | undefined,
];
export const usePatchBookMetadata = (): UsePatchBookMetadata => {
  const { setBookList } = useContext(Context);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const patchBookMetadata = useCallback(async (bookId: string, data: FormData): Promise<void> => {
    // Prevent multiple parallel requests
    if (loading === true) {
      return;
    }

    setLoading(true);
    setError(false);
    setErrorMessage(undefined);

    try {
      const response = await fetch(`/api/books/${encodeURIComponent(bookId)}/metadata`, {
        method: 'PATCH',
        body: data,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'Save failed');
      }
      const updatedBook = await (response.json() as Promise<Book>);
      setBookList((prev) => ({ ...prev, [updatedBook.id]: updatedBook }));
    } catch (err) {
      setError(true);
      if (err instanceof Error) setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return useMemo(
    () => [patchBookMetadata, loading, error, errorMessage],
    [patchBookMetadata, loading, error, errorMessage]
  );
};
