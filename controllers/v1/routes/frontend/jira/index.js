'use strict';

const express = require('express');
const router = express.Router();

router.use('/issue', require('./issue')());
router.use('/project', require('./project')());

module.exports = router;