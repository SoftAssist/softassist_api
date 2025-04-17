'use strict';

const express = require('express');
const router = express.Router();
const projectRoutes = require('./projects');

projectRoutes(router);

// Export an object with a projects property that contains the configured router
module.exports = {
    projects: router
};