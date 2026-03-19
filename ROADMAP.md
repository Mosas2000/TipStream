# Roadmap

Planned milestones for TipStream.  Items are subject to change based on
community feedback and funding.

## Phase 1 — Core Platform (complete)

- [x] Mainnet deployment of `tipstream.clar`
- [x] Send tip with message
- [x] Batch tipping (partial and strict modes)
- [x] Recursive tipping (tip-a-tip)
- [x] User profiles (name, bio, avatar)
- [x] User blocking
- [x] Admin controls (pause, fee, ownership transfer)
- [x] React frontend with wallet integration
- [x] Live tip feed and leaderboard
- [x] Platform-wide statistics dashboard

## Phase 2 — Security Hardening (in progress)

- [x] Credential management framework (example templates, gitignore, hooks)
- [x] Secret scanning CI pipeline (gitleaks)
- [x] SECURITY.md with disclosure process and rotation advisory
- [x] Post-condition enforcement audit across all scripts
- [x] Contract upgrade strategy documentation
- [x] Admin dashboard frontend safeguards

## Phase 2.5 — Performance & Resilience (in progress)

- [x] Event feed pagination with stable cursors (Issue #291)
- [x] Selective message enrichment for visible tips only
- [x] Page caching with TTL and invalidation (Issue #291)
- [x] Last-known-good caching for read-heavy views (Issue #290)
- [x] API resilience with graceful fallback to cached data
- [x] Freshness indicators showing data source and age
- [x] Transaction lockout during API degradation
- [ ] Documentation audit and consistency review

## Phase 3 — Token Economy

- [ ] Deploy TIPS fungible reward token (`tipstream-token.clar`)
- [ ] Tip reward distribution contract (`tipstream-rewards.clar`)
- [ ] NFT achievement badges (`tipstream-badges.clar`)
- [ ] Referral tracking and incentives (`tipstream-referral.clar`)

## Phase 4 — Governance and Treasury

- [ ] Community vault (`tipstream-vault.clar`)
- [ ] DAO governance proposals (`tipstream-dao.clar`)
- [ ] Multi-signature admin contract (`tipstream-multisig.clar`)
- [ ] Token-weighted voting

## Phase 5 — Advanced Features

- [ ] Time-locked escrow tips (`tipstream-escrow.clar`)
- [ ] Recurring subscriptions (`tipstream-subscription.clar`)
- [ ] Cross-platform integrations (Twitter, Discord)
- [ ] Mobile-optimized progressive web app
- [ ] Chainhook event indexing for real-time notifications
