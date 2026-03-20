# Scripts

Utility scripts for TipStream contract interaction, deployment, and
code quality enforcement.

## test-contract.cjs

Send a test tip on Stacks mainnet.

```bash
MNEMONIC="..." RECIPIENT="SP..." node scripts/test-contract.cjs
```

## batch-tips-to-wallet1.cjs

Send multiple test tips to wallet_1 on devnet or mainnet. All tips go to wallet_1 (ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5).

```bash
node scripts/batch-tips-to-wallet1.cjs
```

### Environment Variables

| Variable    | Required | Default              | Description                        |
|-------------|----------|----------------------|------------------------------------|
| `NUM_TIPS`  | No       | `5`                  | Number of tips to send             |
| `AMOUNT`    | No       | `1000`               | Tip amount in microSTX (min 1000)  |
| `MESSAGE`   | No       | `"Test tip to wallet 1"`| Message attached to each tip    |
| `DRY_RUN`   | No       | `0`                  | Set to `1` to skip broadcasting    |
| `NETWORK`   | No       | `devnet`             | Use `devnet` or `mainnet`          |

The script uses devnet wallets (wallet_2 through wallet_8) as senders
and sends all tips to wallet_1. Self-tipping is automatically prevented.

### Environment Variables

| Variable    | Required | Default              | Description                        |
|-------------|----------|----------------------|------------------------------------|
| `MNEMONIC`  | Yes      | —                    | BIP-39 mnemonic for sender wallet  |
| `RECIPIENT` | Yes      | —                    | SP... mainnet address              |
| `AMOUNT`    | No       | `1000`               | Tip amount in microSTX (min 1000)  |
| `MESSAGE`   | No       | `"On-chain test tip"`| Message attached to the tip        |
| `DRY_RUN`   | No       | `0`                  | Set to `1` to skip broadcasting    |

The script uses `PostConditionMode.Deny` with an explicit STX ceiling
computed by the shared `scripts/lib/post-conditions.cjs` module.

## lib/post-conditions.cjs

Shared CommonJS module exporting fee calculation and post-condition
builders.  Both this script module and the frontend ESM module
(`frontend/src/lib/post-conditions.js`) share the same logic.

See [docs/POST-CONDITION-GUIDE.md](../docs/POST-CONDITION-GUIDE.md)
for the full strategy explanation.

## audit-post-conditions.sh

Grep-based audit that fails if any production source file uses
`PostConditionMode.Allow`.  Run locally or as part of CI.

```bash
bash scripts/audit-post-conditions.sh
```

## deploy.sh

Deployment helper.  Validates credentials, checks git tracking, and
timestamps the deployment.

```bash
bash scripts/deploy.sh
```

## Hooks

| Hook | Purpose |
|---|---|
| `hooks/pre-commit` | Block commits containing mnemonic phrases |

## setup-hooks.sh

Install the git pre-commit hook that runs secret scanning before each
commit.

```bash
bash scripts/setup-hooks.sh
```

## verify-no-secrets.sh

Scan the repository for accidentally committed credentials.  Used by
the pre-commit hook and CI secret-scan workflow.

```bash
bash scripts/verify-no-secrets.sh
```

## Security Notes

- `deploy.sh` validates that `settings/Mainnet.toml` exists and is not
  tracked by git before proceeding.
- `test-contract.cjs` reads the mnemonic from the `MNEMONIC` environment
  variable.  Never pass mnemonics as command-line arguments (they appear
  in shell history and process listings).
- Run `verify-no-secrets.sh` at any time to audit the repository state.
