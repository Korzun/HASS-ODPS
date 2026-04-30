import { Page } from '../../component/page';
import { BookListPanel } from '../../panel/book-list';
import { LibraryScanPanel } from '../../panel/library-scan';
import { NavigationPanel } from '../../panel/navigation';
import { UploadZonePanel } from '../../panel/upload-zone';

export const LibraryPage = () => (
  <Page>
    <NavigationPanel active='library'/>
    <LibraryScanPanel/>
    <UploadZonePanel/>
    <BookListPanel/>
  </Page>
);
