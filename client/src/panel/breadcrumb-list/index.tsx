import React, { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../../control/button';
import * as path from '../../router/path';

import { useStyle } from './style';

export type Breadcrumb = {
  path: string;
  text: string;
  label?: string;
};

export type BreadcrumbListProps = {
  currentTitle: string;
  previous?: Breadcrumb[];
};
export const BreadcrumbList = ({ currentTitle, previous = [] }: BreadcrumbListProps) => {
  const navigate = useNavigate();
  const styles = useStyle();

  const breadcrumbList = [
    {
      path: path.library(),
      text: '← Library',
      label: 'Back to Library',
    },
    ...previous,
  ].reduce((breadcrumbList, breadcrumb) => {
    breadcrumbList.push(
      <Fragment key={breadcrumb.path}>
        <Button
          type="link"
          onClick={() => navigate(breadcrumb.path)}
          text={breadcrumb.text}
          title={breadcrumb.label}
        />
        <div className={styles.seperator}>/</div>
      </Fragment>
    );
    return breadcrumbList;
  }, [] as React.ReactNode[]);

  return (
    <div className={styles.root}>
      {breadcrumbList}
      <Button type="link" disabled onClick={() => {}} text={currentTitle} />
    </div>
  );
};
