# Example Grafana Dashboard Configuration for Chainhook Metrics

This directory contains example dashboard JSON files for Grafana visualization of Chainhook metrics.

## Dashboard Descriptions

### chainhook-overview.json
Main overview dashboard showing:
- Event ingest rates
- Metrics endpoint uptime
- Health check status
- Request latency percentiles
- Error rates

### chainhook-events.json
Event processing dashboard showing:
- Events indexed per method
- Event queue depth
- Processing latency
- Failed event tracking
- Event type distribution

### chainhook-health.json
Health and status dashboard showing:
- Service uptime
- Block height tracking
- Database connectivity
- Redis connectivity
- Request success/failure ratio

### chainhook-security.json
Security and access control dashboard showing:
- Unauthorized metrics access attempts
- Bearer token validation failures
- IP allowlist violations
- Request source analysis
- Rate limit hits

## Importing Dashboards into Grafana

### Method 1: Via Web UI
1. Open Grafana at `http://localhost:3000`
2. Login with admin credentials
3. Navigate to: Configuration > Data Sources
4. Verify Prometheus is configured with metrics endpoint
5. Go to: Dashboards > Import
6. Upload JSON file from this directory
7. Select Prometheus data source
8. Click Import

### Method 2: Via API
```bash
curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Authorization: Bearer $GRAFANA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d @chainhook-overview.json
```

### Method 3: Kubernetes Configmap
```bash
kubectl create configmap grafana-dashboards \
  --from-file=chainhook-overview.json \
  --from-file=chainhook-events.json \
  --from-file=chainhook-health.json \
  --from-file=chainhook-security.json \
  -n monitoring
```

## Metrics Used

### Ingest Metrics
- `chainhook_ingest_total` - Total events ingested
- `chainhook_ingest_errors` - Failed ingest attempts
- `chainhook_ingest_duration_ms` - Time to process ingest request

### Processing Metrics
- `chainhook_method_proposal_count` - Contract proposal count
- `chainhook_method_transfer_stx_count` - STX transfer count
- `chainhook_method_transfer_token_count` - Token transfer count
- `chainhook_method_transfer_nft_count` - NFT transfer count

### Endpoint Metrics
- `chainhook_health_check_total` - Health check calls
- `chainhook_metrics_requests_total` - Metrics endpoint calls
- `chainhook_metrics_unauthorized_total` - Unauthorized metrics attempts
- `chainhook_metrics_errors_total` - Metrics endpoint errors

### Operational Metrics
- `chainhook_events_indexed_total` - Total indexed events
- `chainhook_database_query_duration_ms` - DB query time
- `chainhook_cache_hits_total` - Cache hit count
- `chainhook_cache_misses_total` - Cache miss count

## Alert Rules

Recommended alert rules for Grafana:

```yaml
groups:
  - name: chainhook
    interval: 30s
    rules:
      - alert: MetricsEndpointDown
        expr: up{job="chainhook-metrics"} == 0
        for: 5m
        annotations:
          summary: "Chainhook metrics endpoint is down"

      - alert: HighUnauthorizedAccessRate
        expr: rate(chainhook_metrics_unauthorized[5m]) > 5
        for: 5m
        annotations:
          summary: "High rate of unauthorized metrics access"

      - alert: IngestErrorsIncreasing
        expr: rate(chainhook_ingest_errors[5m]) > 0.1
        for: 10m
        annotations:
          summary: "Ingest error rate is increasing"

      - alert: HealthCheckDown
        expr: up{job="chainhook-health"} == 0
        for: 2m
        annotations:
          summary: "Chainhook health check is failing"

      - alert: ProcessingLatencyHigh
        expr: histogram_quantile(0.95, chainhook_ingest_duration_ms) > 5000
        for: 10m
        annotations:
          summary: "Ingest processing latency is high (95th percentile > 5s)"
```

## Customization

To customize dashboards:

1. Edit the JSON file in a text editor
2. Modify queries to match your metric names
3. Adjust time ranges and refresh intervals
4. Re-import into Grafana

For advanced customization, edit directly in Grafana:
1. Open dashboard
2. Click Edit button
3. Modify panels and queries
4. Export updated JSON to save changes
