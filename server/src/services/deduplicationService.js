const { Complaint } = require('../models/Complaint');
const { pipeline } = require('@xenova/transformers');

// Lazy-loaded pipeline instance
let embeddingPipeline = null;
const getEmbeddingPipeline = async () => {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embeddingPipeline;
};

/**
 * Finds nearby complaints of the same category within a given distance.
 * 
 * @param {number} longitude - The longitude coordinate.
 * @param {number} latitude - The latitude coordinate.
 * @param {string} category - The category of the complaint.
 * @param {number} maxDistance - Maximum distance in meters (default 50).
 * @returns {Promise<Array>} List of candidate complaints.
 */
const findNearbyCandidates = async (longitude, latitude, category, maxDistance = 50) => {
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  return Complaint.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        distanceField: 'distance',
        maxDistance: maxDistance,
        spherical: true,
        query: { category: category }
      }
    },
    {
      $match: {
        createdAt: { $gte: sixtyDaysAgo },
        status: { $nin: ['RESOLVED', 'CLOSED'] }
      }
    }
  ]);
};

const generateTextEmbedding = async (text) => {
  if (!text) return [];
  const extractor = await getEmbeddingPipeline();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
};

const calculateGeoScore = (distanceInMeters) => {
  return Math.min(Math.exp(-distanceInMeters / 15), 1.0);
};

const calculateTimeScore = (complaintDate) => {
  if (!complaintDate) return 0;
  const currentDate = new Date();
  const targetDate = new Date(complaintDate);
  const diffTime = Math.abs(currentDate - targetDate);
  const daysDifference = diffTime / (1000 * 60 * 60 * 24);
  return Math.min(Math.exp(-daysDifference / 30), 1.0);
};

const calculateCosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

const enrichComplaintWithEmbedding = async (complaint) => {
  if (complaint.description) {
    const embedding = await generateTextEmbedding(complaint.description);
    complaint.textEmbedding = embedding;
    await complaint.save();
  }
  return complaint;
};

const processForClustering = async (newComplaint) => {
  const candidates = await findNearbyCandidates(
    newComplaint.location.coordinates[0],
    newComplaint.location.coordinates[1],
    newComplaint.category
  );

  if (!candidates || candidates.length === 0) {
    return { action: 'NEW_CLUSTER', score: 0 };
  }

  const newEmbedding = await generateTextEmbedding(newComplaint.description);

  let bestCandidate = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    const geoScore = calculateGeoScore(candidate.distance);
    const timeScore = calculateTimeScore(candidate.createdAt);
    
    let textScore = 0;
    if (candidate.textEmbedding && candidate.textEmbedding.length > 0) {
      textScore = calculateCosineSimilarity(newEmbedding, candidate.textEmbedding);
    }

    const imageScore = 0.5; // default placeholder

    const totalScore = (0.55 * geoScore) + (0.20 * textScore) + (0.10 * imageScore) + (0.15 * timeScore);

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestCandidate = candidate;
    }
  }

  if (bestScore >= 0.80) {
    return { action: 'AUTO_LINK', candidateId: bestCandidate._id, clusterId: bestCandidate.clusterId, score: bestScore };
  } else if (bestScore >= 0.50) {
    return { action: 'OFFICER_REVIEW', candidateId: bestCandidate._id, clusterId: bestCandidate.clusterId, score: bestScore };
  } else {
    return { action: 'NEW_CLUSTER', score: bestScore };
  }
};

module.exports = {
  findNearbyCandidates,
  generateTextEmbedding,
  calculateGeoScore,
  calculateTimeScore,
  calculateCosineSimilarity,
  processForClustering,
  enrichComplaintWithEmbedding
};
