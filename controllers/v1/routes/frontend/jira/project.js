'use strict';

const router = require('express').Router();
const { captureErrorAndRespond } = require('../../../../../middleware/errors');
const { getAllProjects, getProjectIssues } = require('../../../../../lib/jira/project');

module.exports = () => {
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

    router.get('/:projectId/issues', async (req, res) => {
        try {
            const { projectId } = req.params;
            const issues = await getProjectIssues(projectId);

            return res.json({
                success: true,
                issues
            });
        } catch (err) {
            return captureErrorAndRespond(err, res);
        }
    });

    return router;
};