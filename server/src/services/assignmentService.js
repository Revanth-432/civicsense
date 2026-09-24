const User = require('../models/User');
const IssueCluster = require('../models/IssueCluster');
const { Complaint } = require('../models/Complaint');
const { createAndEmitNotification } = require('./notificationService');

const autoAssignOfficer = async (cluster) => {
  try {
    const officers = await User.find({
      role: 'officer',
      isAvailable: true,
      $expr: { $lt: ['$currentActiveCases', '$maxActiveCases'] }
    }).sort({ currentActiveCases: 1 });

    if (!officers || officers.length === 0) {
      console.log('No available officers to assign cluster:', cluster._id);
      return null;
    }

    const selectedOfficer = officers[0];

    cluster.assignedOfficer = selectedOfficer._id;
    await cluster.save();

    await Complaint.updateMany(
      { clusterId: cluster._id },
      { $set: { assignedOfficer: selectedOfficer._id } }
    );

    selectedOfficer.currentActiveCases += 1;
    await selectedOfficer.save();

    await createAndEmitNotification({
      recipientId: selectedOfficer._id,
      type: 'ASSIGNED',
      message: `You have been assigned to a new issue cluster: ${cluster.title}`,
      relatedComplaintId: cluster.complaints && cluster.complaints.length > 0 ? cluster.complaints[0] : null
    });

    return selectedOfficer;
  } catch (error) {
    console.error('Error in autoAssignOfficer:', error);
    throw error;
  }
};

module.exports = {
  autoAssignOfficer
};
