const fs = require("fs");
const path = require("path");
const {execSync} = require("child_process");
const {OpenAI} = require("openai")
const config = require("config");

const openai = new OpenAI({
    apiKey: config.OPENAI_API_KEY,
  });

  async function generateCode(filePath, context) {
    const prompt = `
  You are a senior software engineer helping to build a project.
  
  Project Context:
  ${context}
  
  File to generate:
  ${filePath}
  
  Instructions:
  - Generate clean, production-ready code.
  - Follow best practices for the given type of file (e.g., if it's an API file, create a simple API handler; if it's a frontend file, create a simple React/Vue/Svelte component depending on the extension).
  - Use minimal external dependencies unless absolutely necessary.
  - If the file is a README.md, create a basic project introduction.
  - If unsure of file details, use reasonable assumptions.
  - Keep the code runnable and syntactically correct.
  - Add appropriate comments if needed.
  
  Only output raw code without enclosing it in \`\`\` backticks or any explanation.
    `.trim();
  
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // or "gpt-4-turbo"
      messages: [{ role: "user", content: prompt }],
    });
  
    let content = completion.choices[0]?.message?.content?.trim() || "";
  
    // Cleanup step: remove ``` wrapping if it somehow still happens
    if (content.startsWith("```")) {
      content = content.replace(/```[\w]*\n?/, ""); // remove starting ``` and optional language
      content = content.replace(/```$/, "");         // remove ending ```
    }
  
    return content.trim();
  }
  


async function createRepoFromPaths(paths, baseDir = "." , context) {
  for (const p of paths) {
    const fullPath = path.join(baseDir, p);

    if (isFile(p)) {
      const dir = path.dirname(fullPath);
      fs.mkdirSync(dir, { recursive: true });
      const code = await generateCode(fullPath, context);
      fs.writeFileSync(fullPath, code, "utf8");
    } else {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }
}

function isFile(p) {
  return /\.[^/.]+$/.test(path.basename(p));
}

function initGitRepo(repoPath) {
  execSync("git init", { cwd: repoPath });

  // // Always ensure there's at least one real file
  // const readmePath = path.join(repoPath, "README.md");
  // if (!fs.existsSync(readmePath)) {
  //   fs.writeFileSync(readmePath, "# Initial Commit\n\nThis is an auto-generated project scaffold.");
  // }

  execSync("git add .", { cwd: repoPath });
  execSync('git commit -m "Initial commit"', { cwd: repoPath });
}


function pushToGitHub(repoPath, orgName, repoName) {
  const remoteUrl = `https://Niwant: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@github.com/${orgName}/${repoName}.git`;

  execSync(`git remote add origin ${remoteUrl}`, { cwd: repoPath });
  execSync("git push -u origin master", { cwd: repoPath });
}

module.exports = {
  createRepoFromPaths,
  initGitRepo,
  pushToGitHub,
};
