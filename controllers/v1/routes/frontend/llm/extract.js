const { Annotation, StateGraph } = require('@langchain/langgraph');
const { ChatOpenAI } = require('@langchain/openai');
const { taskExtractionPrompt, outputFormat } = require('./prompt');
const config = require('config');

const Meeting = require('../../../../../models/meeting');

const llm = new ChatOpenAI({
  temperature: 0.3,
  openAIApiKey: config.OPENAI_API_KEY_LANGCHAIN,
});

const StateAnnotation = Annotation.Root({
  meetingId: Annotation(String),
  transcript: Annotation(String),
  results: Annotation(Array)
});

const retrieveTranscript = async (state) => {
  const meeting = await Meeting.findById(state.meetingId);
  if (!meeting || !meeting.transcript) throw new Error('Transcript not found');
  return { transcript: meeting.transcript };
};

const generateTasks = async (state) => {
  const messages = await taskExtractionPrompt.invoke({ transcript: state.transcript });
  const structured = llm.withStructuredOutput(outputFormat);
  const result = await structured.invoke(messages);
  return { results: result.results };
};

let graph;

const initGraph = async () => {
  graph = new StateGraph(StateAnnotation) 
    .addNode('retrieveTranscript', retrieveTranscript)
    .addNode('generateTasks', generateTasks)
    .addEdge('__start__', 'retrieveTranscript')
    .addEdge('retrieveTranscript', 'generateTasks')
    .addEdge('generateTasks', '__end__')
    .compile();
};

initGraph(); // Run on import

module.exports = {
  runLLMGraph: () => graph
};
