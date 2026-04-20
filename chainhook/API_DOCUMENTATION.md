# API Documentation: Metrics Endpoint

## Overview

The `/metrics` endpoint provides operational metrics for Chainhook service monitoring and observability.

## Endpoint Details

### Request

**URL:** `/metrics`  
**Method:** `GET`  
**Authentication:** Bearer token (conditional - required if `METRICS_AUTH_TOKEN` is configured)  
**Content-Type:** `application/json`  
**Rate Limiting:** None (unless configured via reverse proxy)

### Authentication

When `METRICS_AUTH_TOKEN` environment variable is set, the endpoint requires Bearer token authentication.

**With Authentication:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:3100/metrics
```

**Without Authentication (if token not configured):**
```bash
curl http://localhost:3100/metrics
```

### Response Format

**Status Code:** 200 OK (success) or 401 Unauthorized (authentication required/failed)

**Content-Type:** `application/json`

**Response Body:**
```json
{
  "methodProposal": 0,
  "methodTransferSTX": 15,
  "methodTransferToken": 42,
  "methodTransferNFT": 3,
  "eventsIndexed": 60,
  "lastIndexTime": 1705756245000,
  "activeRecipients": 18,
  "totalTipsProcessed": 1250,
  "recipientStats": [
    {
      "address": "SP...",
      "count": 15,
      "totalAmount": "1000000"
    }
  ]
}
```

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `methodProposal` | number | Count of contract proposals processed |
| `methodTransferSTX` | number | Count of STX transfers processed |
| `methodTransferToken` | number | Count of token transfers processed |
| `methodTransferNFT` | number | Count of NFT transfers processed |
| `eventsIndexed` | number | Total blockchain events indexed |
| `lastIndexTime` | number | Unix timestamp (milliseconds) of last index event |
| `activeRecipients` | number | Number of unique recipient addresses |
| `totalTipsProcessed` | number | Total number of tips processed |
| `recipientStats` | array | Top recipients with count and amount |

## Error Responses

### 401 Unauthorized

**When:** Bearer token is required but not provided or invalid

**Response:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing bearer token"
}
```

**HTTP Status:** 401

### 500 Internal Server Error

**When:** Unexpected server error while gathering metrics

**Response:**
```json
{
  "error": "Internal Server Error",
  "message": "Failed to retrieve metrics"
}
```

**HTTP Status:** 500

## Examples

### Request with Token

```bash
TOKEN="KGD8xL2p9F5m1Q7rJz0nX4vE6bY3hW+UoS8kP2mL9Aq5aD8vN="

curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  http://localhost:3100/metrics
```

### Request without Token (Open Access)

```bash
curl -X GET \
  -H "Accept: application/json" \
  http://localhost:3100/metrics
```

### Request with cURL (Verbose)

```bash
curl -v \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3100/metrics
```

### Request with Node.js

```javascript
const fetch = require('node-fetch');

const token = process.env.METRICS_AUTH_TOKEN;
const headers = {
  'Authorization': `Bearer ${token}`,
  'Accept': 'application/json'
};

fetch('http://localhost:3100/metrics', { headers })
  .then(res => res.json())
  .then(data => console.log(data));
```

### Request with Python

```python
import requests

token = os.getenv('METRICS_AUTH_TOKEN')
headers = {
    'Authorization': f'Bearer {token}',
    'Accept': 'application/json'
}

response = requests.get('http://localhost:3100/metrics', headers=headers)
data = response.json()
print(data)
```

## Related Endpoints

### Health Check Endpoint

**URL:** `/health`  
**Authentication:** Not required  
**Purpose:** Service health status (always accessible)

```bash
curl http://localhost:3100/health
```

**Response:**
```json
{
  "ok": true,
  "blockHeight": 12345,
  "targetBlockHeight": 12346,
  "lastUpdated": 1705756245000
}
```

### API Ingest Endpoint

**URL:** `/api/ingest`  
**Method:** `POST`  
**Authentication:** Not required  
**Purpose:** Receive blockchain events from Chainhook

### API Stats Endpoint

**URL:** `/api/stats`  
**Method:** `GET`  
**Authentication:** Not required  
**Purpose:** Public statistics (subset of metrics endpoint)

## Rate Limiting

The metrics endpoint does not have built-in rate limiting. If needed, configure at the reverse proxy level:

```nginx
limit_req_zone $binary_remote_addr zone=metrics:10m rate=10r/s;

location /metrics {
    limit_req zone=metrics burst=20 nodelay;
    # ... rest of configuration
}
```

## Monitoring and Alerting

### Example Prometheus Scrape Config

```yaml
scrape_configs:
  - job_name: 'chainhook-metrics'
    scrape_interval: 30s
    metrics_path: '/metrics'
    bearer_token: 'YOUR_TOKEN_HERE'
    static_configs:
      - targets: ['chainhook.example.com:3100']
```

### Example Grafana Panel Query

```json
{
  "datasource": "Prometheus",
  "targets": [
    {
      "expr": "chainhook_total_tips_processed",
      "refId": "A"
    }
  ]
}
```

## Changelog

### Version 1.0

- Initial metrics endpoint
- Bearer token authentication support
- Optional health check always accessible
- Support for conditional metrics access

## Backward Compatibility

By default, metrics endpoint is publicly accessible (no authentication required). Authentication is only enforced when `METRICS_AUTH_TOKEN` environment variable is set.

This maintains backward compatibility with existing monitoring setups while allowing secure deployments to enable authentication when needed.
