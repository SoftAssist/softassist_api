'use strict';

const express = require('express');
const router = express.Router();
const { captureErrorAndRespond } = require('../../../../../middleware/errors');
const { getPullRequests } = require('../../../../../lib/github/pullRequest');
const { getGithubClient } = require('../../../../../lib/github/client');
const GithubRepo = require('../../../../../models/githubRepo');
const GithubPR = require('../../../../../models/github');
// ...existing test route code...

// Add new repository management routes
router.post('/project/repo', async (req, res) => {
    try {
        const { owner, repoName } = req.body;

        if (!owner || !repoName) {
            return res.status(400).json({
                success: false,
                message: 'Owner and repository name are required'
            });
        }

        const repoUrl = `https://github.com/${owner}/${repoName}`;
        const repo = await GithubRepo.create({
            owner,
            repoName,
            repoUrl
            // projectId will be auto-generated
        });

        return res.json({ success: true, repo });
    } catch (error) {
        return captureErrorAndRespond(error, res);
    }
});

router.get('/:owner/repos', async (req, res) => {
    try {
        const { owner } = req.params;
        
        // First try to get from database
        const repos = await GithubRepo.find({ owner });
        
        // If no repos found in DB, fetch from GitHub API
        if (repos.length === 0) {
            const client = await getGithubClient();
            const response = await client.get(`/users/${owner}/repos`);
            
            // Store repos in database
            await Promise.all(response.data.map(async repo => {
                await GithubRepo.findOneAndUpdate(
                    { owner: repo.owner.login, repoName: repo.name },
                    {
                        owner: repo.owner.login,
                        repoName: repo.name,
                        repoUrl: repo.html_url
                    },
                    { upsert: true, new: true }
                );
            }));

            return res.json({
                success: true,
                source: 'github_api',
                repositories: response.data
            });
        }

        return res.json({
            success: true,
            source: 'database',
            repositories: repos
        });
    } catch (error) {
        return captureErrorAndRespond(error, res);
    }
});

router.get('/project/:projectId/repos', async (req, res) => {
    try {
        const { projectId } = req.params;
        const repos = await GithubRepo.find({ projectId });
        return res.json({ success: true, repos });
    } catch (error) {
        return captureErrorAndRespond(error, res);
    }
});

// Add this new test route
router.get('/test', async (req, res) => {
    try {
        const pullRequests = await getPullRequests('microsoft', 'vscode', 'open');
        res.json({ 
            success: true, 
            message: 'GitHub API connection successful',
            count: pullRequests.length,
            data: pullRequests.slice(0, 3)  // Return first 3 PRs only
        });
    } catch (error) {
        console.error('Test route error:', error);
        return captureErrorAndRespond(error, res);
    }
});

router.get('/:org/repos', async (req, res) => {
    try {
        const { org } = req.params;
        const client = await getGithubClient();
        const response = await client.get(`/orgs/${org}/repos`);
        
        // Store repos in database
        await Promise.all(response.data.map(async repo => {
            await GithubRepo.findOneAndUpdate(
                { owner: org, repoName: repo.name },
                { 
                    owner: org,
                    repoName: repo.name,
                    repoUrl: repo.html_url
                },
                { upsert: true, new: true }
            );
        }));

        return res.json({
            success: true,
            repositories: response.data
        });
    } catch (error) {
        console.error('Error fetching org repos:', error.message);
        return captureErrorAndRespond(error, res);
    }
});

router.get('/:owner/:repo/pulls', async (req, res) => {
    try {
        const { owner, repo } = req.params;
        const { state } = req.query;
        
        // Get PRs from GitHub API
        const pullRequests = await getPullRequests(owner, repo, state);
        
        // Store in database
        await Promise.all(pullRequests.map(async pr => {
            await GithubPR.findOneAndUpdate(
                { owner, repo, pullNumber: pr.number },
                {
                    title: pr.title,
                    state: pr.state,
                    data: pr,
                },
                { upsert: true }
            );
        }));

        res.json({ success: true, data: pullRequests });
    } catch (error) {
        return captureErrorAndRespond(error, res);
    }
});

module.exports = router;