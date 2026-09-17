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
  statusHistory: [statusHistorySchema]
}, { timestamps: true });

const Complaint = mongoose.model('Complaint', complaintSchema);
module.exports = { Complaint, statusEnum };
