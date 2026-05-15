const STACKS_ADDRESS_PATTERN = /^(SP|ST|SM)[0-9A-Z]{38,40}$/i;

export function isValidStacksAddress(address) {
  if (!address || typeof address !== 'string') {
    return false;
  }
  return STACKS_ADDRESS_PATTERN.test(address.trim());
}

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

export function formatAddress(address, length = 8) {
  if (!address || address.length <= length * 2) {
    return address;
  }
  return `${address.slice(0, length)}...${address.slice(-length)}`;
}
