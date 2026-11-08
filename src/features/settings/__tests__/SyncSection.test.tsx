import { fireEvent, render, screen } from '@testing-library/react-native';

import { SyncSection, type SyncSectionProps } from '../SyncSection';

const NOW = Date.UTC(2026, 10, 8, 21);

async function renderSection(props: Partial<SyncSectionProps> = {}) {
  const defaults: SyncSectionProps = {
    configured: true,
    status: 'idle',
    lastSyncedAt: NOW - 3 * 60_000,
    lastError: null,
    pending: 0,
    now: NOW,
    onSyncNow: jest.fn(),
  };
  await render(<SyncSection {...defaults} {...props} />);
  return { ...defaults, ...props };
}

describe('SyncSection', () => {
  test('says everything is synced and when', async () => {
    await renderSection();

    expect(screen.getByText('Everything is synced')).toBeOnTheScreen();
    expect(screen.getByText('Last synced 3 minutes ago')).toBeOnTheScreen();
  });

  test('counts changes waiting to sync', async () => {
    await renderSection({ pending: 2 });

    expect(screen.getByText('2 changes waiting to sync')).toBeOnTheScreen();
  });

  test('shows the last error', async () => {
    await renderSection({ status: 'error', lastError: 'Network request failed', pending: 1 });

    expect(screen.getByText('Last sync failed: Network request failed')).toBeOnTheScreen();
    expect(screen.getByText('1 change waiting to sync')).toBeOnTheScreen();
  });

  test('forces a sync', async () => {
    const { onSyncNow } = await renderSection();

    fireEvent.press(screen.getByRole('button', { name: 'Sync now' }));

    expect(onSyncNow).toHaveBeenCalledTimes(1);
  });

  test('disables the button while a sync is running', async () => {
    await renderSection({ status: 'syncing' });

    expect(screen.getByText('Syncing…')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Sync now' })).toBeDisabled();
  });

  test('explains when sync is not set up on this build', async () => {
    await renderSection({ configured: false, lastSyncedAt: null });

    expect(screen.getByText(/Sync isn't set up on this build/)).toBeOnTheScreen();
  });

  test('says when it has never synced', async () => {
    await renderSection({ lastSyncedAt: null });

    expect(screen.getByText('Not synced yet')).toBeOnTheScreen();
  });
});
