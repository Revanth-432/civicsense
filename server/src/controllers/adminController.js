const User = require('../models/User');
const IssueCluster = require('../models/IssueCluster');
const { Complaint } = require('../models/Complaint');
const { createAndEmitNotification } = require('../services/notificationService');

const assignClusterManually = async (req, res) => {
  try {
    const { id: clusterId } = req.params;
    const { officerId } = req.body;

    const cluster = await IssueCluster.findById(clusterId);
    if (!cluster) {
      return res.status(404).json({ message: 'Cluster not found' });
    }

    const newOfficer = await User.findById(officerId);
    if (!newOfficer || newOfficer.role !== 'officer') {
      return res.status(400).json({ message: 'Invalid officer ID' });
    }

    if (cluster.assignedOfficer) {
      // Decrement currentActiveCases for the previously assigned officer
      if (cluster.assignedOfficer.toString() !== officerId.toString()) {
        const oldOfficer = await User.findById(cluster.assignedOfficer);
        if (oldOfficer) {
          oldOfficer.currentActiveCases = Math.max(0, oldOfficer.currentActiveCases - 1);
          await oldOfficer.save();
        }
      } else {
        return res.status(400).json({ message: 'Officer is already assigned to this cluster' });
      }
    }

    // Update cluster
    cluster.assignedOfficer = newOfficer._id;
    await cluster.save();

    // Update nested complaints
    await Complaint.updateMany(
      { clusterId: cluster._id },
      { $set: { assignedOfficer: newOfficer._id } }
    );

    // Increment currentActiveCases for the newly assigned officer
    newOfficer.currentActiveCases += 1;
    await newOfficer.save();

    // Emit notification
    await createAndEmitNotification({
      recipientId: newOfficer._id,
      type: 'ASSIGNED',
      message: `You have been manually assigned to an issue cluster: ${cluster.title}`,
      relatedComplaintId: cluster.complaints && cluster.complaints.length > 0 ? cluster.complaints[0] : null
    });

    res.status(200).json({
      status: 'success',
      data: {
        cluster
      }
    });

  } catch (error) {
    console.error('Error in assignClusterManually:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getPriorityQueue = async (req, res) => {
  try {
    const queue = await IssueCluster.aggregate([
      {
        $match: {
          status: { $nin: ['RESOLVED', 'CLOSED'] }
        }
      },
      {
        $addFields: {
          severityWeight: {
            $switch: {
              branches: [
                { case: { $eq: ['$severity', 'CRITICAL'] }, then: 4 },
                { case: { $eq: ['$severity', 'HIGH'] }, then: 3 },
                { case: { $eq: ['$severity', 'MEDIUM'] }, then: 2 },
                { case: { $eq: ['$severity', 'LOW'] }, then: 1 }
              ],
              default: 0
            }
          }
        }
      },
      {
        $sort: {
          severityWeight: -1,
          dueAt: 1,
          reportCount: -1
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedOfficer',
          foreignField: '_id',
          as: 'assignedOfficer'
        }
      },
      {
        $unwind: {
          path: '$assignedOfficer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          'assignedOfficer.password': 0
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        queue
      }
    });
  } catch (error) {
    console.error('Error in getPriorityQueue:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  assignClusterManually,
  getPriorityQueue
};
