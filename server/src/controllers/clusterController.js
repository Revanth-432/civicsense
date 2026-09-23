const IssueCluster = require('../models/IssueCluster');
const { Complaint } = require('../models/Complaint');
const { getIo } = require('../utils/socket');

const resolvePotentialDuplicate = async (req, res) => {
  try {
    const { complaintId, action, reason } = req.body;
    
    if (!['CONFIRM', 'REJECT'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Must be CONFIRM or REJECT.' });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    
    const cluster = await IssueCluster.findById(complaint.clusterId);
    if (!cluster) return res.status(404).json({ message: 'Cluster not found' });

    if (action === 'CONFIRM') {
      complaint.duplicateStatus = 'CONFIRMED_DUPLICATE';
      await complaint.save();
      
      cluster.auditHistory.push({
        action: 'CONFIRM_DUPLICATE',
        performedBy: req.user._id,
        reason: reason || 'Confirmed as duplicate by officer',
        timestamp: new Date()
      });
      await cluster.save();

      try {
        const io = getIo();
        io.to(`complaint:${complaint._id}`).emit('STATUS_UPDATED', { complaint });
      } catch (err) {
        console.error('Socket emission failed:', err);
      }

      return res.status(200).json({ status: 'success', data: { complaint } });
    } else { // REJECT
      // Remove complaint from cluster
      cluster.complaints = cluster.complaints.filter(id => id.toString() !== complaint._id.toString());
      cluster.reportCount = Math.max(0, cluster.reportCount - 1);
      
      cluster.auditHistory.push({
        action: 'REJECT_DUPLICATE',
        performedBy: req.user._id,
        reason: reason || 'Rejected as duplicate by officer',
        timestamp: new Date()
      });
      await cluster.save();

      // Create new cluster for this complaint
      const newCluster = new IssueCluster({
        title: `${complaint.category.replace(/_/g, ' ')} Issue`,
        description: complaint.description,
        category: complaint.category,
        location: complaint.location,
        severity: complaint.priority,
        complaints: [complaint._id],
        reportCount: 1,
        auditHistory: [{
          action: 'CREATED_FROM_REJECTION',
          performedBy: req.user._id,
          reason: reason || 'Split from previous cluster after duplicate rejection',
          previousClusterId: cluster._id,
          timestamp: new Date()
        }]
      });
      await newCluster.save();

      // Update complaint
      complaint.clusterId = newCluster._id;
      complaint.duplicateStatus = 'UNIQUE';
      await complaint.save();

      try {
        const io = getIo();
        io.to(`complaint:${complaint._id}`).emit('STATUS_UPDATED', { complaint, newCluster });
      } catch (err) {
        console.error('Socket emission failed:', err);
      }

      return res.status(200).json({ status: 'success', data: { complaint, newCluster } });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const mergeClusters = async (req, res) => {
  try {
    const { primaryClusterId, secondaryClusterId, reason } = req.body;

    const primaryCluster = await IssueCluster.findById(primaryClusterId);
    const secondaryCluster = await IssueCluster.findById(secondaryClusterId);

    if (!primaryCluster || !secondaryCluster) {
      return res.status(404).json({ message: 'One or both clusters not found' });
    }

    const complaintsToMove = secondaryCluster.complaints;
    
    primaryCluster.complaints = [...new Set([...primaryCluster.complaints, ...complaintsToMove])];
    primaryCluster.reportCount += secondaryCluster.reportCount;
    
    primaryCluster.auditHistory.push({
      action: 'MERGE_CLUSTERS',
      performedBy: req.user._id,
      reason: reason || 'Officer manually merged clusters',
      previousClusterId: secondaryCluster._id,
      timestamp: new Date()
    });
    
    await primaryCluster.save();

    await Complaint.updateMany(
      { _id: { $in: complaintsToMove } },
      { 
        $set: { 
          clusterId: primaryCluster._id,
          duplicateStatus: 'CONFIRMED_DUPLICATE'
        } 
      }
    );

    await IssueCluster.findByIdAndDelete(secondaryClusterId);

    res.status(200).json({ status: 'success', data: { primaryCluster } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const splitComplaint = async (req, res) => {
  try {
    const { complaintId, reason } = req.body;

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    const cluster = await IssueCluster.findById(complaint.clusterId);
    if (!cluster) return res.status(404).json({ message: 'Cluster not found' });

    cluster.complaints = cluster.complaints.filter(id => id.toString() !== complaint._id.toString());
    cluster.reportCount = Math.max(0, cluster.reportCount - 1);
    
    cluster.auditHistory.push({
      action: 'MANUAL_SPLIT',
      performedBy: req.user._id,
      reason: reason || 'Officer manually split complaint from cluster',
      timestamp: new Date()
    });
    await cluster.save();

    const newCluster = new IssueCluster({
      title: `${complaint.category.replace(/_/g, ' ')} Issue`,
      description: complaint.description,
      category: complaint.category,
      location: complaint.location,
      severity: complaint.priority,
      complaints: [complaint._id],
      reportCount: 1,
      auditHistory: [{
        action: 'CREATED_FROM_SPLIT',
        performedBy: req.user._id,
        reason: reason || 'Created via manual split',
        previousClusterId: cluster._id,
        timestamp: new Date()
      }]
    });
    await newCluster.save();

    complaint.clusterId = newCluster._id;
    complaint.duplicateStatus = 'UNIQUE';
    await complaint.save();

    res.status(200).json({ status: 'success', data: { complaint, newCluster } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  resolvePotentialDuplicate,
  mergeClusters,
  splitComplaint
};
