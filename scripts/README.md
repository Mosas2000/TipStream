# Scripts

Deployment and utility scripts for TipStream.

## Files

| Script | Purpose |
|---|---|
| `deploy.sh` | Deploy the contract ecosystem to Stacks mainnet |
| `test-contract.cjs` | Send a test tip on mainnet via CLI |
| `setup-hooks.sh` | Install git hooks (pre-commit secret scanner) |
| `verify-no-secrets.sh` | Check that no credentials are tracked |

## Hooks

| Hook | Purpose |
|---|---|
| `hooks/pre-commit` | Block commits containing mnemonic phrases |

## Security Notes

- `deploy.sh` validates that `settings/Mainnet.toml` exists and is not
  tracked by git before proceeding.
- `test-contract.cjs` reads the mnemonic from the `MNEMONIC` environment
  variable.  Never pass mnemonics as command-line arguments (they appear
  in shell history and process listings).
- Run `verify-no-secrets.sh` at any time to audit the repository state.
