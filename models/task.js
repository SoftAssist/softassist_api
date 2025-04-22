const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  meetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting',
    required: true,
  },
  summary: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['proposed', 'accepted', 'rejected'],
    default: 'proposed',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});
taskSchema.index({ projectId: 1, meetingId: 1 });
module.exports = mongoose.model('Task', taskSchema);
