import { PropsWithChildren } from 'react';
import { Fragment } from 'react/jsx-runtime';

import { Header } from '../header';

import { useStyle, PageType, PageTypeValue } from './style';

type PageProps = PropsWithChildren<{ type?: PageTypeValue }>;
export const Page = ({ children, type = PageType.default as PageTypeValue }: PageProps) => {
  const styles = useStyle();

  return (
    <Fragment>
      {type !== PageType.minimal && <Header />}
      <main className={styles[type]}>{children}</main>
    </Fragment>
  );
};
