const mongoose = require('mongoose');

const statusEnum = [
  'SUBMITTED',
  'VERIFIED',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'REJECTED'
];

const statusHistorySchema = new mongoose.Schema({
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  oldStatus: {
    type: String,
    enum: statusEnum,
  },
  newStatus: {
    type: String,
    enum: statusEnum,
    required: true,
  },
  note: {
    type: String,
  }
}, { timestamps: true });

const complaintSchema = new mongoose.Schema({
  citizenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  category: {
    type: String,
    required: [true, 'Please provide a category'],
    trim: true,
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW',
  },
  aiTags: [{
    type: String
  }],
  aiVerification: {
    type: String,
    enum: ['VERIFIED', 'NEEDS_REVIEW', 'PENDING'],
    default: 'PENDING'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
    }
  },
  address: {
    type: String,
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
  },
  imageUrl: {
    type: String,
  },
  status: {
    type: String,
    enum: statusEnum,
    default: 'SUBMITTED',
  },
  statusHistory: [statusHistorySchema],
  clusterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IssueCluster'
  },
  duplicateStatus: {
    type: String,
    enum: ['UNIQUE', 'POTENTIAL_DUPLICATE', 'CONFIRMED_DUPLICATE'],
    default: 'UNIQUE'
  },
  duplicateScore: {
    type: Number,
    default: 0
  },
  textEmbedding: {
    type: [Number]
  },
  dueAt: {
    type: Date
  },
  slaBreached: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

complaintSchema.index({ location: "2dsphere" });

const Complaint = mongoose.model('Complaint', complaintSchema);
module.exports = { Complaint, statusEnum };
