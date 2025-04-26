// Serverless API function for handling chat requests on Vercel
// Full implementation of the LDC Coach Bot backend
import { OpenAI } from 'openai';
import { nextState } from './fsm.js';
import { SYSTEM } from './prompt.js';
import { retrieveContext } from './retriever.js';

// Initialize the OpenAI/DeepSeek API client
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: "https://api.deepseek.com/v1", // Use DeepSeek API if available
});

// This function processes the chat request and streams responses
export default async function handler(req, res) {
  // Only handle POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse incoming request body
    const { messages, currentState } = req.body;
    
    // Log incoming request data for debugging
    console.log('Received chat request:', { 
      messageCount: messages?.length,
      currentState,
      lastUserMessage: messages?.length > 0 ? messages[messages.length - 1].content : 'No messages'
    });

    // Determine the next state based on the last user message
    const lastUserMessage = messages[messages.length - 1];
    let newState = currentState;
    
    // Only try to update state if the last message is from the user
    if (lastUserMessage && lastUserMessage.role === 'user') {
      newState = nextState(currentState, lastUserMessage.content);
      console.log(`State transition: ${currentState} -> ${newState}`);
    }
    
    // Setup headers for server-sent events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    try {
      // Retrieve relevant context based on the user's message
      let contextInfo = '';
      if (lastUserMessage && lastUserMessage.role === 'user') {
        const relevantContext = await retrieveContext(lastUserMessage.content);
        if (relevantContext && relevantContext.length > 0) {
          // Format the context for inclusion in the prompt
          contextInfo = relevantContext.map(ctx => 
            `From ${ctx.source}:\n${ctx.content}`
          ).join('\n\n');
          
          // Notify the client that context was retrieved
          res.write(`data: ${JSON.stringify({ 
            contextInfo: `Retrieved relevant information from ${relevantContext.length} sources`
          })}\n\n`);
        }
      }
      
      // Format messages for the AI, including the system prompt and retrieved context
      const systemPrompt = SYSTEM();
      const systemWithContext = contextInfo 
        ? `${systemPrompt}\n\nRelevant context for your reference:\n${contextInfo}`
        : systemPrompt;
        
      const systemMessage = { role: 'system', content: systemWithContext };
      const aiMessages = [systemMessage, ...messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))];
      
      // Create a streaming completion with the AI model
      const stream = await openai.chat.completions.create({
        model: 'deepseek-chat', // Can also use 'gpt-3.5-turbo' or another model
        messages: aiMessages,
        stream: true,
        max_tokens: 2000,
        temperature: 0.7,
      });
      
      // Stream the response to the client
      let responseText = '';
      
      for await (const chunk of stream) {
        // Extract the content from the chunk
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          responseText += content;
          
          // Send the chunk to the client
          res.write(`data: ${JSON.stringify({ chunk: content })}\n\n`);
        }
      }
      
      // Send completion message with the updated state
      res.write(`data: ${JSON.stringify({ 
        done: true,
        finalState: newState
      })}\n\n`);
      
    } catch (streamError) {
      console.error('Error during streaming:', streamError);
      
      // Send error message if streaming fails
      res.write(`data: ${JSON.stringify({ 
        chunk: "\n\nI'm sorry, but I encountered an error while generating a response. Please try again later.",
        error: streamError.message,
        done: true,
        finalState: currentState
      })}\n\n`);
    }
    
    res.end();
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
