const { Complaint, statusEnum } = require('../models/Complaint');
const IssueCluster = require('../models/IssueCluster');
const { processForClustering, enrichComplaintWithEmbedding } = require('../services/deduplicationService');
const { calculateDueDate } = require('../config/slaConfig');
const axios = require('axios');
const FormData = require('form-data');

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

// Modular Extensible Severity Engine
const calculateSeverity = (aiTags, detectionCount = 1) => {
  if (!aiTags || !Array.isArray(aiTags) || aiTags.length === 0) return 'LOW';
  
  let score = 0;
  
  // Base points for presence of specific tags
  aiTags.forEach(tag => {
    const t = tag.toUpperCase();
    if (t === 'POTHOLE') score += 3;
    else if (t === 'ROAD_DAMAGE' || t === 'ROAD_CRACK') score += 2;
    else score += 1;
  });

  // Multiply by detectionCount
  // Future phases can expand this function with boxArea, roadImportance, clusterReportCount, etc.
  score = score * detectionCount;
  
  if (score >= 10) return 'CRITICAL';
  if (score >= 6) return 'HIGH';
  if (score >= 3) return 'MEDIUM';
  return 'LOW';
};

const createComplaint = async (req, res) => {
  try {
    const { category, description, latitude, longitude } = req.body;
    
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

    // Fetch trusted AI tags from the server-side ML microservice
    let aiTags = [];
    let aiVerification = 'PENDING';

    if (imageUrl && req.file && req.file.buffer) {
      try {
        const form = new FormData();
        form.append('file', req.file.buffer, { filename: req.file.originalname || 'image.jpg' });

        const mlResponse = await axios.post('http://127.0.0.1:8000/predict', form, {
          headers: {
            ...form.getHeaders(),
            'x-ml-service-key': 'civicsense-internal-secret'
          },
          timeout: 5000
        });

        if (mlResponse.status === 200) {
          const mlData = mlResponse.data;
          // Extract the verified detections from the FastAPI response
          let detections = mlData.detections || [];
          if (!Array.isArray(detections)) detections = [];

          // Ensure tags are strings for the existing calculateSeverity function
          aiTags = detections.map(d => typeof d === 'string' ? d : (d.class || d.name || d.tag || ''));

          if (aiTags.length > 0) {
            const normalizedCategory = category.toUpperCase().replace(/\s+/g, '_');
            const hasMatch = aiTags.some(tag => tag.toUpperCase() === normalizedCategory);
            aiVerification = hasMatch ? 'VERIFIED' : 'NEEDS_REVIEW';
          } else {
            aiVerification = 'NEEDS_REVIEW';
          }
        } else {
          console.error(`ML service returned error status: ${mlResponse.status}`);
          // Fails to fetch detections, stays PENDING
        }
      } catch (error) {
        console.error("Failed to verify image with ML service:", error.message);
        // Timeout or network error, stays PENDING
      }
    } else {
      // No image provided, cannot verify
      aiVerification = 'NEEDS_REVIEW';
    }

    // Calculate priority using the extensible engine
    // Currently using aiTags.length as a proxy for detectionCount until we pass raw detection arrays
    const detectionCount = Math.max(1, aiTags.length);
    const priority = calculateSeverity(aiTags, detectionCount);

    // Log EXIF data if available and different
    if (req.exifLocation) {
      console.log(`EXIF GPS found: Lat ${req.exifLocation.latitude}, Lng ${req.exifLocation.longitude}. Using user-provided GPS: Lat ${lat}, Lng ${lng}`);
    }

    // Get address via reverse geocoding
    const address = await getAddressFromCoordinates(lat, lng);

    let complaint = new Complaint({
      citizenId: req.user._id,
      category,
      description,
      priority,
      aiTags,
      aiVerification,
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
      }],
      dueAt: calculateDueDate(category, new Date())
    });

    // 1. Generate Embedding
    complaint = await enrichComplaintWithEmbedding(complaint);

    // 2. Process for Clustering
    const clusterDecision = await processForClustering(complaint);

    // 3. Handle the Three-Way Decision
    if (clusterDecision.action === 'NEW_CLUSTER') {
      const newCluster = new IssueCluster({
        title: `${category.replace(/_/g, ' ')} Issue`,
        description: complaint.description,
        category: complaint.category,
        location: complaint.location,
        severity: complaint.priority,
        complaints: [complaint._id],
        reportCount: 1,
        auditHistory: [{
          action: 'CREATED',
          performedBy: req.user._id,
          reason: 'Initial creation from unique complaint'
        }]
      });
      await newCluster.save();

      complaint.clusterId = newCluster._id;
      complaint.duplicateStatus = 'UNIQUE';
      complaint.duplicateScore = clusterDecision.score || 0;
      await complaint.save();

    } else if (clusterDecision.action === 'AUTO_LINK' || clusterDecision.action === 'OFFICER_REVIEW') {
      const existingCluster = await IssueCluster.findById(clusterDecision.clusterId);
      if (existingCluster) {
        existingCluster.complaints.push(complaint._id);
        existingCluster.reportCount += 1;
        await existingCluster.save();

        complaint.clusterId = existingCluster._id;
        complaint.duplicateStatus = clusterDecision.action === 'AUTO_LINK' ? 'CONFIRMED_DUPLICATE' : 'POTENTIAL_DUPLICATE';
        complaint.duplicateScore = clusterDecision.score;
        await complaint.save();
      } else {
        // Fallback if cluster not found
        complaint.duplicateStatus = 'UNIQUE';
        await complaint.save();
      }
    }

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
    if (priority && ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority) && priority !== complaint.priority) {
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
