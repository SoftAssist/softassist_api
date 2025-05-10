'use strict';

const express = require('express');
const router = express.Router();
const meetingsRoutes = require('./meetings');

meetingsRoutes(router);

module.exports = router; 