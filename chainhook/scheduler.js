import { randomUUID } from 'node:crypto';

const SCHEDULED_TIP_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  EXECUTED: 'executed',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
};

const MIN_SCHEDULE_MINUTES = 5;
const MAX_SCHEDULE_DAYS = 365;

function validateScheduledTime(scheduledFor) {
  const scheduledDate = new Date(scheduledFor);
  const now = new Date();

  if (isNaN(scheduledDate.getTime())) {
    return { valid: false, error: 'Invalid scheduled date format' };
  }

  const minTime = new Date(now.getTime() + MIN_SCHEDULE_MINUTES * 60 * 1000);
  if (scheduledDate < minTime) {
    return { valid: false, error: `Scheduled time must be at least ${MIN_SCHEDULE_MINUTES} minutes in the future` };
  }

  const maxTime = new Date(now.getTime() + MAX_SCHEDULE_DAYS * 24 * 60 * 60 * 1000);
  if (scheduledDate > maxTime) {
    return { valid: false, error: `Scheduled time cannot be more than ${MAX_SCHEDULE_DAYS} days in the future` };
  }

  return { valid: true };
}

function validateScheduledTipParams(params) {
  const { sender, recipient, amount, scheduledFor, message, category } = params;

  if (!sender || typeof sender !== 'string') {
    return { valid: false, error: 'Sender address is required' };
  }

  if (!recipient || typeof recipient !== 'string') {
    return { valid: false, error: 'Recipient address is required' };
  }

  if (sender === recipient) {
    return { valid: false, error: 'Cannot schedule a tip to yourself' };
  }

  const amountNum = Number(amount);
  if (!amount || isNaN(amountNum) || amountNum <= 0) {
    return { valid: false, error: 'Amount must be a positive number' };
  }

  if (amountNum < 1000) {
    return { valid: false, error: 'Minimum tip amount is 1000 microSTX (0.001 STX)' };
  }

  if (amountNum > 10000000000000) {
    return { valid: false, error: 'Maximum tip amount is 10,000,000,000,000 microSTX (10,000 STX)' };
  }

  const timeValidation = validateScheduledTime(scheduledFor);
  if (!timeValidation.valid) {
    return timeValidation;
  }

  if (message && typeof message !== 'string') {
    return { valid: false, error: 'Message must be a string' };
  }

  if (message && message.length > 280) {
    return { valid: false, error: 'Message must be 280 characters or less' };
  }

  if (category !== undefined && (typeof category !== 'number' || category < 0)) {
    return { valid: false, error: 'Category must be a non-negative number' };
  }

  return { valid: true };
}

class ScheduledTip {
  constructor(data) {
    this.id = data.id || randomUUID();
    this.sender = data.sender;
    this.recipient = data.recipient;
    this.amount = data.amount;
    this.scheduledFor = new Date(data.scheduledFor);
    this.message = data.message || '';
    this.category = data.category ?? 0;
    this.status = data.status || SCHEDULED_TIP_STATUSES.PENDING;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
    this.executedAt = data.executedAt ? new Date(data.executedAt) : null;
    this.txId = data.txId || null;
    this.failureReason = data.failureReason || null;
    this.notifiedAt = data.notifiedAt ? new Date(data.notifiedAt) : null;
  }

  toJSON() {
    return {
      id: this.id,
      sender: this.sender,
      recipient: this.recipient,
      amount: this.amount,
      scheduledFor: this.scheduledFor.toISOString(),
      message: this.message,
      category: this.category,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      executedAt: this.executedAt ? this.executedAt.toISOString() : null,
      txId: this.txId,
      failureReason: this.failureReason,
      notifiedAt: this.notifiedAt ? this.notifiedAt.toISOString() : null,
    };
  }

  isPending() {
    return this.status === SCHEDULED_TIP_STATUSES.PENDING;
  }

  isExecutable() {
    return this.isPending() && this.scheduledFor <= new Date();
  }

  isNotifiable(notificationLeadMinutes = 60) {
    if (!this.isPending() || this.notifiedAt) return false;
    const notificationTime = new Date(this.scheduledFor.getTime() - notificationLeadMinutes * 60 * 1000);
    return new Date() >= notificationTime;
  }
}

export {
  ScheduledTip,
  SCHEDULED_TIP_STATUSES,
  validateScheduledTime,
  validateScheduledTipParams,
  MIN_SCHEDULE_MINUTES,
  MAX_SCHEDULE_DAYS,
};
