# TipStream Chainhook Service

Webhook listener for TipStream on-chain events from the Stacks blockchain.

## Features

- Event ingestion from chainhook webhooks
- PostgreSQL and in-memory storage backends
- Event deduplication
- Rate limiting and authentication
- Metrics and health endpoints
- Configurable connection pooling

## Configuration

### Storage

Set `CHAINHOOK_STORAGE` to either `postgres` or `memory`.

For PostgreSQL, provide `DATABASE_URL`:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/tipstream
```

### Connection Pool

Configure PostgreSQL connection pooling for production deployments:

```bash
DB_POOL_MAX=20                        # Maximum connections
DB_POOL_IDLE_TIMEOUT_MS=30000         # Idle connection timeout
DB_POOL_CONNECTION_TIMEOUT_MS=5000    # Connection acquisition timeout
DB_STATEMENT_TIMEOUT_MS=30000         # Query execution timeout
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed pool configuration guidance.

### Authentication

Set `CHAINHOOK_AUTH_TOKEN` to secure the webhook endpoint:

```bash
CHAINHOOK_AUTH_TOKEN=your-secret-token
```

### Rate Limiting

Configure request rate limits:

```bash
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

## Running

```bash
npm start
```

## Testing

```bash
npm test
```

## API Endpoints

- `POST /api/chainhook/events` - Ingest events from chainhook
- `GET /api/tips` - List recent tips
- `GET /api/tips/:id` - Get tip by ID
- `GET /api/tips/user/:address` - Get tips for user
- `GET /api/stats` - Platform statistics
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

## Environment Variables

See [.env.example](./.env.example) for all available configuration options.
