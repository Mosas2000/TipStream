# Key Generation Algorithm

## Purpose

Generate stable, unique identifiers for tip rows in the RecentTips feed to prevent React reconciliation issues.

## Algorithm

The key generation follows a three-tier fallback strategy:

### Tier 1: tipId (Primary)
```
IF tipId exists AND is not empty string:
  RETURN "tip:" + tipId
```

### Tier 2: txId (Secondary)
```
IF txId exists AND is not empty string:
  RETURN "tx:" + txId
```

### Tier 3: Fingerprint (Tertiary)
```
RETURN "fp:" + sender + ":" + recipient + ":" + amount + ":" + fee + ":" + timestamp
```

## Default Values

When generating fingerprints, missing values use these defaults:
- sender: "unknown"
- recipient: "unknown"
- amount: "0"
- fee: "0"
- timestamp: "0"

## Whitespace Handling

Both tipId and txId are trimmed before use. Empty strings after trimming are treated as missing values.

## Type Coercion

All values are converted to strings using `String()` before concatenation.
