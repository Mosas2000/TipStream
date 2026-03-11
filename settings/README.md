# Network Settings

This directory contains Clarinet network configuration files that control
how contracts are deployed and which accounts are used for each environment.

## Files

| File | Purpose | Committed |
|---|---|---|
| `Devnet.toml` | Local development sandbox accounts | Yes (test-only keys) |
| `Testnet.toml` | Stacks testnet deployment credentials | No |
| `Mainnet.toml` | Stacks mainnet deployment credentials | No |
| `Mainnet.toml.example` | Template for mainnet config | Yes |
| `Testnet.toml.example` | Template for testnet config | Yes |

## Setup

1. Copy the relevant example file:

   ```bash
   cp settings/Mainnet.toml.example settings/Mainnet.toml
   ```

2. Open the new file and replace placeholder mnemonics with your own.
3. Verify the file is ignored before committing anything:

   ```bash
   git status settings/
   ```

   `Mainnet.toml` and `Testnet.toml` should never appear as tracked files.

## Security Rules

- **Never commit real mnemonics.**  The `.gitignore` already excludes
  `Mainnet.toml` and `Testnet.toml`, but always double-check before pushing.
- **Devnet keys are safe to commit.**  They are standard Clarinet sandbox
  accounts with no real-world value.
- **Rotate immediately** if a mnemonic is accidentally pushed.  See
  `SECURITY.md` in the project root for the incident-response process.
- **Store mnemonics** in a password manager (1Password, Bitwarden, etc.)
  or use a hardware-wallet backup.  Do not store them in plaintext
  on shared drives or cloud storage.
