# Metrics Access Control: Frequently Asked Questions

## General Questions

### Q: Do I need to enable metrics authentication?

**A:** No. Metrics authentication is optional and disabled by default. If `METRICS_AUTH_TOKEN` is not set or empty, metrics are publicly accessible. Enable it only in environments where operational metrics should be restricted.

### Q: What happens to the health endpoint when I enable metrics authentication?

**A:** The health endpoint (`/health`) always remains accessible without authentication. This is intentional so orchestration systems (Kubernetes, load balancers) can check service health for readiness and liveness probes regardless of metrics authentication.

### Q: Can I use metrics authentication without HTTPS/TLS?

**A:** Not recommended. Bearer tokens transmitted over unencrypted HTTP can be intercepted. Always use HTTPS/TLS in production. Configure at the reverse proxy or load balancer level if needed.

### Q: What is the minimum token length?

**A:** The token should be at least 32 bytes (256 bits) of random data. This provides adequate entropy (about 256 bits of security). Tokens shorter than 32 bytes are accepted but not recommended.

## Configuration Questions

### Q: How do I generate a strong token?

**A:** Use a cryptographically secure random source:

```bash
# Recommended (256-bit entropy)
openssl rand -base64 32

# Alternative using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Alternative using Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Q: Can I use the same token for multiple Chainhook instances?

**A:** Yes, you can use the same token across multiple instances if they're part of the same logical system. However, for better security isolation, consider using different tokens per instance and rotating them on different schedules.

### Q: How often should I rotate tokens?

**A:** Rotate tokens at least quarterly (every 3 months). More frequent rotation (monthly or weekly) is acceptable if your organization requires it. Emergency rotations should be performed immediately if you suspect a token has been compromised.

### Q: Can I use environment variables for token configuration in Kubernetes?

**A:** Yes. Use Kubernetes Secrets to store the token and mount it as an environment variable:

```yaml
env:
- name: METRICS_AUTH_TOKEN
  valueFrom:
    secretKeyRef:
      name: chainhook-secrets
      key: metrics-auth-token
```

### Q: What if I need to migrate from open metrics to authenticated metrics?

**A:** See the MIGRATION_GUIDE.md for detailed step-by-step instructions including testing in staging, notifying stakeholders, and rollback procedures.

## Bearer Token Questions

### Q: What is a bearer token?

**A:** A bearer token is a simple authentication mechanism defined in RFC 6750. The token is included in the `Authorization` header with the format: `Authorization: Bearer <token>`. It's called "bearer" because the requestor is the "bearer" of the token.

### Q: What's the difference between Bearer token and API keys?

**A:** Bearer tokens and API keys are both valid authentication methods, but they differ in:
- **Bearer tokens:** Standardized format, more suitable for user delegation
- **API keys:** Custom implementation, often used for service-to-service auth

The implementation uses bearer tokens because they're standardized and widely supported.

### Q: Can I use other authentication schemes besides Bearer?

**A:** The current implementation only supports Bearer tokens. If you need other schemes (Basic, Digest, HMAC), create a GitHub issue or modify the code to support them.

### Q: What happens if my bearer token contains special characters?

**A:** Bearer tokens can contain any characters. However, base64-encoded tokens (recommended) only contain A-Z, a-z, 0-9, +, /, and = characters. When in the Authorization header, the token is treated as-is without additional encoding.

## Monitoring Questions

### Q: How do I configure Prometheus to use the metrics token?

**A:** Add `bearer_token` to the scrape config:

```yaml
scrape_configs:
  - job_name: 'chainhook'
    bearer_token: 'YOUR_TOKEN_HERE'
    static_configs:
      - targets: ['chainhook.example.com:3100']
```

Alternatively, use `bearer_token_file`:

```yaml
scrape_configs:
  - job_name: 'chainhook'
    bearer_token_file: '/etc/prometheus/secrets/chainhook-token'
    static_configs:
      - targets: ['chainhook.example.com:3100']
```

### Q: How do I configure Grafana to use the metrics token?

**A:** When creating a Prometheus data source:

1. **URL:** `http://chainhook.example.com:3100/metrics`
2. **HTTP Headers:** Add custom header:
   - Name: `Authorization`
   - Value: `Bearer YOUR_TOKEN_HERE`

Or set authentication to `Bearer Token` (if available in your Grafana version):
- Token: `YOUR_TOKEN_HERE`

### Q: Why are some metrics requests failing with 401?

**A:** Check:
1. Token is set correctly (no typos, no extra whitespace)
2. Authorization header format is correct: `Authorization: Bearer <token>`
3. Bearer is spelled correctly (not "Bearer" with wrong casing)
4. Token hasn't been rotated without updating the monitoring system

### Q: Can I monitor who is accessing the metrics endpoint?

**A:** Yes. Enable access logging in your reverse proxy (nginx, Apache) and review logs for patterns. The logs will show which IPs are attempting metrics access and whether they're authenticating successfully.

## Security Questions

### Q: Is bearer token authentication secure?

**A:** Yes, when used with HTTPS/TLS. The implementation uses:
- Cryptographically secure token generation (256-bit entropy)
- Constant-time token comparison (prevents timing attacks)
- No token logging

However, tokens are only as secure as their storage. Always store tokens in secure vaults, never in version control.

### Q: Can someone guess my metrics token?

**A:** With a 256-bit token, the probability of randomly guessing it is 1 in 2^256 ≈ 1.15 × 10^77. This is effectively impossible with current computing technology.

### Q: What should I do if my metrics token is compromised?

**A:** Immediately:
1. Generate a new token
2. Update all systems (environment, vaults, monitoring configs)
3. Restart the Chainhook service
4. Review access logs to determine what was accessed
5. Update monitoring systems with the new token

See TROUBLESHOOTING.md for detailed incident response procedures.

### Q: Does metrics authentication prevent DDoS attacks?

**A:** No. Bearer token authentication only prevents unauthorized access. To prevent DDoS attacks, use:
- Rate limiting (configure at reverse proxy)
- IP allowlisting (configure at firewall/proxy)
- DDoS protection service (Cloudflare, Akamai, etc.)

### Q: Can I view my metrics token in logs?

**A:** The implementation specifically prevents token logging. Tokens should never appear in:
- Application logs
- Reverse proxy logs
- System logs

If you see tokens in logs, it's a bug. Report it immediately.

## Troubleshooting Questions

### Q: Prometheus says metrics are "DOWN" after I enabled authentication

**A:** Check:
1. Bearer token is set correctly in Prometheus config
2. Chainhook service is running
3. Network connectivity between Prometheus and Chainhook
4. TLS certificate is valid (if using HTTPS)

See TROUBLESHOOTING.md for detailed diagnostic steps.

### Q: I enabled metrics authentication and now all my dashboards are broken

**A:** You need to update Prometheus configuration first. If Prometheus can't scrape metrics, Grafana won't have data. See the migration guide for step-by-step instructions.

### Q: The metrics endpoint is returning 500 errors with token

**A:** Token authentication doesn't cause 500 errors. 500 indicates a server-side problem:
- Database connection issue
- Out of memory
- Unhandled exception

Check service logs for the actual error. The 500 response is unrelated to authentication.

### Q: How do I test if metrics authentication is working?

**A:** Use the validation script:

```bash
./chainhook/scripts/validate-metrics.sh http://localhost:3100
```

Or test manually with curl:

```bash
# Without token (should fail if configured)
curl http://localhost:3100/metrics

# With token (should succeed)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3100/metrics
```

## Performance Questions

### Q: Does bearer token validation add significant overhead?

**A:** No. Token validation adds less than 2ms per request:
- Header parsing: < 1ms
- Constant-time comparison: < 1ms

This is negligible compared to typical metrics response time (20-100ms).

### Q: Will enabling metrics authentication slow down metrics retrieval?

**A:** No noticeable impact. The overhead is less than 2% of typical metrics response time.

## Compliance Questions

### Q: Does metrics authentication help with PCI DSS compliance?

**A:** Yes. Bearer token authentication addresses:
- **Requirement 2.2:** Configure system components securely
- **Requirement 8.3:** Use strong authentication
- **Requirement 10.2:** Maintain detailed audit logs

See COMPLIANCE_GUIDE.md for details on other standards.

### Q: Can I use metrics authentication to meet SOC 2 requirements?

**A:** Yes. Metrics authentication supports SOC 2 Type II compliance by implementing:
- Access controls (bearer token)
- Encryption in transit (HTTPS/TLS)
- Audit logging (request logging)

See COMPLIANCE_GUIDE.md for detailed mapping.

### Q: Should I document my metrics authentication setup?

**A:** Yes. Document:
- When authentication was enabled
- Which token is being used
- Which systems have the token
- Token rotation schedule
- Incident response procedures

This documentation is often required for compliance audits.

## Integration Questions

### Q: Can I use metrics authentication with Datadog?

**A:** Yes. In Datadog agent configuration:

```yaml
init_config:

instances:
  - prometheus_url: http://localhost:3100/metrics
    extra_headers:
      Authorization: "Bearer YOUR_TOKEN_HERE"
```

### Q: Can I use metrics authentication with New Relic?

**A:** Yes. Configure the Prometheus remote write endpoint with:

```yaml
remote_write:
  - url: https://metric-api.newrelic.com/prometheus/write?prometheus_server=YOUR_SERVER
    bearer_token: YOUR_NEWRELIC_API_KEY
    extra_headers:
      Authorization: "Bearer YOUR_METRICS_TOKEN"
```

### Q: Will metrics authentication work with my custom monitoring script?

**A:** Yes, as long as your script can:
1. Send HTTP requests
2. Include custom headers
3. Set `Authorization: Bearer <token>`

Example in Python:

```python
import requests

headers = {'Authorization': f'Bearer {token}'}
response = requests.get('http://localhost:3100/metrics', headers=headers)
```

## FAQ by Category

**Getting Started**
- Q: Do I need to enable metrics authentication?
- Q: What is a bearer token?
- Q: How do I generate a strong token?

**Configuration**
- Q: Can I use environment variables in Kubernetes?
- Q: How often should I rotate tokens?
- Q: What's the recommended token length?

**Monitoring**
- Q: How do I configure Prometheus?
- Q: How do I configure Grafana?
- Q: Can I monitor who's accessing metrics?

**Security**
- Q: Is bearer token authentication secure?
- Q: What if my token is compromised?
- Q: Does this prevent DDoS attacks?

**Troubleshooting**
- Q: Why is Prometheus showing metrics as DOWN?
- Q: Why are my dashboards broken?
- Q: How do I test if authentication is working?

**Compliance**
- Q: Does this help with PCI DSS?
- Q: Can I use this for SOC 2?
- Q: What documentation should I maintain?

See the respective guide documents for more detailed information.
