# Rate Limit Configuration FAQ

## General Questions

### Q: Why do I need runtime rate limit reconfiguration?

A: Runtime reconfiguration enables rapid incident response without service restarts. During a DDoS attack or unexpected traffic spike, you can immediately adjust rate limits to protect your service while maintaining availability for legitimate users.

### Q: Are configuration changes persisted across restarts?

A: No. Runtime changes are temporary and revert to environment variable values on restart. After an incident, update your environment variables to make changes permanent.

### Q: Can I configure different rate limits for different IPs?

A: Not currently. Rate limits apply uniformly to all IPs. Per-IP configuration is a potential future enhancement.

### Q: What happens to existing rate limit counters when I update configuration?

A: Existing counters are preserved. The new limits apply to subsequent requests, but IPs that have already made requests retain their current counter values.

## Configuration Questions

### Q: What are the valid ranges for rate limit parameters?

A:
- `maxRequests`: 1 to 10000
- `windowMs`: 1000 to 3600000 (1 second to 1 hour)

### Q: How do I choose appropriate rate limit values?

A: Start with conservative defaults (100 requests per minute) and adjust based on:
- Normal traffic patterns
- Peak load requirements
- Server capacity
- Attack mitigation needs

Monitor metrics and adjust gradually.

### Q: Can I set rate limits per endpoint?

A: No. Rate limits currently apply to all requests from an IP address. Per-endpoint limits are a potential future enhancement.

### Q: What's the difference between maxRequests and windowMs?

A:
- `maxRequests`: Maximum number of requests allowed
- `windowMs`: Time window in milliseconds for counting requests

Example: `maxRequests=100, windowMs=60000` means 100 requests per 60 seconds (1 minute).

## Operational Questions

### Q: How do I check the current rate limit configuration?

A:
```bash
curl http://localhost:3100/api/admin/rate-limit \
  -H "Authorization: Bearer ${CHAINHOOK_AUTH_TOKEN}"
```

### Q: How do I update rate limits during an attack?

A:
```bash
curl -X POST http://localhost:3100/api/admin/rate-limit \
  -H "Authorization: Bearer ${CHAINHOOK_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"maxRequests": 10, "windowMs": 60000}'
```

### Q: Do I need to restart the service after changing rate limits?

A: No. Changes apply immediately to all new requests without restart.

### Q: How can I automate rate limit adjustments?

A: Use the provided scripts or integrate the API endpoints into your monitoring and alerting system. See `RATE_LIMIT_RUNBOOK.md` for automation examples.

### Q: What happens if I set rate limits too low?

A: Legitimate users may be rate limited. Monitor metrics after changes and adjust if you see excessive 429 responses from known good IPs.

### Q: What happens if I set rate limits too high?

A: Your service may be vulnerable to abuse or resource exhaustion. Balance protection with usability based on your capacity.

## Security Questions

### Q: Do the rate limit endpoints require authentication?

A: Yes, if `CHAINHOOK_AUTH_TOKEN` is configured. Always use authentication in production.

### Q: Are configuration changes logged?

A: Yes. All configuration changes are logged with INFO level including old and new values, timestamp, and request ID.

### Q: Can I restrict who can change rate limits?

A: Currently, anyone with the `CHAINHOOK_AUTH_TOKEN` can change rate limits. Consider implementing additional authorization layers for production.

### Q: What if someone makes unauthorized configuration changes?

A: Monitor logs for configuration changes. Set up alerts for unauthorized attempts. Consider implementing IP whitelisting for admin endpoints.

## Troubleshooting Questions

### Q: My configuration update returns 401 Unauthorized

A: Check that:
1. `CHAINHOOK_AUTH_TOKEN` is set
2. You're sending the correct token in the Authorization header
3. The header format is `Bearer <token>`

### Q: My configuration update returns 400 Bad Request

A: Check that:
1. Parameters are within valid ranges
2. JSON is properly formatted
3. Both `maxRequests` and `windowMs` are provided
4. Values are numbers, not strings

### Q: Changes don't seem to take effect

A: Verify:
1. Configuration was actually updated (check GET endpoint)
2. You're testing with a fresh IP or after the window expires
3. Server logs don't show errors
4. Service is running (check /health endpoint)

### Q: Rate limiting is too aggressive after update

A: Immediately relax limits:
```bash
curl -X POST http://localhost:3100/api/admin/rate-limit \
  -H "Authorization: Bearer ${CHAINHOOK_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"maxRequests": 200, "windowMs": 60000}'
```

### Q: How do I revert to default configuration?

A: Check your environment variables and set to those values:
```bash
# If defaults are 100 req/min
curl -X POST http://localhost:3100/api/admin/rate-limit \
  -H "Authorization: Bearer ${CHAINHOOK_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"maxRequests": 100, "windowMs": 60000}'
```

## Monitoring Questions

### Q: How do I monitor rate limit effectiveness?

A: Check the `/metrics` endpoint for:
- `rate_limit_violations_total` - Total rate limit hits
- `requests_total` - Total requests
- `requests_failed_total` - Failed requests

### Q: What metrics should I alert on?

A: Set up alerts for:
- Rate limit violations > threshold (e.g., 100/minute)
- Configuration changes (audit log)
- Unauthorized configuration attempts
- Failed requests > percentage of total

### Q: How do I know if my rate limits are too strict?

A: Monitor for:
- High rate of 429 responses
- Complaints from legitimate users
- Decreased legitimate traffic
- Increased support tickets

### Q: How do I know if my rate limits are too lenient?

A: Monitor for:
- Resource exhaustion
- Slow response times
- High server load
- Successful attacks getting through

## Integration Questions

### Q: Can I integrate this with my monitoring system?

A: Yes. The endpoints return JSON and can be integrated with any monitoring system that supports HTTP requests.

### Q: Can I use this with Kubernetes?

A: Yes. See `examples/kubernetes.yaml` for deployment configuration. Use ConfigMaps for environment variables and Secrets for tokens.

### Q: Can I use this with Docker?

A: Yes. Pass environment variables via `-e` flags or docker-compose.yml. See `examples/docker-compose.yml`.

### Q: Can I use this with systemd?

A: Yes. Set environment variables in the service file. Configuration changes work the same way.

## Best Practices Questions

### Q: What's the recommended approach for incident response?

A: Follow this workflow:
1. Detect anomaly in metrics
2. Assess if traffic is legitimate or attack
3. Make incremental adjustments
4. Monitor impact
5. Document changes
6. Update defaults after incident

### Q: Should I automate rate limit adjustments?

A: Consider automation for:
- Known attack patterns
- Scheduled high-traffic events
- Automatic rollback after time period

But always:
- Test automation in staging first
- Have manual override capability
- Log all automated changes
- Alert on automated actions

### Q: How often should I review rate limit configuration?

A: Review:
- After each incident
- Monthly as part of capacity planning
- When traffic patterns change
- After infrastructure changes

### Q: What should I document about rate limit changes?

A: Document:
- Date and time of change
- Reason for change
- Old and new values
- Who made the change
- Observed impact
- Duration of change

## Future Enhancements

### Q: Will there be per-IP configuration?

A: This is under consideration for future releases.

### Q: Will configuration be persisted to database?

A: This is under consideration for future releases.

### Q: Will there be automatic rate limit adjustment?

A: This is under consideration for future releases based on load patterns.

### Q: Will there be configuration history?

A: This is under consideration for future releases to provide audit trail and rollback capability.
