import { useCallback } from 'react';

import { useRegenChapters } from '~/provider/book';

import { Button, ButtonRadiusValue } from '../button';

interface RegenChaptersButtonProps {
  bookId: string;
  radius?: ButtonRadiusValue;
}

export function RegenChaptersButton({ bookId, radius }: RegenChaptersButtonProps) {
  const [regenChapters, loading] = useRegenChapters();

  const handleClick = useCallback(() => {
    void regenChapters(bookId);
  }, [regenChapters, bookId]);

  return (
    <Button onClick={handleClick} loading={loading} disabled={loading} radius={radius}>
      Regen chapters
    </Button>
  );
}
