# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability in TipStream, please report it responsibly:

1. **Do not** open a public issue
2. Email security concerns to the project maintainers
3. Include a detailed description of the vulnerability
4. Provide steps to reproduce if possible
5. Allow 72 hours for initial response

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

## Devnet Credentials

The `settings/Devnet.toml` file contains mnemonic phrases and private keys for Clarinet
devnet test accounts. These are sandbox-only credentials with no real value. Never use
devnet mnemonics or keys on mainnet or testnet.

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
