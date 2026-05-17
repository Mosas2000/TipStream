const STORAGE_KEY = 'tipstream_address_book';

export class AddressBookEntry {
  constructor({ id, label, address, notes = '', createdAt = Date.now(), updatedAt = Date.now() }) {
    this.id = id || crypto.randomUUID();
    this.label = label;
    this.address = address;
    this.notes = notes;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      label: this.label,
      address: this.address,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export class AddressBook {
  constructor() {
    this.entries = this.load();
  }

  load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return parsed.map(entry => new AddressBookEntry(entry));
    } catch (error) {
      console.error('Failed to load address book:', error);
      return [];
    }
  }

  save() {
    try {
      const data = JSON.stringify(this.entries.map(entry => entry.toJSON()));
      localStorage.setItem(STORAGE_KEY, data);
      return true;
    } catch (error) {
      console.error('Failed to save address book:', error);
      return false;
    }
  }

  add(label, address, notes = '') {
    if (!label || !address) {
      throw new Error('Label and address are required');
    }

    const sanitizedLabel = label.trim().slice(0, 50);
    const sanitizedAddress = address.trim();
    const sanitizedNotes = notes.trim().slice(0, 200);

    if (this.findByAddress(sanitizedAddress)) {
      throw new Error('Address already exists in address book');
    }

    const entry = new AddressBookEntry({ 
      label: sanitizedLabel, 
      address: sanitizedAddress, 
      notes: sanitizedNotes 
    });
    this.entries.push(entry);
    this.save();
    return entry;
  }

  update(id, updates) {
    const index = this.entries.findIndex(entry => entry.id === id);
    if (index === -1) {
      throw new Error('Entry not found');
    }

    const entry = this.entries[index];
    if (updates.label !== undefined) {
      entry.label = updates.label.trim().slice(0, 50);
    }
    if (updates.address !== undefined) {
      const sanitizedAddress = updates.address.trim();
      const existing = this.findByAddress(sanitizedAddress);
      if (existing && existing.id !== id) {
        throw new Error('Address already exists in address book');
      }
      entry.address = sanitizedAddress;
    }
    if (updates.notes !== undefined) {
      entry.notes = updates.notes.trim().slice(0, 200);
    }
    entry.updatedAt = Date.now();

    this.save();
    return entry;
  }

  delete(id) {
    const index = this.entries.findIndex(entry => entry.id === id);
    if (index === -1) {
      throw new Error('Entry not found');
    }

    this.entries.splice(index, 1);
    this.save();
    return true;
  }

  findById(id) {
    return this.entries.find(entry => entry.id === id);
  }

  findByAddress(address) {
    return this.entries.find(entry => entry.address === address);
  }

  search(query) {
    if (!query) return this.entries;

    const lowerQuery = query.toLowerCase();
    return this.entries.filter(entry =>
      entry.label.toLowerCase().includes(lowerQuery) ||
      entry.address.toLowerCase().includes(lowerQuery) ||
      entry.notes.toLowerCase().includes(lowerQuery)
    );
  }

  getAll() {
    return [...this.entries];
  }

  exportData() {
    return JSON.stringify(this.entries.map(entry => entry.toJSON()), null, 2);
  }

  importData(jsonData) {
    try {
      const parsed = JSON.parse(jsonData);
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid data format');
      }

      const imported = [];
      const skipped = [];

      for (const item of parsed) {
        if (!item.label || !item.address) {
          skipped.push(item);
          continue;
        }

        if (this.findByAddress(item.address)) {
          skipped.push(item);
          continue;
        }

        const entry = new AddressBookEntry(item);
        this.entries.push(entry);
        imported.push(entry);
      }

      this.save();
      return { imported, skipped };
    } catch (error) {
      throw new Error(`Import failed: ${error.message}`);
    }
  }

  clear() {
    this.entries = [];
    this.save();
  }
}

export const addressBook = new AddressBook();
