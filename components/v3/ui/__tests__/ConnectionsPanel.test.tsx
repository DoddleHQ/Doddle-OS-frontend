import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectionsPanel } from '@/components/v3/ui/ConnectionsPanel';
import { connectionService } from '@/lib/services/connectionService';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/',
}));

jest.mock('@/lib/services/connectionService', () => ({
  connectionService: {
    listConnections: jest.fn().mockResolvedValue([]),
    getSyncStates: jest.fn().mockResolvedValue([]),
    connectMagento: jest.fn().mockResolvedValue({}),
    connectGsc: jest.fn().mockResolvedValue({}),
    updateMagento: jest.fn().mockResolvedValue({}),
    updateGsc: jest.fn().mockResolvedValue({}),
    disconnect: jest.fn().mockResolvedValue(undefined),
    triggerSync: jest.fn().mockResolvedValue({ jobIds: [] }),
  },
}));

const mocked = connectionService as jest.Mocked<typeof connectionService>;

describe('ConnectionsPanel', () => {
  it('renders a card per source and validates required fields before connecting', async () => {
    render(<ConnectionsPanel workspaceId="w1" />);

    expect(await screen.findByText('Magento')).toBeTruthy();
    expect(screen.getByText('Google Search Console')).toBeTruthy();

    const connectButtons = await screen.findAllByRole('button', { name: /connect/i });
    fireEvent.click(connectButtons[0]);

    const submit = (await screen.findAllByRole('button', { name: /^connect$/i })).find(
      (b) => b.className.includes('btn-deploy'),
    );
    fireEvent.click(submit!);

    expect(await screen.findByText(/missing: Base URL, Access Token/i)).toBeTruthy();
    expect(mocked.connectMagento).not.toHaveBeenCalled();
  });
});
