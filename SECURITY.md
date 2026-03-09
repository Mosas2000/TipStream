# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| mainnet (current) | Yes |
| testnet | Best-effort |

## Reporting a Vulnerability

If you discover a security vulnerability in TipStream, please report it
responsibly:

1. **Do not open a public issue.**
2. Email **security@tipstream.app** (or DM [@Mosas2000](https://github.com/Mosas2000) on GitHub) with:
   - A description of the vulnerability.
   - Steps to reproduce.
   - Potential impact.
3. You will receive an acknowledgment within 48 hours.
4. A fix will be prioritized based on severity and deployed as soon as
   practical.

## Scope

The following assets are in scope:

- Smart contracts deployed under `SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T`.
- The TipStream frontend hosted at `https://tipstream-silk.vercel.app`.
- Deployment scripts and configuration in this repository.

Out of scope:

- Third-party services (Hiro API, wallet extensions).
- Social engineering attacks.
- Denial-of-service attacks against public infrastructure.

## Security Model

### Smart Contract

- All admin functions require `tx-sender` to be the contract owner.
- Ownership transfer uses a two-step propose/accept pattern.
- Fee changes are bounded (maximum 10%, i.e. 1000 basis points).
- The `set-paused` function has a timelock: a pause/unpause must be
  proposed and can only execute after a delay measured in blocks.
- Post conditions on every state-changing transaction restrict STX
  movement to the exact expected amounts.
- Self-tipping is rejected at the contract level.
- Blocked users cannot receive tips from the blocker.

### Frontend

- Wallet authentication is handled entirely by `@stacks/connect`.
  TipStream never sees or stores private keys.
- All contract calls use `PostConditionMode.Deny` to enforce
  explicit post conditions.
- Read-only queries go through the Hiro REST API with no write
  capability.

### Credential Management

- **Mainnet and testnet mnemonics must never be committed to version
  control.**  The `.gitignore` excludes `settings/Mainnet.toml` and
  `settings/Testnet.toml`.
- Template files (`*.toml.example`) are committed with placeholder
  values only.
- The `scripts/test-contract.cjs` script reads its mnemonic from the
  `MNEMONIC` environment variable, never from a config file.
- A gitleaks configuration (`.gitleaks.toml`) and a pre-commit hook
  (`scripts/hooks/pre-commit`) are provided to catch accidental
  secret commits before they reach the remote.
- GitHub Actions runs a secret scan on every push and pull request.

## Wallet Rotation Advisory

If you believe a mnemonic has been exposed (accidentally committed,
shared in a log, or otherwise leaked):

1. **Stop using the compromised mnemonic immediately.**
2. Generate a new mnemonic using a trusted BIP-39 tool or hardware
   wallet.
3. Transfer all remaining funds from the compromised address to a
   new address derived from the fresh mnemonic.
4. If the compromised key is the contract deployer:
   - Use `propose-new-owner` to initiate an ownership transfer to
     the new address.
   - From the new address, call `accept-ownership` to complete the
     transfer.
5. Update `settings/Mainnet.toml` (local only) and any CI/CD secrets
   with the new mnemonic.
6. Audit recent transactions on the compromised address for
   unauthorized activity.
7. If the mnemonic was pushed to a public repository, consider using
   `git filter-repo` or BFG Repo-Cleaner to remove the commit from
   history, then force-push.  All collaborators must re-clone.

## Incident Response Contacts

| Role | Contact |
|---|---|
| Maintainer | [@Mosas2000](https://github.com/Mosas2000) |
| Security Reports | security@tipstream.app |

## Acknowledgments

We appreciate responsible disclosure.  Contributors who report valid
vulnerabilities will be credited in the changelog unless they prefer
anonymity.
