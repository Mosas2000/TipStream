import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SendTip from '../components/SendTip';
import { TipProvider } from '../context/TipContext';
import * as useBlockCheckModule from '../hooks/useBlockCheck';
import * as useBalanceModule from '../hooks/useBalance';
import * as useStxPriceModule from '../hooks/useStxPrice';
import * as stacksModule from '../utils/stacks';
import * as analyticsModule from '../lib/analytics';
import * as useTransactionFeeEstimateModule from '../hooks/useTransactionFeeEstimate';

vi.mock('../hooks/useBlockCheck');
vi.mock('../hooks/useBalance');
vi.mock('../hooks/useStxPrice');
vi.mock('../utils/stacks');
vi.mock('../lib/analytics');
vi.mock('../hooks/useTransactionFeeEstimate');
vi.mock('@stacks/connect', () => ({
  openContractCall: vi.fn(),
}));

vi.mock('../lib/contractEvents', () => ({
  contractEvents: {
    fetchAll: vi.fn().mockResolvedValue([]),
    subscribe: vi.fn(),
  },
  POLL_INTERVAL_MS: 30000,
  fetchAllContractEvents: vi.fn().mockResolvedValue([]),
}));

describe('SendTip - Transaction Fee Preview & Toggles', () => {
  const mockSenderAddress = 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T';
  const mockRecipient = 'SP2RDS2YKXMFSP4H9Q5D1FXF5K5J91TH1P5KH3HVP';
  const mockSetFeeLevel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(stacksModule, 'getSenderAddress').mockReturnValue(mockSenderAddress);
    vi.spyOn(useStxPriceModule, 'useStxPrice').mockReturnValue({
      toUsd: (stx) => (Number(stx) * 2.5).toFixed(2),
    });
    vi.spyOn(analyticsModule, 'analytics', 'get').mockReturnValue({
      trackTipStarted: vi.fn(),
      trackTipSubmitted: vi.fn(),
      trackTipConfirmed: vi.fn(),
      trackTipCancelled: vi.fn(),
      trackTipFailed: vi.fn(),
    });

    vi.spyOn(useBlockCheckModule, 'useBlockCheck').mockReturnValue({
      blocked: false,
      checking: false,
      checkBlocked: vi.fn(),
      reset: vi.fn(),
    });

    vi.spyOn(useBalanceModule, 'useBalance').mockReturnValue({
      balance: '100000000', // 100 STX
      balanceStx: 100,
      loading: false,
      refetch: vi.fn(),
    });
  });

  it('renders estimated gas fee and USD amount in breakdown', async () => {
    vi.spyOn(useTransactionFeeEstimateModule, 'useTransactionFeeEstimate').mockReturnValue({
      feeEstimateMicroSTX: 5000,
      feeEstimateSTX: 0.005,
      feeEstimateUsd: '0.01',
      highFeeWarning: false,
      feeLevel: 'medium',
      setFeeLevel: mockSetFeeLevel,
      speedEstimates: {},
      refresh: vi.fn(),
    });

    render(
      <TipProvider>
        <SendTip addToast={vi.fn()} />
      </TipProvider>
    );

    // Set recipient and tip amount using fast fireEvent to trigger breakdown synchronously
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('SP2...'), { target: { value: mockRecipient } });
      fireEvent.change(screen.getByPlaceholderText('0.5'), { target: { value: '1.0' } });
    });

    // Confirm gas fee preview is displayed with correct values
    const gasFeePreview = screen.getByTestId('gas-fee-preview');
    expect(gasFeePreview).toBeInTheDocument();
    expect(gasFeePreview).toHaveTextContent('0.005000 STX');
    expect(gasFeePreview).toHaveTextContent('~$0.01');
  });

  it('allows switching fee levels via speed toggle pills', async () => {
    vi.spyOn(useTransactionFeeEstimateModule, 'useTransactionFeeEstimate').mockReturnValue({
      feeEstimateMicroSTX: 5000,
      feeEstimateSTX: 0.005,
      feeEstimateUsd: '0.01',
      highFeeWarning: false,
      feeLevel: 'medium',
      setFeeLevel: mockSetFeeLevel,
      speedEstimates: {},
      refresh: vi.fn(),
    });

    render(
      <TipProvider>
        <SendTip addToast={vi.fn()} />
      </TipProvider>
    );

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('SP2...'), { target: { value: mockRecipient } });
      fireEvent.change(screen.getByPlaceholderText('0.5'), { target: { value: '1.0' } });
    });

    // Click "low" fee speed pill
    const lowPill = screen.getByTestId('fee-level-low');
    await act(async () => {
      fireEvent.click(lowPill);
    });

    expect(mockSetFeeLevel).toHaveBeenCalledWith('low');
  });

  it('renders high-fee warning banner when fee matches or exceeds threshold', async () => {
    vi.spyOn(useTransactionFeeEstimateModule, 'useTransactionFeeEstimate').mockReturnValue({
      feeEstimateMicroSTX: 60000,
      feeEstimateSTX: 0.06,
      feeEstimateUsd: '0.15',
      highFeeWarning: true,
      feeLevel: 'high',
      setFeeLevel: mockSetFeeLevel,
      speedEstimates: {},
      refresh: vi.fn(),
    });

    render(
      <TipProvider>
        <SendTip addToast={vi.fn()} />
      </TipProvider>
    );

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('SP2...'), { target: { value: mockRecipient } });
      fireEvent.change(screen.getByPlaceholderText('0.5'), { target: { value: '1.0' } });
    });

    // Verify warning is displayed
    const warningAlert = screen.getByTestId('high-fee-warning');
    expect(warningAlert).toBeInTheDocument();
    expect(warningAlert).toHaveTextContent('High Transaction Fee Warning');
  });
});
