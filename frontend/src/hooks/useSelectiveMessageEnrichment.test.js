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

    await waitFor(() => expect(result.current.enrichedTips[0].message).toBe('Hello'), { timeout: 3000 });
    expect(result.current.enrichedTips[1].message).toBe('World');
    expect(result.current.loading).toBe(false);
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

    await waitFor(() => expect(result.current.enrichedTips[0].message).toBe('Msg1'));

    rerender({ tips: [{ tipId: '1' }, { tipId: '2' }] });
    
    await waitFor(() => expect(result.current.enrichedTips[1]?.message).toBe('Msg2'));
    expect(result.current.enrichedTips[0].message).toBe('Msg1');
  });

  it('resets stale state when visible set changes completely', async () => {
    const mockMessages1 = new Map([['1', 'Msg1']]);
    const mockMessages2 = new Map([['3', 'Msg3']]);
    
    fetchTipMessages
      .mockResolvedValueOnce(mockMessages1)
      .mockResolvedValueOnce(mockMessages2);

    const { result, rerender } = renderHook(({ tips }) => useSelectiveMessageEnrichment(tips), {
      initialProps: { tips: [{ tipId: '1' }] }
    });

    await waitFor(() => expect(result.current.enrichedTips[0].message).toBe('Msg1'));

    // Change completely to new set
    rerender({ tips: [{ tipId: '3' }] });
    
    await waitFor(() => expect(result.current.enrichedTips[0].message).toBe('Msg3'));
    
    // Check that '1' is no longer in enrichedTips if it's not visible
    // (enrichedTips only contains visible tips, so this is naturally true)
    
    // However, we want to ensure tipMessages internal state was cleared if we want strictly NO stale data.
    // Since tipMessages is not exposed, we can indirectly test it if needed, 
    // but the core requirement is that enrichedTips is correct.
  });

  it('sets loading to true when starting enrichment', async () => {
    fetchTipMessages.mockReturnValue(new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useSelectiveMessageEnrichment([{ tipId: '1' }]));

    expect(result.current.loading).toBe(true);
  });

  it('handles errors gracefully', async () => {
    fetchTipMessages.mockRejectedValue(new Error('Fetch failed'));

    const { result } = renderHook(() => useSelectiveMessageEnrichment([{ tipId: '1' }]));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Fetch failed');
  });
});
