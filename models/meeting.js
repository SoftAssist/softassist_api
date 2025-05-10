const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
    projectId: { type: String, required: true },
    meetingName: { type: String, required: true },
    date: { type: Date, required: true },
    audioFile: { 
        data: Buffer,
        contentType: String
    },
    audioFileId: { type: mongoose.Schema.Types.ObjectId },
    transcript: { type: String, required: false },
    summary: { type: String, required: false }
});

// Add compound index to ensure meetingName is unique within a project
meetingSchema.index({ projectId: 1, meetingName: 1 }, { unique: true });

module.exports = mongoose.model('Meeting', meetingSchema); 