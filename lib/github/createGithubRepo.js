const {getGithubClient} = require('./client');
const Github = require('../../models/githubRepo')

async function createGitHubRepo(org, repoName) {
    try {
        const client = await getGithubClient(); // Use token to get axios instance
        
        const url = org
            ? `/orgs/${org}/repos`
            : `/user/repos`; // Org or personal repo
        
        const response = await client.post(url, {
            name: repoName,
            private: false,
            auto_init: false,
        });

        // Save repo to database
        // await Github.findOneAndUpdate(
        //     { owner: org || 'personal', repo: repoName },
        //     {
        //         repoName: repoName,
        //         owner: org || 'personal',
        //         htmlUrl: response.data.html_url,
        //         cloneUrl: response.data.clone_url,
        //         data: response.data,
        //     },
        //     { upsert: true }
        // );

        return response.data;
    } catch (error) {
        throw error;
    }
}


module.exports = { createGitHubRepo };