import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test-utils';
import { UploadZone } from './index';
import { uploadBooks, scanLibrary } from '../../../api/books';

vi.mock('../../../api/books', () => ({
  uploadBooks: vi.fn(),
  scanLibrary: vi.fn(),
}));

const noop = () => Promise.resolve();

it('renders drop zone text', () => {
  renderWithProviders(<UploadZone isAdmin={false} onUploadComplete={noop} onScanComplete={noop} />);
  expect(screen.getByText(/drop books here/i)).toBeInTheDocument();
});

it('shows scan button for admin', () => {
  renderWithProviders(<UploadZone isAdmin={true} onUploadComplete={noop} onScanComplete={noop} />);
  expect(screen.getByRole('button', { name: 'Scan Library' })).toBeInTheDocument();
});

it('hides scan button for non-admin', () => {
  renderWithProviders(<UploadZone isAdmin={false} onUploadComplete={noop} onScanComplete={noop} />);
  expect(screen.queryByRole('button', { name: 'Scan Library' })).not.toBeInTheDocument();
});

it('shows success status after upload', async () => {
  const user = userEvent.setup();
  vi.mocked(uploadBooks).mockResolvedValue({ uploaded: ['test.epub'] });
  const onUploadComplete = vi.fn();
  renderWithProviders(
    <UploadZone isAdmin={false} onUploadComplete={onUploadComplete} onScanComplete={noop} />
  );
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(['epub'], 'test.epub', { type: 'application/epub+zip' });
  await user.upload(input, file);
  await waitFor(() => expect(screen.getByText(/uploaded.*test\.epub/i)).toBeInTheDocument());
  expect(onUploadComplete).toHaveBeenCalled();
});

it('shows error status when upload fails', async () => {
  const user = userEvent.setup();
  vi.mocked(uploadBooks).mockRejectedValue(new Error('Upload failed'));
  renderWithProviders(<UploadZone isAdmin={false} onUploadComplete={noop} onScanComplete={noop} />);
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(['epub'], 'test.epub', { type: 'application/epub+zip' });
  await user.upload(input, file);
  await waitFor(() => expect(screen.getByText(/upload failed/i)).toBeInTheDocument());
});

it('calls scanLibrary and shows success on scan click', async () => {
  const user = userEvent.setup();
  vi.mocked(scanLibrary).mockResolvedValue({ imported: ['a.epub'], removed: [] });
  const onScanComplete = vi.fn();
  renderWithProviders(
    <UploadZone isAdmin={true} onUploadComplete={noop} onScanComplete={onScanComplete} />
  );
  await user.click(screen.getByRole('button', { name: 'Scan Library' }));
  await waitFor(() => expect(screen.getByText(/scan complete/i)).toBeInTheDocument());
  expect(onScanComplete).toHaveBeenCalled();
});
