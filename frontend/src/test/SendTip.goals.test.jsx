import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SendTip from '../components/SendTip';
import { TipProvider } from '../context/TipContext';
import * as useBlockCheckModule from '../hooks/useBlockCheck';
import * as useBalanceModule from '../hooks/useBalance';
import * as useStxPriceModule from '../hooks/useStxPrice';
import * as stacksModule from '../utils/stacks';
import * as analyticsModule from '../lib/analytics';
import * as useTransactionFeeEstimateModule from '../hooks/useTransactionFeeEstimate';
import * as goalsServiceModule from '../services/goals';

vi.mock('../hooks/useBlockCheck');
vi.mock('../hooks/useBalance');
vi.mock('../hooks/useStxPrice');
vi.mock('../utils/stacks');
vi.mock('../lib/analytics');
vi.mock('../hooks/useTransactionFeeEstimate');
vi.mock('../services/goals');
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

describe('SendTip - Creator Tipping Goals', () => {
  const mockSenderAddress = 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T';
  const mockRecipient = 'SP2RDS2YKXMFSP4H9Q5D1FXF5K5J91TH1P5KH3HVP';
  const mockGoal = {
    creatorAddress: mockRecipient,
    goalTitle: 'Buy a new Camera',
    goalTarget: 200,
    goalDescription: 'Upgrading the stream quality!',
    goalSlug: 'new-camera',
    currentProgress: 50,
    active: true,
  };

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

    vi.spyOn(useTransactionFeeEstimateModule, 'useTransactionFeeEstimate').mockReturnValue({
      feeEstimateMicroSTX: 5000,
      feeEstimateSTX: 0.005,
      feeEstimateUsd: '0.01',
      highFeeWarning: false,
      feeLevel: 'medium',
      setFeeLevel: vi.fn(),
      speedEstimates: {},
      refresh: vi.fn(),
    });
  });

  it('renders the goals widget when a recipient has an active goal', async () => {
    vi.spyOn(goalsServiceModule, 'fetchCreatorGoal').mockResolvedValue(mockGoal);

    render(
      <TipProvider>
        <SendTip addToast={vi.fn()} />
      </TipProvider>
    );

    // Enter recipient to trigger goal fetch
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('SP2...'), { target: { value: mockRecipient } });
    });

    // Check if goal widget is displayed
    const titleText = await screen.findByText('Buy a new Camera');
    expect(titleText).toBeInTheDocument();
    
    // Check if progress percent and text are rendered correctly
    expect(screen.getByText('25% Raised')).toBeInTheDocument();
    expect(screen.getByText('50.00 / 200.00 STX')).toBeInTheDocument();
  });

  it('allows user to untoggle contribution to goal', async () => {
    vi.spyOn(goalsServiceModule, 'fetchCreatorGoal').mockResolvedValue(mockGoal);

    render(
      <TipProvider>
        <SendTip addToast={vi.fn()} />
      </TipProvider>
    );

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('SP2...'), { target: { value: mockRecipient } });
    });

    await screen.findByText('Buy a new Camera');
    
    const contributeCheckbox = screen.getByRole('checkbox', { name: /contribute/i });
    expect(contributeCheckbox).toBeChecked();

    // Toggle off contribution
    await act(async () => {
      fireEvent.click(contributeCheckbox);
    });

    expect(contributeCheckbox).not.toBeChecked();
  });
});
