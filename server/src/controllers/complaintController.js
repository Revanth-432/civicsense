const { Complaint, statusEnum } = require('../models/Complaint');

const validTransitions = {
  'SUBMITTED': ['VERIFIED', 'ASSIGNED', 'REJECTED'],
  'VERIFIED': ['ASSIGNED'],
  'ASSIGNED': ['IN_PROGRESS'],
  'IN_PROGRESS': ['RESOLVED'],
  'RESOLVED': ['CLOSED'],
  'CLOSED': [],
  'REJECTED': []
};

// Simple in-memory cache for reverse geocoding
const addressCache = new Map();

const getAddressFromCoordinates = async (lat, lng) => {
  const cacheKey = `${lat},${lng}`;
  if (addressCache.has(cacheKey)) {
    return addressCache.get(cacheKey);
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CivicSenseApp/1.0'
      }
    });
    const data = await response.json();
    const address = data.display_name || 'Address not found';
    addressCache.set(cacheKey, address);
    return address;
  } catch (error) {
    console.error("Geocoding error:", error);
    return "Address not available";
  }
};

const createComplaint = async (req, res) => {
  try {
    const { category, description, priority = 'LOW', latitude, longitude } = req.body;
    
    // Validate GPS coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ status: 'error', message: 'Invalid or missing GPS coordinates' });
    }

    let imageUrl = '';
    if (req.file) {
      imageUrl = req.file.path; // Cloudinary URL
    }

    // Log EXIF data if available and different
    if (req.exifLocation) {
      console.log(`EXIF GPS found: Lat ${req.exifLocation.latitude}, Lng ${req.exifLocation.longitude}. Using user-provided GPS: Lat ${lat}, Lng ${lng}`);
    }

    // Get address via reverse geocoding
    const address = await getAddressFromCoordinates(lat, lng);

    const complaint = await Complaint.create({
      citizenId: req.user._id,
      category,
      description,
      priority,
      location: {
        type: 'Point',
        coordinates: [lng, lat] // MongoDB expects [longitude, latitude]
      },
      address,
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

    // Admin filters
    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.priority) {
      filter.priority = req.query.priority;
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
    const { status, priority, note } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    let statusChanged = false;

    // Check status transition if status is being updated to something new
    if (status && status !== complaint.status) {
      if (!statusEnum.includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }

      const currentStatus = complaint.status;
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
      statusChanged = true;
    }

    // Update priority if provided
    if (priority && ['LOW', 'MEDIUM', 'HIGH'].includes(priority) && priority !== complaint.priority) {
      complaint.priority = priority;
      
      // If we are updating priority but NOT status, we might still want to log a note 
      // but statusHistory schema requires a newStatus enum. We will just save the document.
    }

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
