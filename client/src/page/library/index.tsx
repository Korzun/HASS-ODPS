import { Page } from '../../component/page';
import { BookListPanel } from '../../panel/book-list';
import { LibraryScanPanel } from '../../panel/library-scan';
import { UploadZonePanel } from '../../panel/upload-zone';

export const LibraryPage = () => (
  <Page>
    <LibraryScanPanel />
    <UploadZonePanel />
    <BookListPanel />
  </Page>
);
