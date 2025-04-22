'use strict';

const express = require('express');
const router = express.Router();
const { captureErrorAndRespond } = require('../../../../../middleware/errors');
const Project = require('../../../../../models/project');



module.exports = (router) => {
// Create a new project
router.post('/:projectName/create', async (req, res) => {
    try {
        
        const { projectName } = req.params;
        
        if (!projectName) {
            return res.status(400).json({
                message: 'Missing required parameter: projectName is required'
            });
        }

        let project;
        
      
            const projects = await Project.find({ 
                
            })
            
        for (const project of projects) {
            if (project.projectName === projectName) {
                return res.status(400).json({
                    message: 'Project already exists'
                });
            }
        }
            
            project = new Project({
                projectName,
                createdDate: new Date(),
                
            });
        
        

        await project.save();
        return res.status(201).json({
            message: 'Project created successfully',
            projectId: project._id
        });
    } catch (err) {
        

        return captureErrorAndRespond(err, res);
    }
});

// Get all projects
router.get('/', async (req, res) => {
    try {
        const projects = await Project.find({});
        return res.json(projects);
    } catch (err) {
        return captureErrorAndRespond(err, res);
    }
});

// Get a single project
router.get('/:projectId', async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.projectId 
        });
        
        if (!project) {
            return res.status(404).json({
                message: 'Project not found'
            });
        }
        
        return res.json(project);
    } catch (err) {
        return captureErrorAndRespond(err, res);
    }
});

// associate a jira project with a project
router.put('/:projectId/associated-jira-project/:jiraId', async (req, res) => {
    try {
        const project = await Project.findOne({ 
            _id: req.params.projectId 
        });

        if (!project) {
            return res.status(404).json({
                message: 'Project not found'
            });
        }

        if (project.jiraId === req.params.jiraId) {
            return res.json(project);
        } else {
           project.jiraId = req.params.jiraId;
           await project.save();
           return res.json(project);
        }
    } catch (err) {
        return captureErrorAndRespond(err, res);
    }
});


};
