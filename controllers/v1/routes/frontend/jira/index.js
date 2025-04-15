'use strict';

const express = require('express');
const router = express.Router();

require('./issue')(router);

module.exports = router;