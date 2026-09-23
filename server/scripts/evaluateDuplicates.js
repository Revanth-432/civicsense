const path = require('path');
const {
  calculateGeoScore,
  calculateTimeScore,
  calculateCosineSimilarity,
  generateTextEmbedding
} = require('../src/services/deduplicationService');

const now = new Date();
const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

const mockPairs = [
  // --- Obvious Duplicates ---
  {
    isActualDuplicate: true,
    desc: 'Very close duplicate',
    A: { description: 'Pothole on main street near the bakery', createdAt: daysAgo(1), distance: 0 },
    B: { description: 'Huge pothole right in front of the bakery on main st', createdAt: daysAgo(1), distance: 5 } // 5 meters away
  },
  {
    isActualDuplicate: true,
    desc: 'Same day, same spot',
    A: { description: 'Road crack covering the whole lane', createdAt: daysAgo(0), distance: 0 },
    B: { description: 'Crack in the road across the lane', createdAt: daysAgo(0), distance: 2 }
  },
  {
    isActualDuplicate: true,
    desc: 'A few days apart, identical location',
    A: { description: 'Streetlight is completely out', createdAt: daysAgo(5), distance: 0 },
    B: { description: 'Broken streetlight, very dark', createdAt: daysAgo(2), distance: 10 }
  },
  
  // --- Tricky Edge Cases ---
  {
    isActualDuplicate: true,
    desc: 'Different description, same issue',
    A: { description: 'There is a crater in the road', createdAt: daysAgo(2), distance: 0 },
    B: { description: 'Need asphalt repair, deep hole', createdAt: daysAgo(2), distance: 8 }
  },
  {
    isActualDuplicate: false,
    desc: 'Same location, distinct issues',
    A: { description: 'Pothole on main street', createdAt: daysAgo(10), distance: 0 },
    B: { description: 'Streetlight out on main street', createdAt: daysAgo(10), distance: 5 }
  },
  {
    isActualDuplicate: false,
    desc: 'Same issue, very far apart (different ends of street)',
    A: { description: 'Pothole', createdAt: daysAgo(1), distance: 0 },
    B: { description: 'Pothole', createdAt: daysAgo(1), distance: 500 }
  },
  {
    isActualDuplicate: true,
    desc: 'Long time ago vs now, same pothole not fixed',
    A: { description: 'Pothole getting bigger', createdAt: daysAgo(45), distance: 0 },
    B: { description: 'Huge pothole', createdAt: daysAgo(1), distance: 2 }
  },
  
  // --- Obvious Non-Duplicates ---
  {
    isActualDuplicate: false,
    desc: 'Different issue, different time, far away',
    A: { description: 'Garbage pile', createdAt: daysAgo(20), distance: 0 },
    B: { description: 'Water leak', createdAt: daysAgo(1), distance: 1000 }
  },
  {
    isActualDuplicate: false,
    desc: 'Same text, far distance',
    A: { description: 'Road damage', createdAt: daysAgo(5), distance: 0 },
    B: { description: 'Road damage', createdAt: daysAgo(5), distance: 200 }
  },
  {
    isActualDuplicate: false,
    desc: 'Different time, different location',
    A: { description: 'Water leak on 5th', createdAt: daysAgo(2), distance: 0 },
    B: { description: 'Water leak on 10th', createdAt: daysAgo(30), distance: 800 }
  }
];

async function runEvaluation() {
  console.log("Initializing ML pipelines and computing scores... This may take a few seconds.\n");

  const results = [];

  for (const pair of mockPairs) {
    const embedA = await generateTextEmbedding(pair.A.description);
    const embedB = await generateTextEmbedding(pair.B.description);

    const geoScore = calculateGeoScore(pair.B.distance);
    const timeScore = calculateTimeScore(pair.B.createdAt);
    const textScore = calculateCosineSimilarity(embedA, embedB);
    const imageScore = 0.5; // Placeholder

    const totalScore = (0.55 * geoScore) + (0.20 * textScore) + (0.10 * imageScore) + (0.15 * timeScore);

    results.push({
      desc: pair.desc,
      isActualDuplicate: pair.isActualDuplicate,
      score: totalScore
    });
  }

  const thresholds = [0.40, 0.50, 0.60, 0.70, 0.80];
  const tableData = [];

  for (const t of thresholds) {
    let tp = 0, fp = 0, fn = 0, tn = 0;

    for (const r of results) {
      const isPredicted = r.score >= t;
      if (isPredicted && r.isActualDuplicate) tp++;
      else if (isPredicted && !r.isActualDuplicate) fp++;
      else if (!isPredicted && r.isActualDuplicate) fn++;
      else if (!isPredicted && !r.isActualDuplicate) tn++;
    }

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = (precision + recall) > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

    tableData.push({
      Threshold: t.toFixed(2),
      TP: tp,
      FP: fp,
      FN: fn,
      Precision: precision.toFixed(3),
      Recall: recall.toFixed(3),
      'F1 Score': f1.toFixed(3)
    });
  }

  console.table(tableData);
  console.log("\nEvaluation Complete!");
}

runEvaluation().catch(err => {
  console.error("Evaluation failed:", err);
});
