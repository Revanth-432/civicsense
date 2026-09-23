const mongoose = require('mongoose');

const auditHistorySchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['CREATED', 'MERGED', 'SPLIT', 'UPDATED']
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  reason: {
    type: String
  },
  previousClusterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IssueCluster'
  }
}, { _id: false });

const issueClusterSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  category: {
    type: String,
    required: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    }
  },
  status: {
    type: String,
    enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    default: 'OPEN',
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true,
  },
  complaints: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint'
  }],
  reportCount: {
    type: Number,
    default: 1,
  },
  assignedOfficer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  auditHistory: [auditHistorySchema]
}, { timestamps: true });

issueClusterSchema.index({ location: "2dsphere" });

const IssueCluster = mongoose.model('IssueCluster', issueClusterSchema);
module.exports = IssueCluster;
