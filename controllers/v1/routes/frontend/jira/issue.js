'use strict';

const router = require('express').Router();
const { captureErrorAndRespond } = require('../../../../../middleware/errors');
const { createJiraIssue } = require('../../../../../lib/jira/issue');
const Task = require('../../../../../models/task');
const Project = require('../../../../../models/project');
module.exports = () => {
    router.post('/createIssueFromSuggestedTask/:taskId', async (req, res) => {
        try {
            const { projectId, summary, description, issueType } = req.body;
            const { taskId } = req.params;
            
            console.log(projectId);
            const project = await Project.findById(projectId);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: 'Project not found'
                });
            }
           
            if(!project.jiraId) {
                return res.status(404).json({
                    success: false,
                    message: 'JIRA Project Key not found'
                });
            }
            
            // Create JIRA issue
            const issue = await createJiraIssue({
                projectKey: project.jiraId,
                summary,
                description,
                issueType
            });

            // Update task status to accepted
            await Task.findByIdAndUpdate(taskId, {
                status: 'accepted'
            });

            return res.json({
                success: true,
                issue
            });
        } catch (err) {
            return captureErrorAndRespond(err, res);
        }
    });

    return router;
};