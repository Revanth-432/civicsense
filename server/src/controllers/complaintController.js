const { Complaint, statusEnum } = require('../models/Complaint');

const validTransitions = {
  'SUBMITTED': ['VERIFIED', 'REJECTED'],
  'VERIFIED': ['ASSIGNED'],
  'ASSIGNED': ['IN_PROGRESS'],
  'IN_PROGRESS': ['RESOLVED'],
  'RESOLVED': ['CLOSED'],
  'CLOSED': [],
  'REJECTED': []
};

const createComplaint = async (req, res) => {
  try {
    const { category, description } = req.body;
    let imageUrl = '';
    
    if (req.file) {
      imageUrl = req.file.path; // Cloudinary URL
    }

    const complaint = await Complaint.create({
      citizenId: req.user._id,
      category,
      description,
      imageUrl,
      status: 'SUBMITTED',
      statusHistory: [{
        changedBy: req.user._id,
        oldStatus: null,
        newStatus: 'SUBMITTED',
        note: 'Complaint submitted'
      }]
    });

    res.status(201).json({
      status: 'success',
      data: { complaint }
    });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

const getComplaints = async (req, res) => {
  try {
    let filter = {};
    // If citizen, only see their own complaints
    if (req.user.role === 'citizen') {
      filter.citizenId = req.user._id;
    }

    const complaints = await Complaint.find(filter)
      .populate('citizenId', 'name email')
      .sort('-createdAt');

    res.status(200).json({
      status: 'success',
      results: complaints.length,
      data: { complaints }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const getComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('citizenId', 'name email')
      .populate('statusHistory.changedBy', 'name role');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Citizens can only view their own
    if (req.user.role === 'citizen' && complaint.citizenId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You do not have permission to view this complaint' });
    }

    res.status(200).json({
      status: 'success',
      data: { complaint }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const updateComplaintStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    if (!statusEnum.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const currentStatus = complaint.status;

    // Check valid transitions
    const allowedNextStatuses = validTransitions[currentStatus] || [];
    if (!allowedNextStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status transition from ${currentStatus} to ${status}` 
      });
    }

    complaint.status = status;
    complaint.statusHistory.push({
      changedBy: req.user._id,
      oldStatus: currentStatus,
      newStatus: status,
      note: note || `Status updated to ${status}`
    });

    await complaint.save();

    res.status(200).json({
      status: 'success',
      data: { complaint }
    });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  createComplaint,
  getComplaints,
  getComplaint,
  updateComplaintStatus
};
