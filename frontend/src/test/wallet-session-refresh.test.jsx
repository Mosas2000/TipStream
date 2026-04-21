import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SendTip from '../components/SendTip';
import TokenTip from '../components/TokenTip';
import BatchTip from '../components/BatchTip';
import BlockManager from '../components/BlockManager';
import * as transactions from '@stacks/transactions';

const mocks = vi.hoisted(() => {
  const state = {
    currentSenderAddress: 'SP1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  };

  const openContractCall = vi.fn(async (args) => {
    args.onFinish?.({ txId: '0xabc' });
  });

  const fetchCallReadOnlyFunction = vi.fn(async () => ({}));
  const cvToJSON = vi.fn(() => ({ value: true }));
  const tipPostCondition = vi.fn((senderAddress, amountMicroSTX) => ({
    senderAddress,
    amountMicroSTX,
  }));
  const pcPrincipal = vi.fn((senderAddress) => ({
    willSendLte: vi.fn((amount) => ({
      ustx: vi.fn(() => ({ senderAddress, amount, kind: 'ustx' })),
      ft: vi.fn(() => ({ senderAddress, amount, kind: 'ft' })),
    })),
  }));

  return {
    state,
    openContractCall,
    fetchCallReadOnlyFunction,
    cvToJSON,
    tipPostCondition,
    pcPrincipal,
  };
});

vi.mock('@stacks/connect', () => ({
  openContractCall: mocks.openContractCall,
}));

vi.mock('@stacks/transactions', () => ({
  fetchCallReadOnlyFunction: mocks.fetchCallReadOnlyFunction,
  cvToJSON: mocks.cvToJSON,
  principalCV: vi.fn((value) => value),
  stringUtf8CV: vi.fn((value) => value),
  uintCV: vi.fn((value) => value),
  contractPrincipalCV: vi.fn((address, name) => `${address}.${name}`),
  listCV: vi.fn((value) => value),
  tupleCV: vi.fn((value) => value),
  PostConditionMode: { Deny: 'deny' },
  Pc: { principal: mocks.pcPrincipal },
}));

vi.mock('../lib/post-conditions', async () => {
  const actual = await vi.importActual('../lib/post-conditions');
  return {
    ...actual,
    tipPostCondition: mocks.tipPostCondition,
  };
});

vi.mock('../hooks/useSenderAddress', () => ({
  useSenderAddress: vi.fn(() => mocks.state.currentSenderAddress),
}));

vi.mock('../hooks/useBlockCheck', () => ({
  useBlockCheck: vi.fn(() => ({
    blocked: false,
    checking: false,
    checkBlocked: vi.fn(),
    reset: vi.fn(),
  })),
}));

vi.mock('../hooks/useBalance', () => ({
  useBalance: vi.fn(() => ({
    balance: '1000000000',
    balanceStx: 1000,
    loading: false,
    refetch: vi.fn(),
  })),
}));

vi.mock('../hooks/useStxPrice', () => ({
  useStxPrice: vi.fn(() => ({
    toUsd: vi.fn(() => '50.00'),
  })),
}));

vi.mock('../context/DemoContext', () => ({
  useDemoMode: vi.fn(() => ({
    demoEnabled: false,
    getDemoData: vi.fn(() => ({ mockWalletAddress: mocks.state.currentSenderAddress })),
    toggleDemo: vi.fn(),
  })),
}));

vi.mock('../context/TipContext', () => ({
  useTipContext: vi.fn(() => ({
    notifyTipSent: vi.fn(),
  })),
}));

vi.mock('../lib/analytics', () => ({
  analytics: {
    trackTipStarted: vi.fn(),
    trackTipSubmitted: vi.fn(),
    trackTipConfirmed: vi.fn(),
    trackTipCancelled: vi.fn(),
    trackTipFailed: vi.fn(),
    trackBatchTipStarted: vi.fn(),
    trackBatchTipSubmitted: vi.fn(),
    trackBatchSize: vi.fn(),
    trackBatchTipCancelled: vi.fn(),
    trackBatchTipFailed: vi.fn(),
    trackBatchTipConfirmed: vi.fn(),
  },
}));

vi.mock('../components/ui/confirm-dialog', () => ({
  default: ({ open, title, children, onConfirm, onCancel, confirmLabel }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <div>{children}</div>
        <button onClick={onConfirm}>{confirmLabel}</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

vi.mock('../components/ui/tx-status', () => ({
  default: () => <div data-testid="tx-status" />,
}));

vi.mock('../utils/stacks', () => ({
  network: { id: 'testnet' },
  appDetails: { name: 'TipStream' },
}));

beforeEach(() => {
  mocks.state.currentSenderAddress = 'SP1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  mocks.openContractCall.mockClear();
  mocks.fetchCallReadOnlyFunction.mockClear();
  mocks.cvToJSON.mockClear();
  mocks.tipPostCondition.mockClear();
  mocks.pcPrincipal.mockClear();
});

describe('wallet session refresh', () => {
  it('updates SendTip validation when the sender changes', async () => {
    const user = userEvent.setup();

    const { rerender } = render(<SendTip addToast={vi.fn()} />);

    await user.type(screen.getByLabelText('Recipient Address'), mocks.state.currentSenderAddress);

    await waitFor(() => {
      expect(screen.getByText('You cannot send a tip to yourself')).toBeInTheDocument();
    });

    mocks.state.currentSenderAddress = 'SP2BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
    rerender(<SendTip addToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText('You cannot send a tip to yourself')).toBeNull();
    });
  });

  it('uses the current sender in SendTip post conditions after account switch', async () => {
    const user = userEvent.setup();

    const { rerender } = render(<SendTip addToast={vi.fn()} />);

    mocks.state.currentSenderAddress = 'SP2BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
    rerender(<SendTip addToast={vi.fn()} />);

    await user.type(screen.getByLabelText('Recipient Address'), 'SP3CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC');
    await user.type(screen.getByLabelText('Amount (STX)'), '1');
    await user.click(screen.getByRole('button', { name: 'Send Tip' }));

    const dialog = await screen.findByRole('dialog', { name: 'Confirm Tip' });
    await user.click(within(dialog).getByRole('button', { name: 'Send Tip' }));

    expect(mocks.tipPostCondition).toHaveBeenCalledWith(mocks.state.currentSenderAddress, 1000000);
  });

  it('updates TokenTip validation when the sender changes', async () => {
    const user = userEvent.setup();

    const { rerender } = render(<TokenTip addToast={vi.fn()} />);

    await user.type(screen.getByLabelText('Recipient Address'), mocks.state.currentSenderAddress);

    await waitFor(() => {
      expect(screen.getByText('Cannot send a tip to yourself')).toBeInTheDocument();
    });

    mocks.state.currentSenderAddress = 'SP3CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC';
    rerender(<TokenTip addToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText('Cannot send a tip to yourself')).toBeNull();
    });
  });

  it('uses the current sender in TokenTip post conditions after account switch', async () => {
    const user = userEvent.setup();

    const { rerender } = render(<TokenTip addToast={vi.fn()} />);

    mocks.state.currentSenderAddress = 'SP3CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC';
    rerender(<TokenTip addToast={vi.fn()} />);

    await user.type(screen.getByLabelText('Token Contract'), 'SP2RDS2YKXMFSP4H9Q5D1FXF5K5J91TH1P5KH3HVP.token');
    await user.click(screen.getByRole('button', { name: 'Check whitelist status' }));
    await waitFor(() => {
      expect(screen.getByText('Token is whitelisted')).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText('Recipient Address'), 'SP4DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD');
    await user.type(screen.getByLabelText('Amount (smallest token unit)'), '100');
    await user.click(screen.getByRole('button', { name: 'Send Token Tip' }));

    const dialog = await screen.findByRole('dialog', { name: 'Confirm Token Tip' });
    await user.click(within(dialog).getByRole('button', { name: 'Send Token Tip' }));

    expect(mocks.openContractCall).toHaveBeenCalled();
    expect(transactions.Pc.principal).toHaveBeenCalledWith(mocks.state.currentSenderAddress);
  });

  it('updates BatchTip validation when the sender changes', async () => {
    const { rerender } = render(<BatchTip addToast={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('SP2... recipient address'), {
      target: { value: mocks.state.currentSenderAddress },
    });
    fireEvent.change(screen.getByPlaceholderText('STX'), { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByText('Cannot tip yourself')).toBeInTheDocument();
    });

    mocks.state.currentSenderAddress = 'SP4DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD';
    rerender(<BatchTip addToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText('Cannot tip yourself')).toBeNull();
    });
  });

  it('uses the current sender in BatchTip post conditions after account switch', async () => {
    const { rerender } = render(<BatchTip addToast={vi.fn()} />);

    mocks.state.currentSenderAddress = 'SP4DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD';
    rerender(<BatchTip addToast={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('SP2... recipient address'), {
      target: { value: 'SP5EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE' },
    });
    fireEvent.change(screen.getByPlaceholderText('STX'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send 1 Tip' }));

    const dialog = await screen.findByRole('dialog', { name: 'Confirm Batch Tips' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send 1 Tip' }));

    expect(mocks.openContractCall).toHaveBeenCalled();
    expect(transactions.Pc.principal).toHaveBeenCalledWith(mocks.state.currentSenderAddress);
  });

  it('uses the current sender in block checks after account switch', async () => {
    const { rerender } = render(<BlockManager addToast={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('User Address'), {
      target: { value: mocks.state.currentSenderAddress },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check block status' }));

    expect(mocks.fetchCallReadOnlyFunction).not.toHaveBeenCalled();

    mocks.state.currentSenderAddress = 'SP6FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF';
    rerender(<BlockManager addToast={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Check block status' }));

    await waitFor(() => {
      expect(mocks.fetchCallReadOnlyFunction).toHaveBeenCalled();
    });
    expect(mocks.fetchCallReadOnlyFunction.mock.calls.at(-1)[0].senderAddress).toBe(mocks.state.currentSenderAddress);
  });
});
