# WebSocket Real-Time Notifications Setup Guide

## What is This?

TipStream supports real-time tip notifications via WebSocket. When enabled, you'll see tips appear instantly without waiting for the polling interval.

## Quick Start

### Backend (Chainhook)

No configuration needed. The WebSocket server starts automatically on the same port as the HTTP server at the `/ws` endpoint.

### Frontend

Add the WebSocket URL to your environment configuration:

```bash
# .env.local or .env.production
VITE_WS_URL=ws://localhost:3001/ws
```

For production with HTTPS, use `wss://`:

```bash
VITE_WS_URL=wss://your-domain.com/ws
```

That's it! The frontend will automatically connect and start receiving real-time updates.

## How It Works

1. **Without WebSocket** (polling only):
   - Frontend checks for new tips every 30 seconds
   - Higher server load
   - Delayed notifications

2. **With WebSocket** (real-time):
   - Tips appear instantly when they occur
   - Polling reduced to every 120 seconds (backup)
   - Lower server load
   - Better user experience

## Connection Status

The header shows your connection status:

- **Live** (green): Real-time updates active
- **Connecting** (yellow): Establishing connection
- **Reconnecting** (yellow): Attempting to reconnect
- **Polling** (gray): Using fallback polling mode

## Troubleshooting

### "Polling" Status (Expected "Live")

**Check your configuration:**
```bash
# Verify VITE_WS_URL is set
echo $VITE_WS_URL

# Rebuild frontend if you just added it
npm run build
```

**Check backend is running:**
```bash
# Test WebSocket endpoint
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  http://localhost:3001/ws
```

### Connection Keeps Dropping

1. Check network stability
2. Verify backend server is healthy
3. Check reverse proxy WebSocket support (see below)

## Reverse Proxy Configuration

### Nginx

```nginx
location /ws {
    proxy_pass http://backend:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
}
```

### Apache

```apache
<Location /ws>
    ProxyPass ws://backend:3001/ws
    ProxyPassReverse ws://backend:3001/ws
</Location>
```

### Caddy

```caddy
reverse_proxy /ws backend:3001
```

## Monitoring

Check WebSocket statistics:

```bash
curl http://localhost:3001/api/ws/stats
```

Response:
```json
{
  "connectedClients": 5,
  "uptime": 3600
}
```

## Disabling WebSocket

To disable WebSocket and use polling only:

1. Remove or comment out `VITE_WS_URL`
2. Rebuild frontend
3. Deploy

The app will work normally with polling-only mode.

## Security Notes

- WebSocket connections are currently unauthenticated
- Use WSS (WebSocket Secure) in production
- Ensure your firewall allows WebSocket connections
- Consider rate limiting at the reverse proxy level

## Need Help?

- Check browser console for connection errors
- Review backend logs for WebSocket events
- Verify environment variables are set correctly
- Test WebSocket endpoint directly (see troubleshooting)
