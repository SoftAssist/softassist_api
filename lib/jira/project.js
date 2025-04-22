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
        url: `${jiraConfig.jira.url}/rest/api/3/project/search`,
        auth: auth,
        params: {
            expand: 'description,lead,url,projectKeys',
            recent: 0,
            orderBy: 'key'
        },
        headers: {
            'Accept': 'application/json'
        }
    });

    return response.data;
}

/**
 * Retrieves all issues for a specific Jira project
 * @param {string} projectId - The ID of the Jira project
 * @returns {Promise<Array>} List of all issues in the project
 */
async function getProjectIssues(projectId) {
    const jiraConfig = config.get('atlassian');
    
    const auth = {
        username: jiraConfig.user,
        password: jiraConfig.token
    };

    const response = await axios({
        method: 'GET',
        url: `${jiraConfig.jira.url}/rest/api/3/search`,
        auth: auth,
        params: {
            jql: `project = ${projectId}`,
            maxResults: 100  // Adjust this value based on your needs
        },
        headers: {
            'Accept': 'application/json'
        }
    });
    console.log(response.data.issues);
    return response.data.issues;
}

module.exports = {
    getAllProjects,
    getProjectIssues
};

