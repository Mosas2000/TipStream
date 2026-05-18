/**
 * @module tipstreak-sdk/core/address-validation
 *
 * Stacks address validation and address book entry helpers.
 * No external dependencies.
 */

import { isValidStacksAddress, formatAddress } from './stacks-principal.js';

export { isValidStacksAddress, formatAddress };

/**
 * Validate an address book entry's fields.
 *
 * @param {string} label - Display name for the entry
 * @param {string} address - Stacks address
 * @param {string} [notes=''] - Optional notes
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 *
 * @example
 * validateAddressBookEntry('Alice', 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ')
 * // { isValid: true, errors: {} }
 */
export function validateAddressBookEntry(label, address, notes = '') {
  const errors = {};

  if (!label || typeof label !== 'string') {
    errors.label = 'Label is required';
  } else if (label.trim().length === 0) {
    errors.label = 'Label cannot be empty';
  } else if (label.length > 50) {
    errors.label = 'Label must be 50 characters or less';
  }

  if (!address || typeof address !== 'string') {
    errors.address = 'Address is required';
  } else if (!isValidStacksAddress(address)) {
    errors.address = 'Invalid Stacks address format';
  }

  if (notes && typeof notes === 'string' && notes.length > 200) {
    errors.notes = 'Notes must be 200 characters or less';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
