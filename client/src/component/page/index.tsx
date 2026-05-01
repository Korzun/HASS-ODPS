import { Fragment } from 'react/jsx-runtime';

import { Header } from '../header';

import { useStyle } from './style';

export type PageProps = { children?: React.ReactNode };
export const Page = ({ children }: PageProps) => {
  const styles = useStyle();

  return (
    <Fragment>
      <Header />
      <main className={styles.root}>{children}</main>
    </Fragment>
  );
};
