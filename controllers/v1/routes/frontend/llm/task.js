'use strict';

const { runLLMGraph } = require('./extract');
const { captureErrorAndRespond } = require('../../../../../middleware/errors');
const Meeting = require('../../../../../models/meeting');
const Task = require('../../../../../models/task');
module.exports = (router) => {
    /**
   * @route POST /generateTasks
   * @desc Generate tasks from a meeting transcript using LangChain (LLM)
   * @param {string} meetingId - MongoDB ObjectId of the meeting (in req.body)
   * @returns {Object} JSON response with an array of extracted tasks
   * 
   * @example Request Body:
   * {
   *   "meetingId": "6621abcd1234567890ef1234"
   * }
   * 
   * @example Success Response:
   * {
   *   "success": true,
   *   "tasks": [
   *     {
   *       "summary": "Refactor API",
   *       "description": "Refactor the /generateTasks endpoint for cleaner logic."
   *     },
   *     ...
   *   ]
   * }
   */
  router.post('/generateTasks', async (req, res) => {
    try {
      const { meetingId } = req.body;
      if (!meetingId) {
        return res.status(400).json({ message: 'meetingId is required' });
      }
      const meeting = await Meeting.findById(meetingId);
      await Task.deleteMany({
        meetingId: meeting._id,
        projectId: meeting.projectId,
      });
      const graph = runLLMGraph();
      const result = await graph.invoke({ meetingId });
      const savedTasks = await Promise.all(
        result.results.map(async (task) => {
          return await Task.create({
            projectId: meeting.projectId,
            meetingId: meeting._id,
            summary: task.summary,
            description: task.description,
          });
        })
      );
      return res.json({
        success: true,
        tasks: result.results
      });
    } catch (err) {
      return captureErrorAndRespond(err, res);
    }
  });
};
