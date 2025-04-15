'use strict';

const express = require('express');
const router = express.Router();

const routes = require('./routes');

// Validate routes and nested properties exist before using them
if (!routes?.frontend?.user) {
    throw new Error('Frontend user routes are not properly configured');
}

if (!routes?.frontend?.jira) {
    throw new Error('Frontend jira routes are not properly configured');
}

if (!routes?.frontend?.project?.meetings) {
    throw new Error('Frontend project meeting routes are not properly configured');
}

// Only add routes that exist
router.use('/frontend/user', routes.frontend.user);
router.use('/frontend/jira', routes.frontend.jira);
router.use('/frontend/project/meetings', routes.frontend.project.meetings);

module.exports = router;