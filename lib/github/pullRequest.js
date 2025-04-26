// 'use strict';

// const { getGithubClient } = require('./client');
// const Github = require('../../models/github');

// async function getPullRequests(owner, repo, state = 'open') {
//     try {
//         const client = await getGithubClient();
//         const response = await client.get(`/repos/${owner}/${repo}/pulls`, {
//             params: { state }
//         });
        
//         // Store in database
//         await Github.create({
//             owner,
//             repo,
//             data: response.data
//         });

//         return response.data;
//     } catch (error) {
//         throw error;
//     }
// }

// module.exports = { getPullRequests };

'use strict';

const { getGithubClient } = require('./client');
const Github = require('../../models/github');

async function getPullRequests(owner, repo, state = 'open') {
    // eslint-disable-next-line no-useless-catch
    try {
        const client = await getGithubClient();
        const response = await client.get(`/repos/${owner}/${repo}/pulls`, {
            params: { state }
        });

        // Store in database
        await Promise.all(response.data.map(async pr => {
            await Github.findOneAndUpdate(
                { owner, repo, pullNumber: pr.number },
                {
                    title: pr.title,
                    state: pr.state,
                    data: pr
                },
                { upsert: true }
            );
        }));

        return response.data;
    } catch (error) {
        throw error;
    }
}

async function getPullRequestDetails(owner, repo, pullNumber) {
    // eslint-disable-next-line no-useless-catch
    try {
        const client = await getGithubClient();
        const response = await client.get(`/repos/${owner}/${repo}/pulls/${pullNumber}`);
        return response.data;
    } catch (error) {
        throw error;
    }
}

module.exports = { getPullRequests, getPullRequestDetails };