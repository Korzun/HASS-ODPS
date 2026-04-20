import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './theme/theme-provider';
import { AuthProvider } from './auth/auth-provider';
import { Header } from './component/header';
import { LibraryPage } from './component/library-page';
import { SeriesPage } from './component/series-page';
import { BookDetailPage } from './component/book-detail-page';
import { EditMetadataPage } from './component/edit-metadata-page';

export function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Header />
          <Routes>
            <Route path="/" element={<LibraryPage />} />
            <Route path="/series/:name" element={<SeriesPage />} />
            <Route path="/books/:id" element={<BookDetailPage />} />
            <Route path="/books/:id/edit" element={<EditMetadataPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
