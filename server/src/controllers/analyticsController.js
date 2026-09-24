const IssueCluster = require('../models/IssueCluster');
const { Complaint } = require('../models/Complaint');

const getOverview = async (req, res) => {
  try {
    const totalClusters = await IssueCluster.countDocuments();
    const totalResolvedClusters = await IssueCluster.countDocuments({ status: 'RESOLVED' });
    const totalSlaBreachedComplaints = await Complaint.countDocuments({ slaBreached: true });

    res.status(200).json({
      status: 'success',
      data: {
        totalClusters,
        totalResolvedClusters,
        totalSlaBreachedComplaints
      }
    });
  } catch (error) {
    console.error('Error in getOverview:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getCategoryBreakdown = async (req, res) => {
  try {
    const breakdown = await IssueCluster.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        breakdown
      }
    });
  } catch (error) {
    console.error('Error in getCategoryBreakdown:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getSlaCompliance = async (req, res) => {
  try {
    const compliance = await Complaint.aggregate([
      {
        $group: {
          _id: '$slaBreached',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        compliance
      }
    });
  } catch (error) {
    console.error('Error in getSlaCompliance:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getModelAgreementRate = async (req, res) => {
  try {
    const acceptedCount = await IssueCluster.countDocuments({
      $or: [
        { auditHistory: { $exists: false } },
        { auditHistory: { $size: 0 } }
      ]
    });

    const correctedCount = await IssueCluster.countDocuments({
      'auditHistory.action': { 
        $in: ['SPLIT', 'REJECT_DUPLICATE', 'MERGE_CLUSTERS', 'MERGED'] 
      }
    });

    const total = acceptedCount + correctedCount;
    const agreementPercentage = total === 0 ? 100 : (acceptedCount / total) * 100;

    res.status(200).json({
      status: 'success',
      data: {
        acceptedCount,
        correctedCount,
        agreementPercentage
      }
    });
  } catch (error) {
    console.error('Error in getModelAgreementRate:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getHeatmapData = async (req, res) => {
  try {
    const heatmapData = await IssueCluster.find({ status: { $ne: 'CLOSED' } })
      .select('location category severity -_id')
      .lean();

    res.status(200).json({
      status: 'success',
      data: {
        heatmapData
      }
    });
  } catch (error) {
    console.error('Error in getHeatmapData:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getOverview,
  getCategoryBreakdown,
  getSlaCompliance,
  getModelAgreementRate,
  getHeatmapData
};
