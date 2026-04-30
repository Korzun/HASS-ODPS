import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useSeriesBookList } from '../../provider/book';
import { useMySeriesProgress } from '../../provider/progress';
import { path } from '../../router';
import { Card } from '../card';
import { CoverStack } from '../cover-stack';

import { useStyle } from './style';

interface SeriesCardProps {
  seriesName: string;
}

export function SeriesCard({ seriesName }: SeriesCardProps) {
  const styles = useStyle();
  const navigate = useNavigate();

  const [ bookList, loading, error] = useSeriesBookList(seriesName);
  const [ seriesProgressPercent ] = useMySeriesProgress(seriesName);

  const handleNavigate = useCallback(() => {
    navigate(path.series(seriesName))
  }, []);

  if (loading === true) { return <Card>Loading...</Card> }
  if (error === true) { return <Card>Error</Card> }

  const author = bookList[0]?.author ?? '';
  const count = bookList.length;


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
          <div className={styles.meta}>
            {author.length > 0 ? `${author} · ` : ''}
            {count} book{count !== 1 ? 's' : ''}
            {seriesProgressPercent !== undefined && <span className={styles.progress}> · {seriesProgressPercent}%</span>}
          </div>
           <div className={styles.link}>View series →</div>
        </div>
      </div>
    </Card>
  );
}
