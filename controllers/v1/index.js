'use strict';

const express = require('express');
const router = express.Router();

const routes = require('./routes');

router.use('/frontend/user', routes.frontend.user);
router.use('/frontend/jira', routes.frontend.jira);

module.exports = router;