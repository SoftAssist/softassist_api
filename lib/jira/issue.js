'use strict';

const config = require('config');
const axios = require('axios');

/**
 * Creates a new issue in Jira
 * @param {Object} params - The issue parameters
 * @param {string} params.projectKey - The project key where the issue will be created
 * @param {string} params.summary - The issue summary/title
 * @param {string} params.description - The issue description
 * @param {string} [params.issueType=Task] - The type of issue
 * @returns {Promise<Object>} The created issue data
 */
async function createJiraIssue({ projectKey, summary, description, issueType = 'Task' }) {
    const jiraConfig = config.get('atlassian');
    
    const auth = {
        username: jiraConfig.user,
        password: jiraConfig.token
    };

    const response = await axios({
        method: 'POST',
        url: `${jiraConfig.jira.url}/rest/api/3/issue`,
        auth: auth,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        data: {
            fields: {
                project: {
                    key: projectKey
                },
                summary: summary,
                description: {
                    type: "doc",
                    version: 1,
                    content: [
                        {
                            type: "paragraph",
                            content: [
                                {
                                    text: description || "",
                                    type: "text"
                                }
                            ]
                        }
                    ]
                },
                issuetype: {
                    name: issueType
                }
            }
        }
    });

    return response.data;
}

module.exports = {
    createJiraIssue
};

