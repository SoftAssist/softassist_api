const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
    projectId: { type: String, required: true },
    meetingName: { type: String, required: true },
    date: { type: Date, required: true },
    audioFile: { 
        data: Buffer,
        contentType: String
    }
});

module.exports = mongoose.model('Meeting', meetingSchema); 