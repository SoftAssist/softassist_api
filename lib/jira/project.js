'use strict';

const config = require('config');
const axios = require('axios');

/**
 * Retrieves all projects from Jira
 * @returns {Promise<Array>} List of all accessible projects
 */
async function getAllProjects() {
    const jiraConfig = config.get('atlassian');
    
    const auth = {
        username: jiraConfig.user,
        password: jiraConfig.token
    };

    const response = await axios({
        method: 'GET',
        url: `${jiraConfig.jira.url}/rest/api/3/project`,
        auth: auth,
        headers: {
            'Accept': 'application/json'
        }
    });

    return response.data;
}

module.exports = {
    getAllProjects
};

