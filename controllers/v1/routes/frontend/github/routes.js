'use strict';

const express = require('express');
const router = express.Router();
const { captureErrorAndRespond } = require('../../../../../middleware/errors');
const { getPullRequests } = require('../../../../../lib/github/pullRequest');
const { getGithubClient } = require('../../../../../lib/github/client');
const GithubRepo = require('../../../../../models/githubRepo');
const GithubPR = require('../../../../../models/github');
const { OpenAI } = require('openai');
const config = require('config');
const {createGitHubRepo} = require('../../../../../lib/github/createGithubRepo');
const {parseMarkdownStructure} = require('../../../../../lib/github/parseMarkdown');
const { createRepoFromPaths, initGitRepo, pushToGitHub } = require('../../../../../lib/github/createFoldersFromPath');
const fs = require('fs');
const path = require('path');
const { get } = require('http');

  const openai = new OpenAI({
    apiKey: config.OPENAI_API_KEY,
  });


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

router.post('/merge', async (req, res) => {
    try {
        const { orgName, repoName, prNumber } = req.body;
        console.log(`Merging PR #${prNumber} in ${orgName}/${repoName}`);
        const client = await getGithubClient();

        // Merge the pull request
        const response = await client.put(`/repos/${orgName}/${repoName}/pulls/${prNumber}/merge`

            ,{
                commit_title: `Merging PR #${prNumber} via SoftAssist Dashboard`,
              }
        );
        console.log('Merge response:', response);
        // Update the database
        // await GithubPR.findOneAndUpdate(
        //     { owner: org, repo, pullNumber },
        //     { state: 'merged' },
        //     { new: true }
        // );

        return res.json({
            success: true,
            message: 'Pull request merged successfully',
        });
    }
    catch (error) {
        console.error('Error merging pull request:', error.message);
        return captureErrorAndRespond(error, res);
    }
}
);

router.post('/run-action', async (req, res) => {
    try {
        const { orgName, repoName, workflowId } = req.body;
        console.log(`Running action ${workflowId} in ${orgName}/${repoName}`);
        const client = await getGithubClient();

        // Trigger the workflow
        const response = await client.post(`/repos/${orgName}/${repoName}/actions/workflows/${workflowId}/dispatches`, {
            ref: 'main' // or any other branch you want to trigger the workflow on
        });

        return res.json({
            success: true,
            message: 'Action triggered successfully',
        });
    }
    catch (error) {
        console.error('Error triggering action:', error.message);
        return captureErrorAndRespond(error, res);
    }
}
);

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


async function getProjectStructure(context , repoName) {
    const finalRepoName = repoName?.trim() || "my-app";

const prompt = `
You are a senior software architect.

Given the following project description, generate a logical and clean **folder and file structure** for the project using **Markdown** format.

**Important:**
- Always adapt the folder structure, file extensions, config files, and tools based on the programming language and tech stack mentioned.
- For Golang projects, use .go files, and Go modules (go.mod, go.sum).
- For Node.js projects, use JavaScript/TypeScript files (e.g., .js, .ts, package.json).
- For Python projects, use .py files, requirements.txt, etc.
- For frontend projects (React, Vue, Next.js), use src/, public/, and appropriate JS/TS structure.
- Only include backend, frontend, database folders if they are actually relevant from the description.
- Always start the structure with a root folder named "${finalRepoName}/".
- Expand based on common best practices for the given stack.
- Output only a single Markdown code block inside triple backticks (\`\`\`) dont add the markdown key as well.
- Do not output any explanation or notes outside the code block.

**Project Description:**
${context}

**Output:**
`;

    
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a software engineer specializing in project scaffolding." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  });
  return response.choices[0].message.content;
}


router.post('/generate-template', async (req, res) => {
    try {
        const { context , repoName} = req.body;

        // Call OpenAI to get project structure markdown
        const structureMarkdown = await getProjectStructure(context, repoName);

        // (Optional) Save structureMarkdown into a database if you want

        res.json({ success: true, data: structureMarkdown });
    } catch (error) {
        return captureErrorAndRespond(error, res);
    }
}
);

async function getFilePaths(context, repoName){
    const prompt = `
You are a helpful assistant.

Given the following project description and structure in Markdown format,  
convert it into a **flat array of full folder and file paths**, with all files correctly placed inside their parent folders.

- Return the array as JSON.
- Each array element should be a string representing the full path starting from the root folder.
- Make sure nested folders and files are properly included.
- keep the file and folder names as they are dont change any name even the parent folder name its should be same as the repoName ${repoName}.
- No explanations outside the array.

Example:

Markdown:
\`\`\`
my-app/
├── package.json
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── index.tsx
│   └── utils/
│       └── helpers.ts
\`\`\`

Output:
\`\`\`json
[
  "my-app",
  "my-app/package.json",
  "my-app/public",
  "my-app/public/index.html",
  "my-app/public/favicon.ico",
  "my-app/src",
  "my-app/src/index.tsx",
  "my-app/src/utils",
  "my-app/src/utils/helpers.ts"
]
\`\`\`

Now, here is the new project Markdown:

${context}
`;
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: "You are a software engineer specializing in project scaffolding." },
            { role: "user", content: prompt },
        ],
    });

    const resultText = response.choices[0].message.content;

// Extract the array inside the triple backticks
    const pathsArray = JSON.parse(resultText.match(/```json\n([\s\S]*?)\n```/)[1]);
    return pathsArray;
}




router.post("/create-github-repo", async (req, res) => {
    try {
      const { repoName, markdownStructure} = req.body;
  
      if (!repoName || !markdownStructure) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
      }
  
      // 1. Parse Markdown to paths
      const paths = await getFilePaths(markdownStructure, repoName);
  
      // 2. Create local structure
      const basePath = path.join("./generated_repos", repoName);
  
      // Clean if already exists
      if (fs.existsSync(basePath)) {
        fs.rmSync(basePath, { recursive: true });
      }
  
      const repoPaths = await createRepoFromPaths(paths, "./generated_repos" ,markdownStructure);
  
      // 3. Create GitHub repo
      const repo = await createGitHubRepo("SoftAssist", repoName);
  
      // 4. Initialize Git locally
      initGitRepo(basePath);
  
      // 5. Push to GitHub
      pushToGitHub(basePath, "SoftAssist", repoName);
  
      // 6. Done
      return res.json({
        success: true,
        message: "Repository created and pushed successfully!",
        repoUrl: repo.html_url,
      });
  
    } catch (error) {
      console.error("Error creating repo:", error.message || error);
      return res.status(500).json({ success: false, message: "Something went wrong", error: error.message });
    }
  })



module.exports = router;