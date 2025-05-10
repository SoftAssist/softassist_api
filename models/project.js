const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid'); // You'll need to install this package: npm install uuid

const projectSchema = new mongoose.Schema({
    projectId: { 
        type: String, 
        required: true,
        default: () => uuidv4(), // Generates a UUID v4
        unique: true // Ensures uniqueness at the database level
    },
    jiraId: { type: String, required: false },
    projectName: { type: String, required: true },
    createdDate: { type: Date, required: true },
});


projectSchema.index({ projectId: 1 }, { unique: true });

module.exports = mongoose.model('Project', projectSchema); 