'use strict';

const mongoose = require('mongoose');

const githubSchema = new mongoose.Schema({
    owner: {
        type: String,
        required: true
    },
    repo: {
        type: String,
        required: true
    },
    pullNumber: {
        type: Number,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    state: {
        type: String,
        enum: ['open', 'closed', 'merged'],
        required: true
    },
    data: {
        type: Object
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for unique PRs
githubSchema.index({ owner: 1, repo: 1, pullNumber: 1 }, { unique: true });

module.exports = mongoose.model('Github', githubSchema);