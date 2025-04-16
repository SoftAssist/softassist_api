'use strict';

const router = require('express').Router();
const { captureErrorAndRespond } = require('../../../../../middleware/errors');
const { getAllProjects } = require('../../../../../lib/jira/project');

module.exports = (router) => {
    router.get('/', async (req, res) => {
        try {
            const projects = await getAllProjects();

            return res.json({
                success: true,
                projects
            });
        } catch (err) {
            return captureErrorAndRespond(err, res);
        }
    });
};