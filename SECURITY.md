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
- The TipStream frontend hosted at `https://tipstream.xyz` and on Vercel.
- Deployment scripts and configuration in this repository.
- Smart contract upgrade strategy and migration procedures.
- Frontend post-condition enforcement logic.

Out of scope:

- Third-party services (Hiro API, wallet extensions, Vercel infrastructure).
- Social engineering attacks.
- Denial-of-service attacks against public infrastructure.
- Private mnemonics or keys (report via secure channels, not as issues).

## Security Audit Status

| Area | Status | Last Review | Notes |
|---|---|---|---|
| Smart Contract | Undergone review | Deployment | Timelock bypass documented |
| Post-Conditions | Audited | Current | CI enforces deny mode |
| Frontend Validation | Reviewed | Current | Client-side checks + contract validation |
| Credential Management | Secure | Current | gitleaks + .gitignore + hooks |
| Dependencies | Audited | Monthly | npm audit in CI |
| Documentation | Current | March 2026 | Audit complete, drift signals resolved |

## Known Security Considerations

### Contract Administration

The deployed TipStream contract has both direct and timelocked admin functions. The direct
functions (`set-paused`, `set-fee-basis-points`) can bypass the 144-block timelock. This is
documented in [docs/TIMELOCK-BYPASS-AUDIT.md](docs/TIMELOCK-BYPASS-AUDIT.md) and mitigated
through frontend controls and operational policies.

### Timelock Mechanism

Administrative changes use a 144-block (~24 hour) delay:

| Operation | Timelocked Function | Direct Bypass |
|---|---|---|
| Pause/Unpause | `propose-pause-change` / `execute-pause-change` | `set-paused` |
| Fee Change | `propose-fee-change` / `execute-fee-change` | `set-fee-basis-points` |

The frontend AdminDashboard exclusively uses the timelocked functions. Direct bypass
functions are reserved for documented emergencies only.

### Pause Change Cancellation

The contract now provides `cancel-pause-change` to explicitly cancel pending pause proposals.
This mirrors the existing `cancel-fee-change` function and provides operational symmetry.
When a pause proposal is submitted in error, operators can cancel it explicitly rather than
wait for the timelock to expire or overwrite it with a new proposal.

### Post Conditions

All STX transfers enforce `PostConditionMode.Deny` to prevent transactions from moving
more STX than explicitly authorized. See the post-condition documentation for details.

### Ownership Transfer

Contract ownership uses a two-step process (`propose-new-owner` / `accept-ownership`)
to prevent accidental transfers.

### Fee Limits

The contract enforces a maximum fee of 1000 basis points (10%). The current fee is 50
basis points (0.5%).

### Minimum Tip Amount

Tips below 1000 microSTX (0.001 STX) are rejected to prevent dust spam.

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

### Devnet Credentials

The `settings/Devnet.toml` file contains mnemonic phrases and private keys for Clarinet
devnet test accounts. These are sandbox-only credentials with no real value. Never use
devnet mnemonics or keys on mainnet or testnet.

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

## Dependencies

- Frontend dependencies are audited with `npm audit` in CI
- Stacks SDK versions are pinned to prevent supply-chain attacks
- Contract interactions use explicit post conditions

## Security Checklist for Contributors

- [ ] Never commit mainnet private keys or seed phrases
- [ ] Use `PostConditionMode.Deny` for all contract calls
- [ ] Validate all user inputs before contract interaction
- [ ] Use timelocked admin functions in the frontend
- [ ] Run `npm audit` before submitting PRs
- [ ] Test contract changes on simnet before deployment

## Incident Response Contacts

| Role | Contact |
|---|---|
| Maintainer | [@Mosas2000](https://github.com/Mosas2000) |
| Security Reports | security@tipstream.app |

## Acknowledgments

We appreciate responsible disclosure.  Contributors who report valid
vulnerabilities will be credited in the changelog unless they prefer
anonymity.
