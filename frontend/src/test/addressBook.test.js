import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AddressBook, AddressBookEntry } from '../lib/addressBook';

describe('AddressBookEntry', () => {
  it('creates entry with all fields', () => {
    const entry = new AddressBookEntry({
      label: 'Alice',
      address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      notes: 'Test note',
    });

    expect(entry.label).toBe('Alice');
    expect(entry.address).toBe('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
    expect(entry.notes).toBe('Test note');
    expect(entry.id).toBeDefined();
    expect(entry.createdAt).toBeDefined();
    expect(entry.updatedAt).toBeDefined();
  });

  it('generates unique IDs', () => {
    const entry1 = new AddressBookEntry({
      label: 'Alice',
      address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
    });
    const entry2 = new AddressBookEntry({
      label: 'Bob',
      address: 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE',
    });

    expect(entry1.id).not.toBe(entry2.id);
  });

  it('serializes to JSON correctly', () => {
    const entry = new AddressBookEntry({
      id: 'test-id',
      label: 'Alice',
      address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      notes: 'Test note',
      createdAt: 1000,
      updatedAt: 2000,
    });

    const json = entry.toJSON();
    expect(json).toEqual({
      id: 'test-id',
      label: 'Alice',
      address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      notes: 'Test note',
      createdAt: 1000,
      updatedAt: 2000,
    });
  });
});

describe('AddressBook', () => {
  let addressBook;

  beforeEach(() => {
    localStorage.clear();
    addressBook = new AddressBook();
  });

  describe('add', () => {
    it('adds new entry', () => {
      const entry = addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', 'Test note');

      expect(entry.label).toBe('Alice');
      expect(entry.address).toBe('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      expect(entry.notes).toBe('Test note');
      expect(addressBook.getAll()).toHaveLength(1);
    });

    it('throws error for missing label', () => {
      expect(() => {
        addressBook.add('', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      }).toThrow('Label and address are required');
    });

    it('throws error for missing address', () => {
      expect(() => {
        addressBook.add('Alice', '');
      }).toThrow('Label and address are required');
    });

    it('throws error for duplicate address', () => {
      addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      
      expect(() => {
        addressBook.add('Bob', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      }).toThrow('Address already exists in address book');
    });

    it('persists to localStorage', () => {
      addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      
      const newAddressBook = new AddressBook();
      expect(newAddressBook.getAll()).toHaveLength(1);
      expect(newAddressBook.getAll()[0].label).toBe('Alice');
    });
  });

  describe('update', () => {
    it('updates entry label', () => {
      const entry = addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      
      addressBook.update(entry.id, { label: 'Alice Updated' });
      
      const updated = addressBook.findById(entry.id);
      expect(updated.label).toBe('Alice Updated');
    });

    it('updates entry address', () => {
      const entry = addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      
      addressBook.update(entry.id, { address: 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE' });
      
      const updated = addressBook.findById(entry.id);
      expect(updated.address).toBe('SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE');
    });

    it('updates entry notes', () => {
      const entry = addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      
      addressBook.update(entry.id, { notes: 'Updated note' });
      
      const updated = addressBook.findById(entry.id);
      expect(updated.notes).toBe('Updated note');
    });

    it('updates timestamp', () => {
      const entry = addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      const originalTimestamp = entry.updatedAt;
      
      addressBook.update(entry.id, { label: 'Alice Updated' });
      
      const updated = addressBook.findById(entry.id);
      expect(updated.updatedAt).toBeGreaterThan(originalTimestamp);
    });

    it('throws error for non-existent entry', () => {
      expect(() => {
        addressBook.update('non-existent-id', { label: 'Test' });
      }).toThrow('Entry not found');
    });

    it('throws error when updating to duplicate address', () => {
      const entry1 = addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      addressBook.add('Bob', 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE');
      
      expect(() => {
        addressBook.update(entry1.id, { address: 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE' });
      }).toThrow('Address already exists in address book');
    });
  });

  describe('delete', () => {
    it('deletes entry', () => {
      const entry = addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      
      addressBook.delete(entry.id);
      
      expect(addressBook.getAll()).toHaveLength(0);
      expect(addressBook.findById(entry.id)).toBeUndefined();
    });

    it('throws error for non-existent entry', () => {
      expect(() => {
        addressBook.delete('non-existent-id');
      }).toThrow('Entry not found');
    });

    it('persists deletion to localStorage', () => {
      const entry = addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      addressBook.delete(entry.id);
      
      const newAddressBook = new AddressBook();
      expect(newAddressBook.getAll()).toHaveLength(0);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', 'Friend');
      addressBook.add('Bob', 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE', 'Colleague');
      addressBook.add('Charlie', 'SPZX6JZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ', 'Family');
    });

    it('searches by label', () => {
      const results = addressBook.search('Alice');
      expect(results).toHaveLength(1);
      expect(results[0].label).toBe('Alice');
    });

    it('searches by address', () => {
      const results = addressBook.search('SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE');
      expect(results).toHaveLength(1);
      expect(results[0].label).toBe('Bob');
    });

    it('searches by notes', () => {
      const results = addressBook.search('Friend');
      expect(results).toHaveLength(1);
      expect(results[0].label).toBe('Alice');
    });

    it('is case insensitive', () => {
      const results = addressBook.search('alice');
      expect(results).toHaveLength(1);
      expect(results[0].label).toBe('Alice');
    });

    it('returns all entries for empty query', () => {
      const results = addressBook.search('');
      expect(results).toHaveLength(3);
    });

    it('returns empty array for no matches', () => {
      const results = addressBook.search('NonExistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('import/export', () => {
    it('exports data as JSON', () => {
      addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', 'Test');
      
      const exported = addressBook.exportData();
      const parsed = JSON.parse(exported);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].label).toBe('Alice');
    });

    it('imports valid data', () => {
      const data = JSON.stringify([
        {
          label: 'Alice',
          address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
          notes: 'Test',
        },
        {
          label: 'Bob',
          address: 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE',
          notes: 'Test 2',
        },
      ]);
      
      const result = addressBook.importData(data);
      
      expect(result.imported).toHaveLength(2);
      expect(result.skipped).toHaveLength(0);
      expect(addressBook.getAll()).toHaveLength(2);
    });

    it('skips duplicate addresses during import', () => {
      addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      
      const data = JSON.stringify([
        {
          label: 'Alice Duplicate',
          address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
        },
        {
          label: 'Bob',
          address: 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE',
        },
      ]);
      
      const result = addressBook.importData(data);
      
      expect(result.imported).toHaveLength(1);
      expect(result.skipped).toHaveLength(1);
      expect(addressBook.getAll()).toHaveLength(2);
    });

    it('skips invalid entries during import', () => {
      const data = JSON.stringify([
        {
          label: 'Alice',
        },
        {
          address: 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE',
        },
        {
          label: 'Charlie',
          address: 'SPZX6JZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ',
        },
      ]);
      
      const result = addressBook.importData(data);
      
      expect(result.imported).toHaveLength(1);
      expect(result.skipped).toHaveLength(2);
    });

    it('throws error for invalid JSON', () => {
      expect(() => {
        addressBook.importData('invalid json');
      }).toThrow('Import failed');
    });

    it('throws error for non-array data', () => {
      expect(() => {
        addressBook.importData('{"label":"Alice"}');
      }).toThrow('Invalid data format');
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      addressBook.add('Bob', 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE');
      
      addressBook.clear();
      
      expect(addressBook.getAll()).toHaveLength(0);
    });

    it('persists clear to localStorage', () => {
      addressBook.add('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      addressBook.clear();
      
      const newAddressBook = new AddressBook();
      expect(newAddressBook.getAll()).toHaveLength(0);
    });
  });
});
