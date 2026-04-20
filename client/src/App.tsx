import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './theme/theme-provider';
import { AuthProvider } from './auth/auth-provider';
import { Header } from './components/header';
import { LibraryPage } from './components/library-page';
import { SeriesPage } from './components/series-page';
import { BookDetailPage } from './components/book-detail-page';
import { EditMetadataPage } from './components/edit-metadata-page';

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
