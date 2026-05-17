# WebSocket Real-Time Notifications Implementation

## Overview

This document describes the WebSocket implementation for real-time tip notifications in TipStream. The feature eliminates the need for constant polling by pushing tip events to connected clients as they occur.

## Architecture

### Backend (Chainhook)

**Location**: `chainhook/websocket.js`

The backend WebSocket server is built using the `ws` library and integrates with the existing Chainhook event ingestion pipeline.

#### Key Components

1. **WebSocketManager Class**
   - Manages all connected WebSocket clients
   - Handles client lifecycle (connect, disconnect, heartbeat)
   - Broadcasts tip events to subscribed clients
   - Supports address-based filtering

2. **Integration Points**
   - Attached to the HTTP server on `/ws` endpoint
   - Receives tip events from Chainhook webhook handler
   - Broadcasts events in real-time to connected clients

#### Features

- **Heartbeat Monitoring**: 30-second ping interval with 60-second timeout
- **Address Subscription**: Clients can subscribe to specific Stacks addresses
- **Graceful Shutdown**: Properly closes all connections during server shutdown
- **Connection Statistics**: `/api/ws/stats` endpoint for monitoring

#### Message Types

**Server → Client:**
- `connected`: Sent immediately after connection
- `tip_event`: Broadcast when a new tip is received
- `ping`: Heartbeat to keep connection alive
- `error`: Error messages (e.g., invalid JSON)

**Client → Server:**
- `subscribe`: Subscribe to a specific address
- `unsubscribe`: Remove address filter

### Frontend

**Locations**:
- `frontend/src/hooks/useWebSocket.js` - Low-level WebSocket hook
- `frontend/src/context/TipContext.jsx` - Integration with app state
- `frontend/src/components/WsConnectionBadge.jsx` - Connection status UI

#### Key Components

1. **useWebSocket Hook**
   - Manages WebSocket connection lifecycle
   - Automatic reconnection with exponential backoff
   - Heartbeat timeout detection
   - Address subscription management

2. **TipContext Integration**
   - Receives real-time tip events via WebSocket
   - Merges WebSocket events with polled data
   - Reduces polling frequency when WebSocket is active
   - Falls back to polling when WebSocket unavailable

3. **WsConnectionBadge Component**
   - Visual indicator of connection status
   - Shows "Live", "Connecting", "Reconnecting", or "Polling"
   - Only renders when WebSocket URL is configured

## Configuration

### Backend

The WebSocket server is automatically attached to the HTTP server when it starts. No additional configuration is required.

**Environment Variables**: None (uses same port as HTTP server)

### Frontend

**Environment Variable**: `VITE_WS_URL`

```bash
# Development
VITE_WS_URL=ws://localhost:3001/ws

# Production
VITE_WS_URL=wss://your-domain.com/ws
```

When `VITE_WS_URL` is not set, the frontend falls back to polling-only mode.

## Connection Flow

### Initial Connection

1. Frontend creates WebSocket connection to configured URL
2. Server sends `connected` message
3. If user is authenticated, frontend sends `subscribe` message with address
4. Server filters future broadcasts to match subscribed address

### Receiving Tips

1. Chainhook webhook receives new block data
2. Server parses tip events and calls `wsManager.broadcast(tipEvent)`
3. WebSocketManager sends `tip_event` to all relevant clients
4. Frontend receives message and injects event into local cache
5. UI updates immediately without polling

### Reconnection

1. Connection lost (network issue, server restart, etc.)
2. Frontend detects disconnect via `onclose` event
3. Automatic reconnection after 3-second delay
4. Maximum 5 reconnection attempts
5. Falls back to polling if reconnection fails

## Polling Behavior

The frontend maintains polling as a fallback mechanism:

- **WebSocket Disconnected**: Poll every 30 seconds (normal)
- **WebSocket Connected**: Poll every 120 seconds (reduced)

This hybrid approach ensures:
- Data consistency even if WebSocket messages are missed
- Graceful degradation when WebSocket is unavailable
- No duplicate events (deduplication handles overlaps)

## Testing

### Backend Tests

**Location**: `chainhook/websocket.test.js`

- 17 tests covering connection lifecycle, broadcasting, subscriptions, and cleanup
- Uses Node.js native test runner
- Run with: `npm test -- websocket.test.js` (in `chainhook/` directory)

### Frontend Tests

**Locations**:
- `frontend/src/hooks/useWebSocket.test.js` (22 tests)
- `frontend/src/components/WsConnectionBadge.test.jsx` (13 tests)
- `frontend/src/test/TipContext.websocket.test.jsx` (10 tests)

Total: 45 frontend tests

Run with: `npm test` (in `frontend/` directory)

## Monitoring

### Connection Statistics

**Endpoint**: `GET /api/ws/stats`

Returns:
```json
{
  "connectedClients": 5,
  "uptime": 3600
}
```

### Logs

The WebSocket server logs all significant events:
- Client connections/disconnections
- Broadcast operations
- Subscription changes
- Errors and timeouts

## Security Considerations

1. **No Authentication**: WebSocket connections are unauthenticated. Clients can subscribe to any address.
2. **Rate Limiting**: No rate limiting on WebSocket connections (relies on HTTP server limits)
3. **Message Validation**: All incoming messages are validated and malformed JSON is rejected
4. **HTTPS/WSS**: Use WSS (WebSocket Secure) in production

## Performance

### Backend

- **Memory**: ~1KB per connected client
- **CPU**: Minimal (event-driven architecture)
- **Network**: ~100 bytes per tip event broadcast

### Frontend

- **Memory**: Single WebSocket connection per tab
- **CPU**: Negligible (message parsing only)
- **Network**: Reduced by 75% compared to polling-only

## Deployment

### Backend

No special deployment steps required. The WebSocket server starts automatically with the HTTP server.

### Frontend

1. Set `VITE_WS_URL` environment variable
2. Build frontend: `npm run build`
3. Deploy static assets

**Note**: Ensure your reverse proxy (nginx, etc.) supports WebSocket upgrades:

```nginx
location /ws {
    proxy_pass http://backend:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

## Troubleshooting

### WebSocket Connection Fails

1. Check `VITE_WS_URL` is set correctly
2. Verify backend is running and accessible
3. Check browser console for connection errors
4. Ensure firewall allows WebSocket connections

### Events Not Received

1. Check WebSocket connection status in UI
2. Verify backend logs show broadcast operations
3. Check if address subscription is correct
4. Confirm events are being ingested by Chainhook

### High Reconnection Rate

1. Check network stability
2. Verify backend server health
3. Review heartbeat timeout settings
4. Check for proxy/load balancer issues

## Future Enhancements

- [ ] Authentication for WebSocket connections
- [ ] Rate limiting per client
- [ ] Message compression for large broadcasts
- [ ] Presence detection (online users)
- [ ] Typing indicators for messages
- [ ] Read receipts for notifications

## References

- [WebSocket Protocol (RFC 6455)](https://tools.ietf.org/html/rfc6455)
- [ws Library Documentation](https://github.com/websockets/ws)
- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
