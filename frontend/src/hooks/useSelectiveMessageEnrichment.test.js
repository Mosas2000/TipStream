import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSelectiveMessageEnrichment } from './useSelectiveMessageEnrichment';
import { fetchTipMessages } from '../lib/fetchTipDetails';

vi.mock('../lib/fetchTipDetails', () => ({
  fetchTipMessages: vi.fn(),
}));

vi.mock('../lib/enrichmentMetrics', () => ({
  createEnrichmentMarker: vi.fn(() => ({
    stop: vi.fn(),
  })),
}));

describe('useSelectiveMessageEnrichment Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enriches tips with messages', async () => {
    const mockTips = [{ tipId: '1', data: 'a' }, { tipId: '2', data: 'b' }];
    const mockMessages = new Map([['1', 'Hello'], ['2', 'World']]);
    
    fetchTipMessages.mockResolvedValue(mockMessages);

    const { result } = renderHook(() => useSelectiveMessageEnrichment(mockTips));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.enrichedTips).toHaveLength(2);
    expect(result.current.enrichedTips[0].message).toBe('Hello');
    expect(result.current.enrichedTips[1].message).toBe('World');
  });

  it('maintains state across updates with overlapping IDs', async () => {
    const mockMessages1 = new Map([['1', 'Msg1']]);
    const mockMessages2 = new Map([['2', 'Msg2']]);
    
    fetchTipMessages
      .mockResolvedValueOnce(mockMessages1)
      .mockResolvedValueOnce(mockMessages2);

    const { result, rerender } = renderHook(({ tips }) => useSelectiveMessageEnrichment(tips), {
      initialProps: { tips: [{ tipId: '1' }] }
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.enrichedTips[0].message).toBe('Msg1');

    rerender({ tips: [{ tipId: '1' }, { tipId: '2' }] });
    
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.enrichedTips).toHaveLength(2);
    expect(result.current.enrichedTips[0].message).toBe('Msg1');
    expect(result.current.enrichedTips[1].message).toBe('Msg2');
  });
});
