# Scheduled Tips

The scheduled tips feature allows users to schedule tips to be sent at a future date and time. This is useful for recurring payments, delayed rewards, or planning ahead.

## Features

- Schedule tips up to 365 days in advance
- Minimum scheduling window of 5 minutes
- View and manage all scheduled tips
- Cancel pending scheduled tips
- Automatic execution when scheduled time arrives
- Optional notification before execution
- Full transaction history tracking

## User Interface

### Schedule a Tip

Navigate to the "Schedule" tab to create a new scheduled tip:

1. Enter the recipient's Stacks address
2. Specify the tip amount in STX
3. Select the date and time for execution
4. Add an optional message (up to 280 characters)
5. Choose a category
6. Review the fee breakdown
7. Confirm the scheduled tip

### View Scheduled Tips

Navigate to the "Scheduled" tab to view all your scheduled tips:

- Filter by status: All, Pending, Executed, Cancelled, Failed
- View scheduled date and time
- See recipient and amount details
- Cancel pending tips
- View transaction IDs for executed tips

## API Endpoints

### Create Scheduled Tip

```http
POST /api/scheduled-tips
Content-Type: application/json

{
  "sender": "SP2J6Z...",
  "recipient": "SP3K5...",
  "amount": 1000000,
  "scheduledFor": "2026-05-20T14:30:00.000Z",
  "message": "Monthly tip",
  "category": 1
}
```

**Response:**
```json
{
  "ok": true,
  "scheduledTip": {
    "id": "uuid",
    "sender": "SP2J6Z...",
    "recipient": "SP3K5...",
    "amount": 1000000,
    "scheduledFor": "2026-05-20T14:30:00.000Z",
    "message": "Monthly tip",
    "category": 1,
    "status": "pending",
    "createdAt": "2026-05-14T10:00:00.000Z",
    "updatedAt": "2026-05-14T10:00:00.000Z"
  }
}
```

### List Scheduled Tips

```http
GET /api/scheduled-tips?sender=SP2J6Z...&status=pending&limit=50&offset=0
```

**Query Parameters:**
- `sender` (optional): Filter by sender address
- `recipient` (optional): Filter by recipient address
- `status` (optional): Filter by status (pending, processing, executed, cancelled, failed)
- `limit` (optional): Number of results per page (1-100, default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "scheduledTips": [...],
  "total": 10
}
```

### Get Scheduled Tip

```http
GET /api/scheduled-tips/:id
```

**Response:**
```json
{
  "id": "uuid",
  "sender": "SP2J6Z...",
  "recipient": "SP3K5...",
  "amount": 1000000,
  "scheduledFor": "2026-05-20T14:30:00.000Z",
  "status": "pending",
  ...
}
```

### Cancel Scheduled Tip

```http
DELETE /api/scheduled-tips/:id
Content-Type: application/json

{
  "sender": "SP2J6Z..."
}
```

**Response:**
```json
{
  "ok": true,
  "scheduledTip": {
    "id": "uuid",
    "status": "cancelled",
    ...
  }
}
```

## Job Processor

The job processor runs in the background to execute scheduled tips and send notifications.

### Configuration

Environment variables:
- `PROCESSING_INTERVAL_MS`: How often to check for pending tips (default: 60000ms)
- `NOTIFICATION_LEAD_MINUTES`: How many minutes before execution to send notification (default: 60)

### Execution Flow

1. Job processor checks for pending tips every minute
2. Tips with scheduled time in the past are marked as "processing"
3. Execution handler is called (must be provided by implementation)
4. On success, tip is marked as "executed" with transaction ID
5. On failure, tip is marked as "failed" with failure reason

### Notifications

Tips can trigger notifications before execution:
- Default: 60 minutes before scheduled time
- Only sent once per tip
- Notification handler must be provided by implementation

## Database Schema

### scheduled_tips Table

```sql
CREATE TABLE scheduled_tips (
  id TEXT PRIMARY KEY,
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  amount BIGINT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  category INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at TIMESTAMPTZ,
  tx_id TEXT,
  failure_reason TEXT,
  notified_at TIMESTAMPTZ
);
```

### Indexes

- `scheduled_tips_sender_idx`: Fast lookup by sender
- `scheduled_tips_recipient_idx`: Fast lookup by recipient
- `scheduled_tips_status_idx`: Fast filtering by status
- `scheduled_tips_scheduled_for_idx`: Fast sorting by scheduled time
- `scheduled_tips_pending_due_idx`: Optimized for job processor queries

## Status Flow

```
pending → processing → executed
                    ↘ failed

pending → cancelled
```

- **pending**: Scheduled tip waiting for execution time
- **processing**: Currently being executed
- **executed**: Successfully executed with transaction ID
- **failed**: Execution failed with reason
- **cancelled**: Cancelled by sender before execution

## Validation Rules

### Amount
- Minimum: 1,000 microSTX (0.001 STX)
- Maximum: 10,000,000,000,000 microSTX (10,000 STX)

### Scheduled Time
- Minimum: 5 minutes in the future
- Maximum: 365 days in the future

### Message
- Maximum length: 280 characters
- Optional field

### Category
- Must be a non-negative integer
- Default: 0 (General)

### Sender/Recipient
- Must be valid Stacks addresses
- Cannot be the same address

## Analytics

The following metrics are tracked:
- `scheduledTipsCreated`: Number of scheduled tips created
- `scheduledTipsCancelled`: Number of scheduled tips cancelled
- `scheduledTipsExecuted`: Number of scheduled tips executed successfully
- `scheduledTipsFailed`: Number of scheduled tips that failed execution

## Error Handling

### Common Errors

**Invalid scheduled time:**
```json
{
  "error": "bad_request",
  "message": "Scheduled time must be at least 5 minutes in the future"
}
```

**Insufficient balance:**
Checked at execution time, not at scheduling time. If balance is insufficient when execution time arrives, the tip will be marked as failed.

**Cancelled tip:**
```json
{
  "error": "bad_request",
  "message": "can only cancel pending scheduled tips"
}
```

**Not found:**
```json
{
  "error": "scheduled tip not found or you are not the sender"
}
```

## Testing

Run tests:
```bash
cd chainhook
npm test scheduler.test.js
npm test storage-scheduled.test.js
```

## Future Enhancements

Potential improvements for future versions:
- Recurring scheduled tips (daily, weekly, monthly)
- Batch scheduled tips
- Email/SMS notifications
- Scheduled tip templates
- Balance verification at scheduling time
- Automatic retry on failure
- Scheduled tip marketplace
