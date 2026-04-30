import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { ScanResult, UploadResult } from '../../../provider/book';
import { useScanLibrary,useUploadBooks } from '../../../provider/book';
import { renderWithProviders } from '../../../test-utils';

import { UploadZone } from './index';

vi.mock('../../../provider/book', () => ({
  useUploadBooks: vi.fn(),
  useScanLibrary: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useUploadBooks).mockReturnValue([vi.fn(), false, false, undefined]);
  vi.mocked(useScanLibrary).mockReturnValue([vi.fn(), false, false, undefined]);
});

it('renders drop zone text', () => {
  renderWithProviders(<UploadZone isAdmin={false} />);
  expect(screen.getByText(/drop books here/i)).toBeInTheDocument();
});

it('shows scan button for admin', () => {
  renderWithProviders(<UploadZone isAdmin={true} />);
  expect(screen.getByRole('button', { name: 'Scan Library' })).toBeInTheDocument();
});

it('hides scan button for non-admin', () => {
  renderWithProviders(<UploadZone isAdmin={false} />);
  expect(screen.queryByRole('button', { name: 'Scan Library' })).not.toBeInTheDocument();
});

it('shows success status after upload', async () => {
  const user = userEvent.setup();
  const mockUpload = vi.fn().mockResolvedValue({ uploaded: ['test.epub'] } as UploadResult);
  vi.mocked(useUploadBooks).mockReturnValue([mockUpload, false, false, undefined]);
  renderWithProviders(<UploadZone isAdmin={false} />);
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(['epub'], 'test.epub', { type: 'application/epub+zip' });
  await user.upload(input, file);
  await waitFor(() => expect(screen.getByText(/✓ Uploaded.*test\.epub/i)).toBeInTheDocument());
});

it('shows error status when upload fails', async () => {
  const user = userEvent.setup();
  const mockUpload = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useUploadBooks).mockReturnValue([mockUpload, false, false, undefined]);
  renderWithProviders(<UploadZone isAdmin={false} />);
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(['epub'], 'test.epub', { type: 'application/epub+zip' });
  await user.upload(input, file);
  await waitFor(() => expect(screen.getByText(/upload failed/i)).toBeInTheDocument());
});

it('calls scanLibrary and shows success on scan click', async () => {
  const user = userEvent.setup();
  const mockScan = vi.fn().mockResolvedValue({ imported: ['a.epub'], removed: [] } as ScanResult);
  vi.mocked(useScanLibrary).mockReturnValue([mockScan, false, false, undefined]);
  renderWithProviders(<UploadZone isAdmin={true} />);
  await user.click(screen.getByRole('button', { name: 'Scan Library' }));
  await waitFor(() => expect(screen.getByText(/scan complete/i)).toBeInTheDocument());
  expect(mockScan).toHaveBeenCalled();
});

it('disables scan button while scanning', () => {
  vi.mocked(useScanLibrary).mockReturnValue([vi.fn(), true, false, undefined]);
  renderWithProviders(<UploadZone isAdmin={true} />);
  expect(screen.getByRole('button', { name: /scanning/i })).toBeDisabled();
});
