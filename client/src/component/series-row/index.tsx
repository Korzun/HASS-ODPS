import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../../control/button';
import { useSeriesBookList } from '../../provider/book';
import { useMySeriesProgress } from '../../provider/progress';
import * as path from '../../router/path';
import { Card } from '../card';
import { CoverStack } from '../cover-stack';

import { useStyle } from './style';

type SeriesRowProps = {
  seriesName: string; // sorted ascending by seriesIndex; books[0] = front cover
};
export function SeriesRow({ seriesName }: SeriesRowProps) {
  const styles = useStyle();
  const navigate = useNavigate();
  const [bookList, loading, error] = useSeriesBookList(seriesName);
  const [seriesProgressPercent] = useMySeriesProgress(seriesName);

  const handleNavigate = useCallback(() => {
    navigate(path.series(seriesName));
  }, []);

  if (loading === true) {
    return <Card>Loading...</Card>;
  }
  if (error === true) {
    return <Card>Error</Card>;
  }

  const meta: string[] = [];
  if (bookList[0]?.author) {
    meta.push(bookList[0]?.author);
  }
  meta.push(`${bookList.length} book${bookList.length !== 1 ? 's' : ''}`);
  if (seriesProgressPercent !== undefined) {
    meta.push(`${seriesProgressPercent}%`);
  }

  return (
    <Card onClick={handleNavigate}>
      <div className={styles.root}>
        <CoverStack
          seriesName={seriesName}
          containerWidth={58}
          containerHeight={74}
          layerWidth={44}
          layerHeight={62}
        />
        <div className={styles.info}>
          <div className={styles.name}>{seriesName}</div>
          <div className={styles.meta}>{meta.join(' · ')}</div>
          <Button type="link" text="View series →" />
        </div>
      </div>
    </Card>
  );
}
