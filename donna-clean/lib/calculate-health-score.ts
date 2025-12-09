interface HealthScoreData {
  totalScore: number;
  breakdown: {
    cashHealth: { score: number; max: 30; status: string };
    profitHealth: { score: number; max: 30; status: string };
    collectionsHealth: { score: number; max: 20; status: string };
    payablesHealth: { score: number; max: 20; status: string };
  };
  status: 'excellent' | 'good' | 'fair' | 'needs-attention';
  statusColor: string;
  statusEmoji: string;
}

export function calculateHealthScore(data: {
  cash: number;
  profit: number;
  sales: number;
  pendingCollections: number;
  pendingBills: number;
  oldestCollectionDays: number; // Days since oldest unpaid invoice
  oldestBillDays: number; // Days since oldest unpaid bill
}): HealthScoreData {
  let cashScore = 0;
  let profitScore = 0;
  let collectionsScore = 0;
  let payablesScore = 0;

  // CASH HEALTH (30 points)
  if (data.cash > 0) {
    cashScore += 20; // Positive cash
    if (data.cash > data.sales * 0.5) { // More than 50% of monthly sales
      cashScore += 10; // Good runway
    }
  }

  // PROFIT HEALTH (30 points)
  if (data.profit > 0) {
    profitScore += 20; // Positive profit
    const margin = data.sales > 0 ? (data.profit / data.sales) * 100 : 0;
    if (margin > 20) {
      profitScore += 10; // Good margin
    }
  }

  // COLLECTIONS HEALTH (20 points)
  if (data.oldestCollectionDays <= 30) {
    collectionsScore = 20; // All recent
  } else if (data.oldestCollectionDays <= 60) {
    collectionsScore = 10; // Some aging
  } else {
    collectionsScore = 5; // Old collections
  }

  if (data.pendingCollections === 0) {
    collectionsScore = 20; // Nothing pending - excellent!
  }

  // PAYABLES HEALTH (20 points)
  if (data.oldestBillDays <= 30) {
    payablesScore = 20; // All current
  } else if (data.oldestBillDays <= 60) {
    payablesScore = 10; // Some overdue
  } else {
    payablesScore = 5; // Many overdue
  }

  if (data.pendingBills === 0) {
    payablesScore = 20; // All paid - excellent!
  }

  const totalScore = cashScore + profitScore + collectionsScore + payablesScore;

  // Determine status
  let status: HealthScoreData['status'];
  let statusColor: string;
  let statusEmoji: string;

  if (totalScore >= 85) {
    status = 'excellent';
    statusColor = 'text-green-400';
    statusEmoji = '🌟';
  } else if (totalScore >= 70) {
    status = 'good';
    statusColor = 'text-blue-400';
    statusEmoji = '✅';
  } else if (totalScore >= 50) {
    status = 'fair';
    statusColor = 'text-yellow-400';
    statusEmoji = '⚠️';
  } else {
    status = 'needs-attention';
    statusColor = 'text-red-400';
    statusEmoji = '🚨';
  }

  return {
    totalScore,
    breakdown: {
      cashHealth: {
        score: cashScore,
        max: 30,
        status: cashScore >= 25 ? 'Excellent' : cashScore >= 15 ? 'Good' : 'Needs attention'
      },
      profitHealth: {
        score: profitScore,
        max: 30,
        status: profitScore >= 25 ? 'Excellent' : profitScore >= 15 ? 'Good' : 'Needs attention'
      },
      collectionsHealth: {
        score: collectionsScore,
        max: 20,
        status: collectionsScore >= 15 ? 'Excellent' : collectionsScore >= 10 ? 'Fair' : 'Needs attention'
      },
      payablesHealth: {
        score: payablesScore,
        max: 20,
        status: payablesScore >= 15 ? 'Excellent' : payablesScore >= 10 ? 'Fair' : 'Overdue items'
      }
    },
    status,
    statusColor,
    statusEmoji
  };
}
