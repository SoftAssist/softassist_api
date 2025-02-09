'use strict';

const express = require('express');
const router = express.Router();

const routes = require('./routes');

router.use('/frontend/user', routes.frontend.user);

module.exports = router;