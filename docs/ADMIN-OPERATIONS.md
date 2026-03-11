# Admin Operations Guide

Standard operating procedures for TipStream contract administration.

## Overview

The TipStream contract (`SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream`) includes
admin functions for pausing the contract and adjusting fees. All routine changes
MUST go through the timelocked propose-wait-execute path. The direct bypass
functions (`set-paused`, `set-fee-basis-points`) exist in the deployed contract
but are prohibited for normal operations.

## Timelocked Operations

### Pause or Unpause the Contract

1. **Propose** the change by calling `propose-pause-change` with the desired
   boolean value (`true` to pause, `false` to unpause).
2. **Wait** for the 144-block timelock (~24 hours) to expire.
3. **Execute** the change by calling `execute-pause-change` once the effective
   block height has been reached.

There is no `cancel-pause-change` function in the deployed v1 contract. If a
pause proposal was made in error, wait for it to expire and do not execute it,
or override it by proposing a new value.

### Change the Fee

1. **Propose** the new fee by calling `propose-fee-change` with a value between
   0 and 1000 basis points (0% to 10%).
2. **Wait** for the 144-block timelock to expire.
3. **Execute** by calling `execute-fee-change`.
4. **Cancel** (optional) by calling `cancel-fee-change` if the proposal should
   be abandoned before execution.

### Monitoring Pending Changes

Use the read-only functions to inspect pending proposals:

| Function                     | Returns                                     |
| ---------------------------- | ------------------------------------------- |
| `get-pending-fee`            | `(optional uint)` pending fee value         |
| `get-pending-fee-height`     | `uint` block height when fee becomes active |
| `get-pending-pause`          | `(optional bool)` pending pause value       |
| `get-pending-pause-height`   | `uint` block height when pause takes effect |

## Frontend Admin Dashboard

The Admin Dashboard at `/admin` is only visible to the contract owner. It
provides a graphical interface for all timelocked operations:

- Propose, monitor, and execute pause changes with a countdown timer.
- Propose, monitor, execute, or cancel fee changes with a progress bar.
- View current block height, contract owner, and timelock delay.

The dashboard exclusively uses the timelocked transaction builders in
`frontend/src/lib/admin-transactions.js`. ESLint rules prevent any direct
references to the bypass functions in the frontend codebase.

## Chainhook Monitoring

The chainhook callback server (`chainhook/server.js`) provides real-time
monitoring of admin events:

### API Endpoints

| Endpoint                  | Method | Description                              |
| ------------------------- | ------ | ---------------------------------------- |
| `/api/admin/events`       | GET    | All admin events (proposals, executions) |
| `/api/admin/bypasses`     | GET    | Detected bypass events                   |

### Bypass Detection

The `chainhook/bypass-detection.js` module automatically flags any
`contract-paused` or `fee-updated` event that does not have a corresponding
timelocked execution event in recent history. Detections are logged as warnings
and available through the `/api/admin/bypasses` endpoint.

Admin events to watch for:

| Print event               | Source function          | Is Bypass |
| ------------------------- | ------------------------ | --------- |
| `contract-paused`         | `set-paused`             | Yes       |
| `fee-updated`             | `set-fee-basis-points`   | Yes       |
| `pause-change-proposed`   | `propose-pause-change`   | No        |
| `pause-change-executed`   | `execute-pause-change`   | No        |
| `fee-change-proposed`     | `propose-fee-change`     | No        |
| `fee-change-executed`     | `execute-fee-change`     | No        |
| `fee-change-cancelled`    | `cancel-fee-change`      | No        |

## Emergency Operations

In a genuine emergency (active exploit, critical vulnerability), the contract
owner may use the direct `set-paused` function to immediately halt the contract.
This should be treated as an incident:

1. Pause the contract using `set-paused(true)`.
2. Document the reason, timestamp, and transaction ID.
3. Investigate and resolve the root cause.
4. Resume via the timelocked `propose-pause-change(false)` / `execute-pause-change` path.
5. Publish a post-incident report.

Direct use of `set-fee-basis-points` is never justified and should always go
through the timelocked path.

## Incident Response

If the chainhook bypass detection flags an unexpected event:

1. Check `/api/admin/bypasses` for the transaction ID and block height.
2. Verify whether the bypass was initiated by the contract owner.
3. If unauthorized, rotate the contract owner via `transfer-ownership` and
   investigate the multisig configuration.
4. Document findings in the project's security channel.