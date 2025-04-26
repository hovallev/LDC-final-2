// ui/api/chat.js
const { retrieveContext } = require('./retriever.js');
const { nextState } = require('./fsm.js');
const { SYSTEM } = require('./prompt.js');
const { OpenAI } = require('openai');

// Initialize DeepSeek client using OpenAI SDK
const deepseekClient = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

module.exports = async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { messages, currentState } = req.body;

    // Validate request
    if (!messages || messages.length === 0) {
      res.write(`data: ${JSON.stringify({ error: 'Missing or empty messages array' })}\n\n`);
      return res.end();
    }

    if (!currentState) {
      res.write(`data: ${JSON.stringify({ error: 'Missing currentState' })}\n\n`);
      return res.end();
    }

    const userMessage = messages[messages.length - 1];
    if (userMessage.role !== 'user') {
      res.write(`data: ${JSON.stringify({ error: 'Last message must be from user' })}\n\n`);
      return res.end();
    }

    const userQuery = typeof userMessage.content === 'string' ? userMessage.content : '';
    if (!userQuery) {
      res.write(`data: ${JSON.stringify({ error: 'User message content is empty' })}\n\n`);
      return res.end();
    }

    // Determine next state based on user input
    const calculatedNextState = nextState(currentState, userQuery);
    
    // Retrieve context (simplified for this example)
    let contextString = "No relevant context found.";
    try {
      const retrievedDocs = await retrieveContext(userQuery, 3);
      if (retrievedDocs.length > 0) {
        contextString = retrievedDocs.map((doc, i) =>
          `Context ${i + 1} (Source: ${doc.source}):\n${doc.content}`
        ).join("\n\n---\n\n");
      }
    } catch (retrievalError) {
      console.error("Error during context retrieval:", retrievalError);
      contextString = "Error retrieving context.";
    }

    // Construct prompt for DeepSeek
    const systemPrompt = SYSTEM();
    const messagesForAPI = [
      { role: 'system', content: `${systemPrompt}\n\nRelevant Context:\n${contextString}` },
      ...messages.slice(-10).map(msg => ({ role: msg.role, content: msg.content }))
    ];

    // Call DeepSeek API & stream response
    try {
      const aiStream = await deepseekClient.chat.completions.create({
        model: "deepseek-chat",
        messages: messagesForAPI,
        stream: true,
        temperature: 0.7,
      });

      // Process each chunk from DeepSeek
      for await (const chunk of aiStream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ chunk: content })}\n\n`);
          // Flush the response to ensure chunks are sent immediately
          if (res.flush) res.flush();
        }
      }

      // Send final state update
      res.write(`data: ${JSON.stringify({ done: true, finalState: calculatedNextState })}\n\n`);
      return res.end();
    } catch (error) {
      console.error("Error streaming from DeepSeek:", error);
      const errorMessage = error.message || "Error communicating with AI model.";
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      return res.end();
    }
  } catch (error) {
    console.error('Error in chat handler:', error);
    res.write(`data: ${JSON.stringify({ error: 'Internal server error' })}\n\n`);
    return res.end();
  }
}