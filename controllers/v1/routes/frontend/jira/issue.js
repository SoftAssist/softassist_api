'use strict';

const router = require('express').Router();
const { captureErrorAndRespond } = require('../../../../../middleware/errors');
const { createJiraIssue } = require('../../../../../lib/jira/issue');

module.exports = (router) => {
    router.post('/createIssue', async (req, res) => {
        try {
            const { projectKey, summary, description, issueType } = req.body;
            
            const issue = await createJiraIssue({
                projectKey,
                summary,
                description,
                issueType
            });

            return res.json({
                success: true,
                issue
            });
        } catch (err) {
            return captureErrorAndRespond(err, res);
        }
    });
};