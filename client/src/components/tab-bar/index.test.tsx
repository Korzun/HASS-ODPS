import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test-utils';
import { TabBar } from './index';

it('always renders the Library tab', () => {
  renderWithProviders(<TabBar active="library" onTabChange={() => {}} />);
  expect(screen.getByRole('button', { name: 'Library' })).toBeInTheDocument();
});

it('does not render the Users tab for non-admin', () => {
  renderWithProviders(
    <TabBar active="library" onTabChange={() => {}} />,
    { user: { username: 'alice', isAdmin: false } }
  );
  expect(screen.queryByRole('button', { name: 'Users' })).not.toBeInTheDocument();
});

it('renders the Users tab for admin', () => {
  renderWithProviders(
    <TabBar active="library" onTabChange={() => {}} />,
    { user: { username: 'admin', isAdmin: true } }
  );
  expect(screen.getByRole('button', { name: 'Users' })).toBeInTheDocument();
});

it('calls onTabChange with "users" when Users tab is clicked', async () => {
  const user = userEvent.setup();
  const handleChange = vi.fn();
  renderWithProviders(
    <TabBar active="library" onTabChange={handleChange} />,
    { user: { username: 'admin', isAdmin: true } }
  );
  await user.click(screen.getByRole('button', { name: 'Users' }));
  expect(handleChange).toHaveBeenCalledWith('users');
});

it('calls onTabChange with "library" when Library tab is clicked', async () => {
  const user = userEvent.setup();
  const handleChange = vi.fn();
  renderWithProviders(
    <TabBar active="users" onTabChange={handleChange} />,
    { user: { username: 'admin', isAdmin: true } }
  );
  await user.click(screen.getByRole('button', { name: 'Library' }));
  expect(handleChange).toHaveBeenCalledWith('library');
});
