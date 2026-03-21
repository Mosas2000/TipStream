import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminPauseControl from '../components/AdminPauseControl';

describe('AdminPauseControl', () => {
  const defaultProps = {
    proposal: null,
    currentHeight: 12000,
    isPaused: false,
    isAdmin: true,
    onRefresh: vi.fn(),
    onPropose: vi.fn(),
    onExecute: vi.fn(),
    onCancel: vi.fn(),
    showNotification: vi.fn(),
    isLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render pause control section', () => {
      render(<AdminPauseControl {...defaultProps} />);
      expect(screen.getByText('Contract Pause Control')).toBeTruthy();
    });

    it('should display status message for running system', () => {
      render(<AdminPauseControl {...defaultProps} />);
      expect(screen.getByText('System Running')).toBeTruthy();
    });

    it('should display status for paused system', () => {
      render(<AdminPauseControl {...defaultProps} isPaused={true} />);
      expect(screen.getByText('System Paused')).toBeTruthy();
    });

    it('should show admin notice when not admin', () => {
      render(<AdminPauseControl {...defaultProps} isAdmin={false} />);
      expect(screen.getByText(/restricted to contract admins/i)).toBeTruthy();
    });
  });

  describe('propose actions', () => {
    it('should show propose pause button when running', () => {
      render(<AdminPauseControl {...defaultProps} />);
      expect(screen.getByText('Propose Pause')).toBeTruthy();
    });

    it('should show propose unpause button when paused', () => {
      render(<AdminPauseControl {...defaultProps} isPaused={true} />);
      expect(screen.getByText('Propose Unpause')).toBeTruthy();
    });

    it('should call onPropose when pause button clicked', async () => {
      render(<AdminPauseControl {...defaultProps} />);
      fireEvent.click(screen.getByText('Propose Pause'));
      
      await waitFor(() => {
        expect(defaultProps.onPropose).toHaveBeenCalledWith(true);
      });
    });

    it('should call onPropose when unpause button clicked', async () => {
      render(<AdminPauseControl {...defaultProps} isPaused={true} />);
      fireEvent.click(screen.getByText('Propose Unpause'));
      
      await waitFor(() => {
        expect(defaultProps.onPropose).toHaveBeenCalledWith(false);
      });
    });

    it('should disable propose button for non-admin', () => {
      render(<AdminPauseControl {...defaultProps} isAdmin={false} />);
      const button = screen.getByText('Propose Pause');
      expect(button.disabled).toBe(true);
    });

    it('should show notification on successful propose', async () => {
      render(<AdminPauseControl {...defaultProps} />);
      fireEvent.click(screen.getByText('Propose Pause'));
      
      await waitFor(() => {
        expect(defaultProps.showNotification).toHaveBeenCalled();
      });
    });

    it('should refresh after proposal', async () => {
      render(<AdminPauseControl {...defaultProps} />);
      fireEvent.click(screen.getByText('Propose Pause'));
      
      await waitFor(() => {
        expect(defaultProps.onRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('proposal details', () => {
    it('should display pending proposal details', () => {
      const proposal = {
        value: true,
        effectiveHeight: 12144
      };
      
      render(
        <AdminPauseControl
          {...defaultProps}
          proposal={proposal}
        />
      );
      
      expect(screen.getByText('Pause')).toBeTruthy();
      expect(screen.getByText('12144')).toBeTruthy();
    });

    it('should show blocks remaining calculation', () => {
      const proposal = {
        value: true,
        effectiveHeight: 12100
      };
      
      render(
        <AdminPauseControl
          {...defaultProps}
          proposal={proposal}
          currentHeight={12000}
        />
      );
      
      expect(screen.getByText('100')).toBeTruthy();
    });

    it('should display warning for pending proposal', () => {
      const proposal = {
        value: true,
        effectiveHeight: 12144
      };
      
      render(
        <AdminPauseControl
          {...defaultProps}
          proposal={proposal}
        />
      );
      
      expect(screen.getByText(/A pause proposal is pending/i)).toBeTruthy();
    });

    it('should show unpause warning text', () => {
      const proposal = {
        value: false,
        effectiveHeight: 12144
      };
      
      render(
        <AdminPauseControl
          {...defaultProps}
          proposal={proposal}
          isPaused={true}
        />
      );
      
      expect(screen.getByText(/unpause proposal is pending/i)).toBeTruthy();
    });
  });

  describe('execute actions', () => {
    it('should show execute button when timelock expired', () => {
      const proposal = {
        value: true,
        effectiveHeight: 12000
      };
      
      render(
        <AdminPauseControl
          {...defaultProps}
          proposal={proposal}
          currentHeight={12100}
        />
      );
      
      expect(screen.getByText('Execute')).toBeTruthy();
    });

    it('should not show execute button when timelock not expired', () => {
      const proposal = {
        value: true,
        effectiveHeight: 12100
      };
      
      render(
        <AdminPauseControl
          {...defaultProps}
          proposal={proposal}
          currentHeight={12000}
        />
      );
      
      expect(screen.queryByText('Execute')).toBeFalsy();
    });

    it('should call onExecute when execute button clicked', async () => {
      const proposal = {
        value: true,
        effectiveHeight: 12000
      };
      
      render(
        <AdminPauseControl
          {...defaultProps}
          proposal={proposal}
          currentHeight={12100}
        />
      );
      
      fireEvent.click(screen.getByText('Execute'));
      
      await waitFor(() => {
        expect(defaultProps.onExecute).toHaveBeenCalled();
      });
    });

    it('should disable execute button for non-admin', () => {
      const proposal = {
        value: true,
        effectiveHeight: 12000
      };
      
      render(
        <AdminPauseControl
          {...defaultProps}
          proposal={proposal}
          currentHeight={12100}
          isAdmin={false}
        />
      );
      
      const button = screen.getByText('Execute');
      expect(button.disabled).toBe(true);
    });
  });

  describe('cancel actions', () => {
    it('should show cancel button when proposal pending', () => {
      const proposal = {
        value: true,
        effectiveHeight: 12100
      };
      
      render(
        <AdminPauseControl
          {...defaultProps}
          proposal={proposal}
        />
      );
      
      expect(screen.getByText('Cancel')).toBeTruthy();
    });

    it('should call onCancel when cancel button clicked', async () => {
      const proposal = {
        value: true,
        effectiveHeight: 12100
      };
      
      render(
        <AdminPauseControl
          {...defaultProps}
          proposal={proposal}
        />
      );
      
      fireEvent.click(screen.getByText('Cancel'));
      
      await waitFor(() => {
        expect(defaultProps.onCancel).toHaveBeenCalled();
      });
    });

    it('should disable cancel button for non-admin', () => {
      const proposal = {
        value: true,
        effectiveHeight: 12100
      };
      
      render(
        <AdminPauseControl
          {...defaultProps}
          proposal={proposal}
          isAdmin={false}
        />
      );
      
      const button = screen.getByText('Cancel');
      expect(button.disabled).toBe(true);
    });

    it('should show success notification on cancel', async () => {
      const proposal = {
        value: true,
        effectiveHeight: 12100
      };
      
      render(
        <AdminPauseControl
          {...defaultProps}
          proposal={proposal}
        />
      );
      
      fireEvent.click(screen.getByText('Cancel'));
      
      await waitFor(() => {
        expect(defaultProps.showNotification).toHaveBeenCalledWith(
          expect.stringContaining('cancelled'),
          'success'
        );
      });
    });

    it('should refresh after cancellation', async () => {
      const proposal = {
        value: true,
        effectiveHeight: 12100
      };
      
      render(
        <AdminPauseControl
          {...defaultProps}
          proposal={proposal}
        />
      );
      
      fireEvent.click(screen.getByText('Cancel'));
      
      await waitFor(() => {
        expect(defaultProps.onRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('loading states', () => {
    it('should show loading text while proposing', () => {
      render(<AdminPauseControl {...defaultProps} isLoading={true} />);
      expect(screen.getByText('Proposing...')).toBeTruthy();
    });

    it('should disable buttons while loading', () => {
      render(<AdminPauseControl {...defaultProps} isLoading={true} />);
      const button = screen.getByText('Proposing...');
      expect(button.disabled).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should show error notification on failed propose', async () => {
      const onPropose = vi.fn().mockRejectedValue(new Error('no-pending-change'));
      
      render(
        <AdminPauseControl
          {...defaultProps}
          onPropose={onPropose}
        />
      );
      
      fireEvent.click(screen.getByText('Propose Pause'));
      
      await waitFor(() => {
        expect(defaultProps.showNotification).toHaveBeenCalledWith(
          expect.stringContaining('Failed to propose'),
          'error'
        );
      });
    });

    it('should show error notification on failed execute', async () => {
      const onExecute = vi.fn().mockRejectedValue(new Error('timelock-not-expired'));
      const proposal = {
        value: true,
        effectiveHeight: 12000
      };
      
      render(
        <AdminPauseControl
          {...defaultProps}
          proposal={proposal}
          currentHeight={12100}
          onExecute={onExecute}
        />
      );
      
      fireEvent.click(screen.getByText('Execute'));
      
      await waitFor(() => {
        expect(defaultProps.showNotification).toHaveBeenCalledWith(
          expect.stringContaining('Failed to execute'),
          'error'
        );
      });
    });

    it('should prevent non-admin from proposing', async () => {
      render(<AdminPauseControl {...defaultProps} isAdmin={false} />);
      const button = screen.getByText('Propose Pause');
      expect(button.disabled).toBe(true);
    });
  });

  describe('status indicators', () => {
    it('should show running status with correct class', () => {
      const { container } = render(<AdminPauseControl {...defaultProps} />);
      expect(container.querySelector('.status-running')).toBeTruthy();
    });

    it('should show paused status with correct class', () => {
      const { container } = render(
        <AdminPauseControl {...defaultProps} isPaused={true} />
      );
      expect(container.querySelector('.status-paused')).toBeTruthy();
    });

    it('should show proposal-pending status with correct class', () => {
      const proposal = {
        value: true,
        effectiveHeight: 12100
      };
      
      const { container } = render(
        <AdminPauseControl
          {...defaultProps}
          proposal={proposal}
          currentHeight={12000}
        />
      );
      expect(container.querySelector('.status-proposal-pending')).toBeTruthy();
    });

    it('should show ready-to-execute status with correct class', () => {
      const proposal = {
        value: true,
        effectiveHeight: 12000
      };
      
      const { container } = render(
        <AdminPauseControl
          {...defaultProps}
          proposal={proposal}
          currentHeight={12100}
        />
      );
      expect(container.querySelector('.status-ready-to-execute')).toBeTruthy();
    });
  });
});
