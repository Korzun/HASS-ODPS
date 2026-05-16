import { ListCheckIcon } from '~/icon';

import { useStyle } from './style';

type ChapterProgressProps = {
  current: number;
  total: number;
};

export const ChapterProgress = ({ current, total }: ChapterProgressProps) => {
  const style = useStyle();

  return (
    <div className={style.root}>
      <span className={style.title}>Chapters:</span>
      <ListCheckIcon width={12} height={12} strokeWidth={2.5} />
      <span className={style.label}>
        {current} / {total}
      </span>
    </div>
  );
};
