const { z } = require('zod');
const { ChatPromptTemplate } = require('@langchain/core/prompts');

const outputFormat = z.object({
  results: z.array(
    z.object({
      summary: z.string().describe("Task title"),
      description: z.string().describe("Detailed task description")
    })
  )
});

const taskExtractionPrompt = ChatPromptTemplate.fromMessages([
  ["user", `You are a project assistant extracting tasks from the transcript below.

Transcript:
{transcript}

Extract any actionable work items and format as structured JSON.`]
]);

module.exports = { outputFormat, taskExtractionPrompt };
