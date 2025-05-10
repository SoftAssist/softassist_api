// 'use strict';

// const express = require('express');
// const router = express.Router();
// const { captureErrorAndRespond } = require('../../../../../middleware/errors');
// const Github = require('../../../../../models/github');
// const { getPullRequests, getPullRequestDetails } = require('./pullRequest');

// router.get('/:owner/:repo/pulls', async (req, res) => {
//     try {
//         const { owner, repo } = req.params;
//         const { state } = req.query;
//         const pullRequests = await getPullRequests(owner, repo, state);
//         res.json({ success: true, data: pullRequests });
//     } catch (error) {
//         return captureErrorAndRespond(error, res);
//     }
// });

// module.exports = router;

'use strict';

const axios = require('axios');
const config = require('config');

async function getGithubClient() {
    return axios.create({
        baseURL: 'https://api.github.com',
        headers: {
            'Authorization': `Bearer ${config.get('github.token')}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });
}

module.exports = { getGithubClient };