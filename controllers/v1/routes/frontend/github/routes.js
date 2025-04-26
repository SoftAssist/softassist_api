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
        const client = await getGithubClient();
        
        // Fetch from GitHub API
        console.log(`Fetching repos for owner: ${owner}`);
        const response = await client.get(`/users/${owner}/repos`);
        
        // Store all repos in database
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

        // Get updated data from database
        const repos = await GithubRepo.find({ owner });

        return res.json({
            success: true,
            source: 'github_api_and_database',
            repositories: repos
        });
    } catch (error) {
        console.error('Error fetching repos:', error.message);
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

router.get('/:org/actions', async (req, res) => {
    try {
        const { org } = req.params;
        const client = await getGithubClient();

        // 1. First get all repos for the organization
        const reposResponse = await client.get(`/orgs/${org}/repos`);
        const repos = reposResponse.data;

        // 2. Fetch workflows and runs for each repo in parallel
        const actionsPromises = repos.map(async (repo) => {
            try {
                // Get workflows for this repo
                const workflowsResponse = await client.get(
                    `/repos/${org}/${repo.name}/actions/workflows`
                );

                // Get recent runs for each workflow
                const runsPromises = workflowsResponse.data.workflows.map(async (workflow) => {
                    const runsResponse = await client.get(
                        `/repos/${org}/${repo.name}/actions/workflows/${workflow.id}/runs`
                    );
                    return {
                        workflow_name: workflow.name,
                        workflow_state: workflow.state,
                        recent_runs: runsResponse.data.workflow_runs.slice(0, 5) // Last 5 runs
                    };
                });

                const workflowRuns = await Promise.all(runsPromises);

                return {
                    repository: repo.name,
                    workflows: workflowRuns
                };
            } catch (error) {
                console.error(`Error fetching actions for ${repo.name}:`, error.message);
                return {
                    repository: repo.name,
                    error: error.message
                };
            }
        });

        const results = await Promise.all(actionsPromises);

        // Filter out repos with no workflows
        const reposWithActions = results.filter(result => 
            result.workflows && result.workflows.length > 0
        );

        return res.json({
            success: true,
            organization: org,
            repositories: reposWithActions
        });

    } catch (error) {
        console.error('Error fetching organization actions:', error);
        return captureErrorAndRespond(error, res);
    }
});

router.get('/:org/all-pulls', async (req, res) => {
    try {
        const { org } = req.params;
        const { state = 'open' } = req.query;
        const client = await getGithubClient();

        // Debug logs
        console.log(`Fetching repos for org: ${org}`);
        
        const reposResponse = await client.get(`/orgs/${org}/repos`);
        const repos = reposResponse.data;
        
        console.log(`Found ${repos.length} repositories`);

        const pullRequestsPromises = repos.map(async (repo) => {
            try {
                const prs = await getPullRequests(org, repo.name, state);
                return {
                    repository: repo.name,
                    pullRequests: prs
                };
            } catch (error) {
                console.error(`Error fetching PRs for ${repo.name}:`, error.message);
                return {
                    repository: repo.name,
                    error: error.message
                };
            }
        });

        const results = await Promise.all(pullRequestsPromises);

        return res.json({
            success: true,
            organization: org,
            repositories: results.filter(result => result.pullRequests?.length > 0)
        });

    } catch (error) {
        console.error('Organization PR fetch error:', error);
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