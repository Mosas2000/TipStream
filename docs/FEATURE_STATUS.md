# Feature Status & Maturity Matrix

Real-time status of all TipStream features across the platform.

## Stable Features (Production Ready)

| Feature | Component | Last Updated | Stability | Notes |
|---|---|---|---|---|
| Single Tip Send | Send Page | March 2026 | Stable | Core functionality, mainnet deployed |
| Batch Tipping | Batch Page | March 2026 | Stable | Up to 50 recipients, atomic or fail-safe modes |
| Tip Feed | RecentTips Component | March 2026 | Stable | Real-time updates, pagination |
| Leaderboard | Leaderboard Page | March 2026 | Stable | Top senders/receivers with filtering |
| User Profiles | Profile Page | March 2026 | Stable | On-chain storage, editable |
| Activity History | Activity Page | March 2026 | Stable | Transaction filtering and search |
| Wallet Connection | Connect Widget | March 2026 | Stable | Leather and Xverse support |
| Admin Dashboard | Admin Page | March 2026 | Stable | Fee/pause controls, timelocks enforced |
| Post Conditions | Contract/Frontend | March 2026 | Stable | Deny mode enforced on all transactions |
| Timelocked Operations | Admin Functions | March 2026 | Stable | 144-block delay for fee/pause changes |

## Beta Features (Limited Release)

| Feature | Component | Last Updated | Stability | Notes |
|---|---|---|---|---|
| Recursive Tipping | Contract | March 2026 | Beta | Tip-a-tip from feed, limited usage data |
| Tip-To-Tip | Frontend | March 2026 | Beta | Reply via tip, subject to testing |
| Privacy Blocking | Block Page | March 2026 | Beta | Prevent tips from specific addresses |
| Token Metadata | Contract Extension | March 2026 | Beta | Optional tip metadata storage |

## Experimental Features (Testing Phase)

| Feature | Component | Last Updated | Stability | Notes |
|---|---|---|---|---|
| Event Cursor Pagination | RecentTips/Hooks | March 2026 | Experimental | New stable pagination (Issue #291) |
| Selective Message Enrichment | useSelectiveMessageEnrichment | March 2026 | Experimental | Load messages only for visible tips |
| Cache Fallback System | useCachedData/FreshnessIndicator | March 2026 | Experimental | Last-known-good caching (Issue #290) |
| Resilience Monitoring | lib/resilience.js | March 2026 | Experimental | Debug diagnostics and metrics tracking |

## Planned Features (Roadmap)

| Feature | Phase | Target | Status | Dependencies |
|---|---|---|---|---|
| TIPS Fungible Token | Phase 3 | Q2 2026 | Specification | Token contract design |
| NFT Achievement Badges | Phase 3 | Q2 2026 | Specification | Badge contract template |
| DAO Governance | Phase 4 | Q3 2026 | Design | Multisig voting contract |
| Community Vault | Phase 4 | Q3 2026 | Design | Treasury management contract |
| Escrow Tipping | Phase 5 | Q4 2026 | Specification | Time-lock contract patterns |
| Recurring Payments | Phase 5 | Q4 2026 | Specification | Subscription contract |

## Known Limitations

### Current (To Be Addressed)

- **Message Fetch Concurrency**: Limited to 5 simultaneous enrichment requests (CONCURRENCY_LIMIT)
  - Impact: Slower message loading for large batches
  - Workaround: Increases automatically below fold

- **Cache TTL**: Hardcoded 5-minute cache for tip messages, 2+ hour cache for feed
  - Impact: Message updates delayed up to cache duration
  - Workaround: Manual refresh available

- **Pagination Window**: Fetches 10 pages (500 events) initially
  - Impact: Large initial load, though mostly cached
  - Note: Selective enrichment now defers message load

### By Design

- **No Recursive Tip Limit**: Contract allows infinite tip-of-tip chains
  - Rationale: On-chain transparency worth the semantics complexity
  - Mitigation: Tx fees discourage spam

- **No Direct Admin Bypass in Frontend**: Direct fee/pause functions not exposed
  - Rationale: Business continuity through timelocked operations
  - Emergency: Direct functions available if needed, documented in SECURITY.md

- **Single Chain**: Stacks mainnet only (no multi-chain)
  - Rationale: Bitcoin security model, not fragmented liquidity
  - Future: Could bridge to other chains if demand warrants

## Transition Plan: Beta to Stable

When a feature moves from Beta to Stable:

1. **Testing**: Minimum 2 weeks of live usage data
2. **Documentation**: Feature must be 100% documented
3. **Monitoring**: Must have non-zero production metrics tracked
4. **Security**: Must pass security audit for that feature area
5. **User Feedback**: Incorporate feedback from beta users
6. **Release Notes**: Feature promotion documented in CHANGELOG

## Monitoring Dashboard

Operators should track these metrics per feature:

| Feature | Metric | Target | Alert Threshold |
|---|---|---|---|
| Tip Send | Success rate | > 99% | < 95% |
| Tip Send | Avg latency | < 30s | > 60s |
| Tip Feed | Load speed | < 2s | > 5s |
| Tip Feed | Cache hit rate | > 70% | < 50% |
| Admin Ops | Timelock delay | 144 blocks | Any bypass |
| Post Conditions | Deny enforcement | 100% | Any Allow mode |

## Release Integration

### Before Shipping
- [ ] Update this matrix
- [ ] Update README.md status columns
- [ ] Update ROADMAP.md phase transitions
- [ ] Update CHANGELOG.md with feature graduation

### Communication
- [ ] Notify beta testers of graduation
- [ ] Update API/SDK documentation if applicable
- [ ] Announce in community channels

---

**Last Updated:** March 2026
**Next Review:** June 2026
**Owner:** Technical Lead

