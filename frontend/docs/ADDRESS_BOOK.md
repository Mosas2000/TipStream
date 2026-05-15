# Address Book Feature

## Overview

The Address Book feature allows users to save and manage frequently used Stacks addresses with custom labels and notes. This improves the user experience by reducing the need to manually enter or copy-paste addresses for recurring transactions.

## Features

### Core Functionality

- **Add Addresses**: Save Stacks addresses with custom labels and optional notes
- **Edit Addresses**: Update labels, addresses, or notes for existing entries
- **Delete Addresses**: Remove addresses from the address book
- **Search**: Filter addresses by label, address, or notes
- **Import/Export**: Backup and restore address book data via JSON

### User Interface

- **Full Mode**: Complete address book management interface with all features
- **Compact Mode**: Streamlined view for quick address selection (used in SendTip component)

## Usage

### Adding an Address

1. Navigate to the Address Book page
2. Click "Add Address" button
3. Fill in the form:
   - **Label** (required): A friendly name for the address (max 50 characters)
   - **Address** (required): A valid Stacks mainnet or testnet address
   - **Notes** (optional): Additional information about the address (max 200 characters)
4. Click "Add" to save

### Editing an Address

1. Find the address entry in the list
2. Click the "Edit" button
3. Modify the fields as needed
4. Click "Update" to save changes

### Deleting an Address

1. Find the address entry in the list
2. Click the "Delete" button
3. Confirm the deletion in the dialog

### Searching Addresses

1. Use the search input at the top of the address book
2. Type any part of the label, address, or notes
3. The list will filter in real-time
4. Click the "X" button to clear the search

### Importing Addresses

1. Click "Import/Export" button
2. Switch to the "Import" tab
3. Either:
   - Click "Choose File" to select a JSON file
   - Paste JSON data directly into the textarea
4. Click "Import"
5. Duplicate addresses will be skipped automatically

### Exporting Addresses

1. Click "Import/Export" button
2. Stay on the "Export" tab
3. Either:
   - Click "Download as JSON" to save a file
   - Click "Copy to Clipboard" to copy the data

### Using Address Book in SendTip

1. Navigate to the Send Tip page
2. The address book appears in compact mode below the recipient field
3. Click on any saved address to auto-fill the recipient field
4. The label will also be displayed for reference

## Data Storage

- Address book data is stored in browser localStorage
- Storage key: `tipstream_address_book`
- Data persists across browser sessions
- Clearing browser data will remove saved addresses

## Validation Rules

### Label
- Required field
- Maximum 50 characters
- Can contain any characters

### Address
- Required field
- Must be a valid Stacks address format
- Supports both mainnet (SP) and testnet (ST) addresses
- Must be 41 characters long
- Cannot be a duplicate of an existing address in the book

### Notes
- Optional field
- Maximum 200 characters
- Can contain any characters

## Analytics Tracking

The following events are tracked for analytics:

- `addressBookAdded`: When a new address is added
- `addressBookUpdated`: When an address is edited
- `addressBookDeleted`: When an address is removed
- `addressBookImported`: When addresses are imported (includes count)
- `addressBookExported`: When addresses are exported
- `addressBookSearched`: When the search field is used
- `addressBookSelected`: When an address is selected in compact mode

## Technical Implementation

### Components

- **AddressBook**: Main component with full functionality
- **AddressBookEntry**: Individual address entry display
- **AddressBookForm**: Form for adding/editing addresses
- **AddressBookSearch**: Search input with clear button
- **AddressBookImportExport**: Import/export interface

### Storage Layer

- **AddressBookEntry**: Class representing a single address entry
- **AddressBook**: Singleton class managing all address book operations
- **addressBook**: Global instance for application-wide access

### Validation

- **validateAddressBookEntry**: Validates label, address, and notes
- **formatAddress**: Formats addresses for display (truncation)

## Testing

Comprehensive test coverage includes:

- **Unit Tests**: Storage layer and validation logic
- **Component Tests**: UI interactions and user flows
- **Integration Tests**: End-to-end address book workflows

Run tests with:
```bash
npm test addressBook
npm test addressBookValidation
npm test AddressBook
```

## Accessibility

- All form inputs have proper labels
- Buttons have descriptive text and ARIA labels
- Search clear button has aria-label
- Keyboard navigation supported throughout
- Focus management for form interactions

## Future Enhancements

Potential improvements for future versions:

- Address book categories/tags
- Bulk operations (delete multiple, export selected)
- Address verification against blockchain
- Sync across devices (requires backend)
- Address book sharing between users
- Recent addresses auto-save
- Address nicknames with emoji support
- Integration with Stacks Name Service (BNS)

## Troubleshooting

### Addresses not persisting
- Check if localStorage is enabled in browser
- Verify browser storage quota is not exceeded
- Check browser console for errors

### Import failing
- Ensure JSON format is valid
- Verify all required fields (label, address) are present
- Check that addresses are valid Stacks addresses

### Search not working
- Clear search and try again
- Check if addresses actually contain the search term
- Verify JavaScript is enabled

## Related Files

- `frontend/src/components/AddressBook.jsx`
- `frontend/src/components/AddressBookEntry.jsx`
- `frontend/src/components/AddressBookForm.jsx`
- `frontend/src/components/AddressBookSearch.jsx`
- `frontend/src/components/AddressBookImportExport.jsx`
- `frontend/src/lib/addressBook.js`
- `frontend/src/lib/addressValidation.js`
- `frontend/src/test/addressBook.test.js`
- `frontend/src/test/addressBookValidation.test.js`
- `frontend/src/test/AddressBook.test.jsx`
