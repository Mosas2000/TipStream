/**
 * Metrics collection for the chainhook service.
 * 
 * Tracks operational metrics for visibility into event processing,
 * performance, and health of the ingestion pipeline.
 */

export class Metrics {
  constructor() {
    this.eventsIndexed = 0;
    this.eventsDuplicated = 0;
    this.eventsProcessed = 0;
    this.requestsReceived = 0;
    this.requestsSuccessful = 0;
    this.requestsFailed = 0;
    this.processingTimeMs = [];
    this.lastIndexTime = null;
    this.startTime = Date.now();
  }

  /**
   * Record successful event indexing.
   * @param {number} count - Number of events indexed
   * @param {number} duplicateCount - Number of duplicates filtered
   * @param {number} processingMs - Time spent processing (milliseconds)
   */
  recordEventIndex(count, duplicateCount, processingMs) {
    this.eventsIndexed += count;
    this.eventsDuplicated += duplicateCount;
    this.eventsProcessed += count + duplicateCount;
    this.processingTimeMs.push(processingMs);
    this.lastIndexTime = Date.now();
  }

  /**
   * Record an inbound webhook request.
   * @param {boolean} success - Whether the request was processed successfully
   */
  recordRequest(success) {
    this.requestsReceived++;
    if (success) {
      this.requestsSuccessful++;
    } else {
      this.requestsFailed++;
    }
  }

  /**
   * Get average processing time over recent operations.
   * @returns {number} Average in milliseconds
   */
  getAverageProcessingTime() {
    if (this.processingTimeMs.length === 0) return 0;
    const sum = this.processingTimeMs.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.processingTimeMs.length);
  }

  /**
   * Get service uptime in seconds.
   * @returns {number}
   */
  getUptimeSeconds() {
    return Math.round((Date.now() - this.startTime) / 1000);
  }

  /**
   * Get success rate as a percentage.
   * @returns {number}
   */
  getSuccessRate() {
    if (this.requestsReceived === 0) return 100;
    return Math.round((this.requestsSuccessful / this.requestsReceived) * 100);
  }

  /**
   * Serialize metrics to JSON for exposure via /metrics endpoint.
   * @returns {object}
   */
  toJSON() {
    return {
      timestamp: new Date().toISOString(),
      uptime_seconds: this.getUptimeSeconds(),
      events_indexed: this.eventsIndexed,
      events_deduplicated: this.eventsDuplicated,
      events_processed: this.eventsProcessed,
      requests_received: this.requestsReceived,
      requests_successful: this.requestsSuccessful,
      requests_failed: this.requestsFailed,
      success_rate_percent: this.getSuccessRate(),
      avg_processing_ms: this.getAverageProcessingTime(),
      last_index_time: this.lastIndexTime ? new Date(this.lastIndexTime).toISOString() : null,
    };
  }
}

export const metrics = new Metrics();
