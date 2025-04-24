'use strict';

const express = require('express');
const router = express.Router();

require('./task')(router);  

module.exports = router;
