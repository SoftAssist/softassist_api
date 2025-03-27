'use strict';

const express = require('express');
const router = express.Router();

// Import meetings routes
const meetings = require('./meetings');

// Use the meetings routes
router.use('/meetings', meetings);

// Export the routes in the expected structure
module.exports = {
    meetings: meetings
};