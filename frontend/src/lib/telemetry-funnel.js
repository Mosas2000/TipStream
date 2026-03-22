export function computeTipFunnel(summary) {
  const { walletConnections, tipsStarted, tipsSubmitted, tipsConfirmed, tipsCancelled, tipsFailed } = summary;

  const stages = [
    {
      id: 'wallet',
      label: 'Wallet Connected',
      count: walletConnections || 0,
      dropOff: 0,
      dropOffPercent: 0,
    },
    {
      id: 'started',
      label: 'Tip Started',
      count: tipsStarted || 0,
      dropOff: (walletConnections || 0) - (tipsStarted || 0),
      dropOffPercent: walletConnections > 0
        ? (((walletConnections - tipsStarted) / walletConnections) * 100)
        : 0,
    },
    {
      id: 'submitted',
      label: 'Tip Submitted',
      count: tipsSubmitted || 0,
      dropOff: (tipsStarted || 0) - (tipsSubmitted || 0),
      dropOffPercent: tipsStarted > 0
        ? (((tipsStarted - tipsSubmitted) / tipsStarted) * 100)
        : 0,
    },
    {
      id: 'confirmed',
      label: 'Tip Confirmed',
      count: tipsConfirmed || 0,
      dropOff: (tipsSubmitted || 0) - (tipsConfirmed || 0),
      dropOffPercent: tipsSubmitted > 0
        ? (((tipsSubmitted - tipsConfirmed) / tipsSubmitted) * 100)
        : 0,
    },
  ];

  const overallConversion = walletConnections > 0
    ? ((tipsConfirmed / walletConnections) * 100).toFixed(1)
    : '0.0';

  const startToFinish = tipsStarted > 0
    ? ((tipsConfirmed / tipsStarted) * 100).toFixed(1)
    : '0.0';

  return {
    stages,
    overallConversion,
    startToFinish,
    cancelled: tipsCancelled || 0,
    failed: tipsFailed || 0,
  };
}

export function computeBatchFunnel(summary) {
  const {
    batchTipsStarted,
    batchTipsSubmitted,
    batchTipsConfirmed,
    batchTipsCancelled,
    batchTipsFailed,
    averageBatchSize,
    sortedBatchSizes,
  } = summary;

  const stages = [
    {
      id: 'started',
      label: 'Batch Started',
      count: batchTipsStarted || 0,
      dropOff: 0,
      dropOffPercent: 0,
    },
    {
      id: 'submitted',
      label: 'Batch Submitted',
      count: batchTipsSubmitted || 0,
      dropOff: (batchTipsStarted || 0) - (batchTipsSubmitted || 0),
      dropOffPercent: batchTipsStarted > 0
        ? (((batchTipsStarted - batchTipsSubmitted) / batchTipsStarted) * 100)
        : 0,
    },
    {
      id: 'confirmed',
      label: 'Batch Confirmed',
      count: batchTipsConfirmed || 0,
      dropOff: (batchTipsSubmitted || 0) - (batchTipsConfirmed || 0),
      dropOffPercent: batchTipsSubmitted > 0
        ? (((batchTipsSubmitted - batchTipsConfirmed) / batchTipsSubmitted) * 100)
        : 0,
    },
  ];

  const overallConversion = batchTipsStarted > 0
    ? ((batchTipsConfirmed / batchTipsStarted) * 100).toFixed(1)
    : '0.0';

  return {
    stages,
    overallConversion,
    cancelled: batchTipsCancelled || 0,
    failed: batchTipsFailed || 0,
    averageBatchSize: averageBatchSize || '0.0',
    sortedBatchSizes: sortedBatchSizes || [],
  };
}

export function computeWalletDropOff(summary) {
  const { walletConnections, walletDisconnections } = summary;
  const rawMetrics = summary.rawMetrics || {};

  const connections = walletConnections || rawMetrics.walletConnections || 0;
  const disconnections = walletDisconnections || rawMetrics.walletDisconnections || 0;

  const retentionRate = connections > 0
    ? (((connections - disconnections) / connections) * 100).toFixed(1)
    : '100.0';

  const dropOffRate = connections > 0
    ? ((disconnections / connections) * 100).toFixed(1)
    : '0.0';

  return {
    connections,
    disconnections,
    retentionRate,
    dropOffRate,
    netConnections: connections - disconnections,
  };
}

export function identifyDropOffPoints(funnel) {
  const { stages } = funnel;
  const issues = [];

  for (let i = 1; i < stages.length; i++) {
    const stage = stages[i];
    if (stage.dropOffPercent > 50) {
      issues.push({
        severity: 'high',
        stage: stage.id,
        label: stage.label,
        message: `${stage.dropOffPercent.toFixed(1)}% drop-off at ${stage.label} stage`,
      });
    } else if (stage.dropOffPercent > 25) {
      issues.push({
        severity: 'medium',
        stage: stage.id,
        label: stage.label,
        message: `${stage.dropOffPercent.toFixed(1)}% drop-off at ${stage.label} stage`,
      });
    }
  }

  return issues;
}

export function getFunnelBarWidth(count, maxCount) {
  if (maxCount === 0) return 0;
  return Math.max(10, (count / maxCount) * 100);
}

export function getFunnelStageColor(index, total) {
  const colors = [
    'bg-blue-500 dark:bg-blue-600',
    'bg-indigo-500 dark:bg-indigo-600',
    'bg-purple-500 dark:bg-purple-600',
    'bg-green-500 dark:bg-green-600',
  ];
  return colors[index] || colors[colors.length - 1];
}
