import { renderHook, waitFor } from '@testing-library/react';
import { fetchV3Workspaces, useV3Fetch, v3Ago } from '@/lib/v3/data';
import { workspaceService } from '@/lib/services/workspaceService';

jest.mock('@/lib/services/workspaceService', () => ({
  workspaceService: { listWorkspaces: jest.fn() },
}));
jest.mock('@/lib/services/authService', () => ({
  getMe: jest.fn().mockRejectedValue(new Error('offline')),
}));

const ws = workspaceService as jest.Mocked<typeof workspaceService>;

describe('v3 data layer · workspaces + fetch hook', () => {
  beforeEach(() => jest.clearAllMocks());

  it('maps real workspaces from the workspace service', async () => {
    ws.listWorkspaces.mockResolvedValue({
      items: [
        {
          workspaceId: 'w_abc',
          name: 'Acme SaaS',
          websiteDomain: 'acme.io',
          createdAt: '',
          updatedAt: null,
          organizationName: 'Acme Org',
        },
      ],
      total: 1,
      skip: 0,
      limit: 100,
    });
    const list = await fetchV3Workspaces();
    expect(list).toEqual([{ id: 'w_abc', name: 'Acme SaaS', domain: 'acme.io', orgName: 'Acme Org' }]);
  });

  it('useV3Fetch exposes loading → data, error → retryable', async () => {
    let calls = 0;
    const { result } = renderHook(() =>
      useV3Fetch(async () => {
        calls += 1;
        if (calls === 1) throw new Error('offline');
        return ['x'];
      }, []),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('offline');
    expect(result.current.data).toBeNull();
    result.current.reload();
    await waitFor(() => expect(result.current.data).toEqual(['x']));
    expect(result.current.error).toBeNull();
  });

  it('v3Ago renders short relative times', () => {
    expect(v3Ago(null)).toBe('—');
    const now = Date.now();
    expect(v3Ago(new Date(now - 14 * 60000).toISOString())).toBe('14m ago');
    expect(v3Ago(new Date(now - 3 * 3600000).toISOString())).toBe('3h ago');
  });
});
