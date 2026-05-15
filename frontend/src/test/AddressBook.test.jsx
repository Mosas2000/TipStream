import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddressBook from '../components/AddressBook';
import { addressBook } from '../lib/addressBook';

describe('AddressBook', () => {
  beforeEach(() => {
    localStorage.clear();
    addressBook.clear();
  });

  describe('rendering', () => {
    it('renders address book heading', () => {
      render(<AddressBook />);
      expect(screen.getByText('Address Book')).toBeInTheDocument();
    });

    it('renders add address button', () => {
      render(<AddressBook />);
      expect(screen.getByRole('button', { name: /add address/i })).toBeInTheDocument();
    });

    it('renders import/export button', () => {
      render(<AddressBook />);
      expect(screen.getByRole('button', { name: /import\/export/i })).toBeInTheDocument();
    });

    it('shows empty state when no addresses', () => {
      render(<AddressBook />);
      expect(screen.getByText(/your address book is empty/i)).toBeInTheDocument();
    });

    it('displays saved addresses', () => {
      addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', 'Friend');
      render(<AddressBook />);
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('shows address count in footer', () => {
      addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      addressBook.add('Bob', 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE');
      render(<AddressBook />);
      expect(screen.getByText('2 addresses saved')).toBeInTheDocument();
    });

    it('uses singular form for single address', () => {
      addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      render(<AddressBook />);
      expect(screen.getByText('1 address saved')).toBeInTheDocument();
    });
  });

  describe('add address form', () => {
    it('shows form when add button clicked', async () => {
      const user = userEvent.setup();
      render(<AddressBook />);
      
      await user.click(screen.getByRole('button', { name: /add address/i }));
      
      expect(screen.getByText('Add New Address')).toBeInTheDocument();
    });

    it('hides form when cancel button clicked', async () => {
      const user = userEvent.setup();
      render(<AddressBook />);
      
      await user.click(screen.getByRole('button', { name: /add address/i }));
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      
      expect(screen.queryByText('Add New Address')).not.toBeInTheDocument();
    });

    it('changes button text to cancel when form is shown', async () => {
      const user = userEvent.setup();
      render(<AddressBook />);
      
      const button = screen.getByRole('button', { name: /add address/i });
      await user.click(button);
      
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    beforeEach(() => {
      addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', 'Friend');
      addressBook.add('Bob', 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE', 'Colleague');
      addressBook.add('Charlie', 'SPZX6JZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ', 'Family');
    });

    it('filters addresses by label', async () => {
      const user = userEvent.setup();
      render(<AddressBook />);
      
      const searchInput = screen.getByPlaceholderText(/search by label/i);
      await user.type(searchInput, 'Alice');
      
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
      expect(screen.queryByText('Charlie')).not.toBeInTheDocument();
    });

    it('filters addresses by notes', async () => {
      const user = userEvent.setup();
      render(<AddressBook />);
      
      const searchInput = screen.getByPlaceholderText(/search by label/i);
      await user.type(searchInput, 'Friend');
      
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    });

    it('shows no results message when search has no matches', async () => {
      const user = userEvent.setup();
      render(<AddressBook />);
      
      const searchInput = screen.getByPlaceholderText(/search by label/i);
      await user.type(searchInput, 'NonExistent');
      
      expect(screen.getByText(/no addresses found matching/i)).toBeInTheDocument();
    });

    it('clears search when clear button clicked', async () => {
      const user = userEvent.setup();
      render(<AddressBook />);
      
      const searchInput = screen.getByPlaceholderText(/search by label/i);
      await user.type(searchInput, 'Alice');
      
      const clearButton = screen.getByLabelText(/clear search/i);
      await user.click(clearButton);
      
      expect(searchInput).toHaveValue('');
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });
  });

  describe('delete functionality', () => {
    it('deletes address when delete button clicked and confirmed', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn(() => true);
      
      addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      render(<AddressBook />);
      
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);
      
      expect(window.confirm).toHaveBeenCalled();
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
      expect(screen.getByText(/your address book is empty/i)).toBeInTheDocument();
    });

    it('does not delete when confirmation is cancelled', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn(() => false);
      
      addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      render(<AddressBook />);
      
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);
      
      expect(window.confirm).toHaveBeenCalled();
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });

  describe('edit functionality', () => {
    it('shows edit form when edit button clicked', async () => {
      const user = userEvent.setup();
      addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      render(<AddressBook />);
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);
      
      expect(screen.getByText('Edit Address')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    });
  });

  describe('compact mode', () => {
    it('renders in compact mode', () => {
      addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      render(<AddressBook compact={true} />);
      
      expect(screen.queryByText('Address Book')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /add address/i })).not.toBeInTheDocument();
    });

    it('shows addresses as clickable items in compact mode', () => {
      addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      render(<AddressBook compact={true} />);
      
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('calls onSelectAddress when address clicked in compact mode', async () => {
      const user = userEvent.setup();
      const onSelectAddress = vi.fn();
      addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      
      render(<AddressBook compact={true} onSelectAddress={onSelectAddress} />);
      
      const addressButton = screen.getByRole('button', { name: /alice/i });
      await user.click(addressButton);
      
      expect(onSelectAddress).toHaveBeenCalledWith('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', 'Alice');
    });
  });

  describe('import/export', () => {
    it('shows import/export panel when button clicked', async () => {
      const user = userEvent.setup();
      render(<AddressBook />);
      
      await user.click(screen.getByRole('button', { name: /import\/export/i }));
      
      expect(screen.getByText('Import/Export Address Book')).toBeInTheDocument();
    });

    it('hides import/export panel when close button clicked', async () => {
      const user = userEvent.setup();
      render(<AddressBook />);
      
      await user.click(screen.getByRole('button', { name: /import\/export/i }));
      const closeButton = screen.getByLabelText(/close/i);
      await user.click(closeButton);
      
      expect(screen.queryByText('Import/Export Address Book')).not.toBeInTheDocument();
    });
  });
});
