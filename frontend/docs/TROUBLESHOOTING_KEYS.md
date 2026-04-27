# Troubleshooting Key Generation Issues

## Common Issues

### Issue: Duplicate Keys Warning

**Symptom**: React warns about duplicate keys in the console

**Cause**: Two tips generate the same key

**Solution**: 
- Check if tips have unique tipId or txId values
- Verify timestamp differences for fingerprint keys
- Ensure sender/recipient combinations are unique

### Issue: Lost Focus After Pagination

**Symptom**: Focus is lost when navigating between pages

**Cause**: Keys are changing between renders

**Solution**:
- Verify getTipRowKey is being used consistently
- Check that tip data is stable across renders
- Ensure no array index keys are being used

### Issue: Stale Row State

**Symptom**: Row shows old data after update

**Cause**: Key collision or unstable keys

**Solution**:
- Verify tip data includes stable identifiers
- Check for mutations in tip objects
- Ensure keys are generated from immutable properties

## Debugging

### Enable Key Logging
```javascript
const key = getTipRowKey(tip);
console.log('Generated key:', key, 'for tip:', tip);
```

### Verify Key Uniqueness
```javascript
const keys = tips.map(getTipRowKey);
const uniqueKeys = new Set(keys);
if (keys.length !== uniqueKeys.size) {
  console.error('Duplicate keys detected!');
}
```

### Check Key Stability
```javascript
const key1 = getTipRowKey(tip);
const key2 = getTipRowKey(tip);
console.assert(key1 === key2, 'Keys should be stable');
```

## Getting Help

If issues persist:
1. Check the test suite for similar scenarios
2. Review the documentation in docs/STABLE_KEYS.md
3. Verify tip data structure matches expectations
4. Check for data mutations between renders
