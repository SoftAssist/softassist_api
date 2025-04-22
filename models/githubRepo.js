'use strict';

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const githubRepoSchema = new mongoose.Schema({
    projectId: { 
        type: String,
        required: true,
        default: () => uuidv4()  // Auto-generate project ID
    },
    owner: { 
        type: String, 
        required: true 
    },
    repoName: { 
        type: String, 
        required: true 
    },
    repoUrl: { 
        type: String, 
        required: true 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Keep existing indexes
githubRepoSchema.index({ owner: 1, repoName: 1 }, { unique: true });
githubRepoSchema.index({ projectId: 1 });

module.exports = mongoose.model('GithubRepo', githubRepoSchema);