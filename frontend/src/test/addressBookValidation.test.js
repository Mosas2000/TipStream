import { describe, it, expect } from 'vitest';
import { validateAddressBookEntry, formatAddress } from '../lib/addressValidation';

describe('validateAddressBookEntry', () => {
  describe('label validation', () => {
    it('accepts valid label', () => {
      const result = validateAddressBookEntry('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      expect(result.isValid).toBe(true);
      expect(result.errors.label).toBeUndefined();
    });

    it('rejects empty label', () => {
      const result = validateAddressBookEntry('', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      expect(result.isValid).toBe(false);
      expect(result.errors.label).toBe('Label is required');
    });

    it('rejects label exceeding 50 characters', () => {
      const longLabel = 'A'.repeat(51);
      const result = validateAddressBookEntry(longLabel, 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      expect(result.isValid).toBe(false);
      expect(result.errors.label).toBe('Label must be 50 characters or less');
    });

    it('accepts label with 50 characters', () => {
      const maxLabel = 'A'.repeat(50);
      const result = validateAddressBookEntry(maxLabel, 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      expect(result.isValid).toBe(true);
      expect(result.errors.label).toBeUndefined();
    });
  });

  describe('address validation', () => {
    it('accepts valid mainnet address', () => {
      const result = validateAddressBookEntry('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      expect(result.isValid).toBe(true);
      expect(result.errors.address).toBeUndefined();
    });

    it('accepts valid testnet address', () => {
      const result = validateAddressBookEntry('Alice', 'ST2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      expect(result.isValid).toBe(true);
      expect(result.errors.address).toBeUndefined();
    });

    it('rejects empty address', () => {
      const result = validateAddressBookEntry('Alice', '');
      expect(result.isValid).toBe(false);
      expect(result.errors.address).toBe('Address is required');
    });

    it('rejects invalid address format', () => {
      const result = validateAddressBookEntry('Alice', 'invalid-address');
      expect(result.isValid).toBe(false);
      expect(result.errors.address).toBe('Invalid Stacks address format');
    });

    it('rejects address with wrong prefix', () => {
      const result = validateAddressBookEntry('Alice', 'XX2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      expect(result.isValid).toBe(false);
      expect(result.errors.address).toBe('Invalid Stacks address format');
    });

    it('rejects address with wrong length', () => {
      const result = validateAddressBookEntry('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ');
      expect(result.isValid).toBe(false);
      expect(result.errors.address).toBe('Invalid Stacks address format');
    });
  });

  describe('notes validation', () => {
    it('accepts valid notes', () => {
      const result = validateAddressBookEntry('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', 'Test note');
      expect(result.isValid).toBe(true);
      expect(result.errors.notes).toBeUndefined();
    });

    it('accepts empty notes', () => {
      const result = validateAddressBookEntry('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', '');
      expect(result.isValid).toBe(true);
      expect(result.errors.notes).toBeUndefined();
    });

    it('rejects notes exceeding 200 characters', () => {
      const longNotes = 'A'.repeat(201);
      const result = validateAddressBookEntry('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', longNotes);
      expect(result.isValid).toBe(false);
      expect(result.errors.notes).toBe('Notes must be 200 characters or less');
    });

    it('accepts notes with 200 characters', () => {
      const maxNotes = 'A'.repeat(200);
      const result = validateAddressBookEntry('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', maxNotes);
      expect(result.isValid).toBe(true);
      expect(result.errors.notes).toBeUndefined();
    });
  });

  describe('multiple errors', () => {
    it('returns all validation errors', () => {
      const result = validateAddressBookEntry('', 'invalid', 'A'.repeat(201));
      expect(result.isValid).toBe(false);
      expect(result.errors.label).toBeDefined();
      expect(result.errors.address).toBeDefined();
      expect(result.errors.notes).toBeDefined();
    });
  });
});

describe('formatAddress', () => {
  const fullAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';

  it('returns full address by default', () => {
    const result = formatAddress(fullAddress);
    expect(result).toBe(fullAddress);
  });

  it('truncates address with specified length', () => {
    const result = formatAddress(fullAddress, 10);
    expect(result).toBe('SP2J6ZY48G...KNRV9EJ7');
  });

  it('returns full address if length is greater than address length', () => {
    const result = formatAddress(fullAddress, 100);
    expect(result).toBe(fullAddress);
  });

  it('handles short addresses', () => {
    const shortAddress = 'SP123';
    const result = formatAddress(shortAddress, 10);
    expect(result).toBe(shortAddress);
  });

  it('handles minimum truncation length', () => {
    const result = formatAddress(fullAddress, 8);
    expect(result).toBe('SP2J6ZY4...RV9EJ7');
  });
});
