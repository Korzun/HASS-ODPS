import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { BookPage } from '../page/book';
import { BookEditPage } from '../page/book-edit';
import { LibraryPage } from '../page/library';
import { LoginPage } from '../page/login';
import { SeriesPage } from '../page/series';
import { UserListPage } from '../page/user-list';

import * as path from './path-internal';
import * as pathKey from './path-key-internal';
import { ProtectedRoute } from './protected-route';

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={path.login()} element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path={path.library()} element={<LibraryPage />} />
          <Route path={path.series(pathKey.seriesName)} element={<SeriesPage />} />
          <Route path={path.book(pathKey.bookId)} element={<BookPage />} />
          <Route path={path.bookEdit(pathKey.bookId)} element={<BookEditPage />} />
          <Route path={path.userList()} element={<UserListPage />} />
          <Route path="*" element={<Navigate to={path.library()} replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
