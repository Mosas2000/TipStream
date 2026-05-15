import { logger } from './logging.js';
import { SCHEDULED_TIP_STATUSES } from './scheduler.js';

const PROCESSING_INTERVAL_MS = 60000;
const NOTIFICATION_LEAD_MINUTES = 60;

class JobProcessor {
  constructor(scheduledTipStore, options = {}) {
    this.store = scheduledTipStore;
    this.processingInterval = options.processingInterval || PROCESSING_INTERVAL_MS;
    this.notificationLeadMinutes = options.notificationLeadMinutes || NOTIFICATION_LEAD_MINUTES;
    this.intervalId = null;
    this.isProcessing = false;
    this.onExecuteTip = options.onExecuteTip || null;
    this.onNotifyTip = options.onNotifyTip || null;
  }

  start() {
    if (this.intervalId) {
      logger.warn('Job processor already running');
      return;
    }

    logger.info('Starting scheduled tip job processor', {
      processing_interval_ms: this.processingInterval,
      notification_lead_minutes: this.notificationLeadMinutes,
    });

    this.intervalId = setInterval(() => {
      this.processJobs().catch(err => {
        logger.error('Job processing failed', err, {
          error_message: err.message,
        });
      });
    }, this.processingInterval);

    this.processJobs().catch(err => {
      logger.error('Initial job processing failed', err);
    });
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Scheduled tip job processor stopped');
    }
  }

  async processJobs() {
    if (this.isProcessing) {
      logger.debug('Job processing already in progress, skipping');
      return;
    }

    this.isProcessing = true;

    try {
      await this.processNotifications();
      await this.processPendingTips();
    } finally {
      this.isProcessing = false;
    }
  }

  async processNotifications() {
    try {
      const notifiableTips = await this.store.getNotifiableScheduledTips(this.notificationLeadMinutes);

      if (notifiableTips.length === 0) {
        return;
      }

      logger.info('Processing notifications for scheduled tips', {
        count: notifiableTips.length,
      });

      for (const tip of notifiableTips) {
        try {
          if (this.onNotifyTip) {
            await this.onNotifyTip(tip);
          }

          await this.store.updateScheduledTip(tip.id, {
            notifiedAt: new Date(),
          });

          logger.info('Notification sent for scheduled tip', {
            id: tip.id,
            sender: tip.sender,
            scheduled_for: tip.scheduledFor,
          });
        } catch (err) {
          logger.error('Failed to notify scheduled tip', err, {
            id: tip.id,
            error_message: err.message,
          });
        }
      }
    } catch (err) {
      logger.error('Failed to process notifications', err);
    }
  }

  async processPendingTips() {
    try {
      const pendingTips = await this.store.getPendingScheduledTips();

      if (pendingTips.length === 0) {
        return;
      }

      logger.info('Processing pending scheduled tips', {
        count: pendingTips.length,
      });

      for (const tip of pendingTips) {
        await this.processSingleTip(tip);
      }
    } catch (err) {
      logger.error('Failed to process pending tips', err);
    }
  }

  async processSingleTip(tip) {
    try {
      await this.store.updateScheduledTip(tip.id, {
        status: SCHEDULED_TIP_STATUSES.PROCESSING,
      });

      logger.info('Executing scheduled tip', {
        id: tip.id,
        sender: tip.sender,
        recipient: tip.recipient,
        amount: tip.amount,
      });

      let txId = null;
      let failureReason = null;

      if (this.onExecuteTip) {
        try {
          const result = await this.onExecuteTip(tip);
          txId = result.txId;
        } catch (err) {
          failureReason = err.message || 'execution failed';
          logger.error('Failed to execute scheduled tip', err, {
            id: tip.id,
            error_message: err.message,
          });
        }
      } else {
        logger.warn('No execution handler configured for scheduled tips', {
          id: tip.id,
        });
        failureReason = 'no execution handler configured';
      }

      if (txId) {
        await this.store.updateScheduledTip(tip.id, {
          status: SCHEDULED_TIP_STATUSES.EXECUTED,
          executedAt: new Date(),
          txId,
        });

        logger.info('Scheduled tip executed successfully', {
          id: tip.id,
          tx_id: txId,
        });
      } else {
        await this.store.updateScheduledTip(tip.id, {
          status: SCHEDULED_TIP_STATUSES.FAILED,
          failureReason,
        });

        logger.error('Scheduled tip execution failed', {
          id: tip.id,
          failure_reason: failureReason,
        });
      }
    } catch (err) {
      logger.error('Failed to process scheduled tip', err, {
        id: tip.id,
        error_message: err.message,
      });

      try {
        await this.store.updateScheduledTip(tip.id, {
          status: SCHEDULED_TIP_STATUSES.FAILED,
          failureReason: err.message || 'processing error',
        });
      } catch (updateErr) {
        logger.error('Failed to update failed scheduled tip status', updateErr, {
          id: tip.id,
        });
      }
    }
  }

  async getStats() {
    const pendingCount = await this.store.countScheduledTips(SCHEDULED_TIP_STATUSES.PENDING);
    const processingCount = await this.store.countScheduledTips(SCHEDULED_TIP_STATUSES.PROCESSING);
    const executedCount = await this.store.countScheduledTips(SCHEDULED_TIP_STATUSES.EXECUTED);
    const failedCount = await this.store.countScheduledTips(SCHEDULED_TIP_STATUSES.FAILED);
    const cancelledCount = await this.store.countScheduledTips(SCHEDULED_TIP_STATUSES.CANCELLED);

    return {
      pending: pendingCount,
      processing: processingCount,
      executed: executedCount,
      failed: failedCount,
      cancelled: cancelledCount,
      total: pendingCount + processingCount + executedCount + failedCount + cancelledCount,
      is_running: !!this.intervalId,
      processing_interval_ms: this.processingInterval,
    };
  }
}

export { JobProcessor, PROCESSING_INTERVAL_MS, NOTIFICATION_LEAD_MINUTES };
