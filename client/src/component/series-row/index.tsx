import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '~/control/button';
import { useSeriesBookList } from '~/provider/book';
import { useMySeriesProgress } from '~/provider/progress';
import { path } from '~/router';

import { CardRow } from '../card-row';
import { CoverStack } from '../cover-stack';

import { useStyle } from './style';

type SeriesRowProps = {
  seriesName: string;
};
export function SeriesRow({ seriesName }: SeriesRowProps) {
  const styles = useStyle();
  const navigate = useNavigate();
  const [bookList, loading, error] = useSeriesBookList(seriesName);
  const [seriesProgressPercent] = useMySeriesProgress(seriesName);

  const handleNavigate = useCallback(() => {
    navigate(path.series(seriesName));
  }, [seriesName, navigate]);

  if (loading === true) {
    return <CardRow>Loading...</CardRow>;
  }
  if (error === true) {
    return <CardRow>Error</CardRow>;
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
    <CardRow onClick={handleNavigate}>
      <div className={styles.root}>
        <CoverStack
          seriesName={seriesName}
          containerWidth={58}
          containerHeight={72}
          layerWidth={43}
          layerHeight={60}
        />
        <div className={styles.info}>
          <div className={styles.name}>{seriesName}</div>
          <div className={styles.meta}>{meta.join(' · ')}</div>
          {/*<Button type="link">View series →</Button>*/}
        </div>
      </div>
    </CardRow>
  );
}
