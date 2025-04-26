// src/index.ts
// Entry point for the backend server & streaming orchestrator

import 'dotenv/config'; // Load environment variables
import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import OpenAI from "openai"; // Import the OpenAI SDK
// import { createChatStream } from './chat'; // Hypothetical chat stream function
// import { generatePdf } from './pdfGenerator'; // Hypothetical PDF generator
// Import necessary functions
import { retrieveContext } from './retriever'; // Import the retriever function
import { nextState, State } from './fsm';       // Import FSM state type and transition function
import { SYSTEM } from './prompt';      // Import system prompt generator
// import { DeepSeekChat } from './deepseek'; // Assuming a DeepSeek client wrapper

console.log('LDC Coach Bot Backend Starting...');

const PORT = process.env.PORT || 3000;

// --- Environment Variable Check ---
const deepSeekApiKey = process.env.DEEPSEEK_API_KEY;
if (!deepSeekApiKey) {
    console.error('FATAL ERROR: DEEPSEEK_API_KEY environment variable is not set.');
    process.exit(1);
}

// --- DeepSeek Client Initialization (Using OpenAI SDK) ---
const deepseekClient = new OpenAI({
    apiKey: deepSeekApiKey,
    baseURL: "https://api.deepseek.com/v1", // Point to DeepSeek API endpoint
});
console.log("DeepSeek client initialized using OpenAI SDK.");

// Example setup (replace with actual server implementation, e.g., Express, Fastify, or Node HTTP)
const app = express();

// --- Middleware ---
app.use(cors({
  origin: 'http://localhost:3001', // Allow requests from frontend
  methods: ['GET', 'POST'],
  credentials: true // Allow cookies if needed
})); // Configure CORS properly for local development
app.use(express.json()); // Parse JSON request bodies

// --- Types (Consider moving to a shared types file) ---
// Use MessageContent from openai package if needed, or keep simple structure
type ChatCompletionMessageParam = OpenAI.Chat.ChatCompletionMessageParam;

interface ChatRequestBody {
    messages: ChatCompletionMessageParam[]; // Use OpenAI type for consistency
    currentState: State;
}

// --- API Endpoints ---

// Chat Endpoint (SSE)
// Define the handler with correct types and void return for async
const chatHandler: RequestHandler<{}, any, ChatRequestBody> = async (req, res, next): Promise<void> => {
  console.log('Received /api/chat request');
  const { messages, currentState } = req.body;

  if (!messages || messages.length === 0) {
      // Use return to stop execution after sending response
      res.status(400).send({ error: 'Missing or empty messages array' });
      return; // Explicit return for void promise
  }
  if (!currentState) {
      res.status(400).send({ error: 'Missing currentState' });
      return;
  }

  const userMessage = messages[messages.length - 1];
  if (userMessage.role !== 'user') {
      // Use return
      res.status(400).send({ error: 'Last message must be from user' });
      return; // Explicit return for void promise
  }

  // Ensure content exists and is not null/undefined before accessing
  const userQuery = typeof userMessage.content === 'string' ? userMessage.content : '';
  if (!userQuery) {
      res.status(400).send({ error: 'User message content is empty' });
      return;
  }

  console.log(`State: ${currentState}, User query: "${userQuery}"`);

  // --- Determine Next State (based on user input) --- 
  const calculatedNextState = nextState(currentState, userQuery);
  console.log(`Calculated next state based on input: ${calculatedNextState}`);  // --- Retrieve Context --- 
  let contextString = "No relevant context found.";
  try {
      // Retrieve context for all states to ensure we use all available information
      console.log(`Attempting to retrieve context for query: "${userQuery.substring(0, 50)}${userQuery.length > 50 ? '...' : ''}"`);
      const retrievedDocs = await retrieveContext(userQuery, 3);
      if (retrievedDocs.length > 0) {
          console.log(`Retrieved ${retrievedDocs.length} document chunks.`);
          contextString = retrievedDocs.map((doc, i) =>
              `Context ${i + 1} (Source: ${doc.metadata?.source}):\n${doc.pageContent}`
          ).join("\n\n---\n\n");
          console.log(`First context source: ${retrievedDocs[0].metadata?.source || 'unknown'}`);
      } else {
          console.log("No relevant document chunks found for query.");
      }
  } catch (retrievalError) {
      console.error("Error during context retrieval:", retrievalError);
      // Decide how to handle - continue without context for now
      contextString = "Error retrieving context.";
  }

  // --- Construct Prompt for DeepSeek --- 
  // Combine system prompt, history, and retrieved context
  const systemPrompt = SYSTEM(); // Get base system prompt
  // Ensure messages are in the correct format (ChatCompletionMessageParam)
  const messagesForAPI: ChatCompletionMessageParam[] = [
      { role: 'system', content: `${systemPrompt}\n\nRelevant Context:\n${contextString}` },
      // Map existing messages just in case they aren't strictly ChatCompletionMessageParam
      ...messages.slice(-10).map(msg => ({ role: msg.role, content: msg.content } as ChatCompletionMessageParam))
  ];

  // --- Setup SSE --- 
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Flush the headers to establish SSE connection

  // --- Call DeepSeek API & Stream Response --- 
  try {
      console.log("Calling DeepSeek chat completions API...");      const stream = await deepseekClient.chat.completions.create({
          model: "deepseek-chat", // Using DeepSeek v3 model
          messages: messagesForAPI,
          stream: true,
          temperature: 0.7, // Example parameter - adjust as needed
          // max_tokens: 150, // Example parameter - adjust as needed
      });

      console.log("Streaming response from DeepSeek...");
      for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
              res.write(`data: ${JSON.stringify({ chunk: content })}\n\n`);
          }
      }
      console.log("Finished streaming response from DeepSeek.");

  } catch (error: any) {
      console.error("Error streaming from DeepSeek:", error);
      const errorMessage = error.message || "Error communicating with AI model.";
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
  }

  // --- Send Final State Update --- 
  // Send the state that should be adopted *after* this interaction
  res.write(`data: ${JSON.stringify({ done: true, finalState: calculatedNextState })}\n\n`);
  res.end();
  console.log(`SSE stream finished. Final state sent: ${calculatedNextState}`);

  req.on('close', () => {
    // Clean up if necessary (e.g., abort DeepSeek request if stream is still active)
    if (!res.writableEnded) {
        res.end();
    }
    console.log('Client disconnected from SSE.');
  });
};

// Use the defined handler for POST requests
app.post('/api/chat', chatHandler);

// Also handle GET requests for SSE connections
app.get('/api/chat', chatHandler);

// Root path handler
app.get('/', (req, res) => {
  res.json({
    message: 'LDC Coach Bot API',
    status: 'running',
    endpoints: [
      { path: '/api/chat', method: 'POST', description: 'Chat with the LDC Coach Bot' },
      { path: '/api/pdf', method: 'POST', description: 'Generate PDF summary (not implemented yet)' }
    ],
    ui: 'Available at http://localhost:3001'
  });
});

// PDF Generation Endpoint
app.post('/api/pdf', async (req: Request, res: Response) => {
  console.log('Received /api/pdf request');
  // const { conversationSummary } = req.body; // Expect data needed for PDF

  try {
    // TODO: Implement PDF generation using pdf-lib
    // const pdfBytes = await generatePdf(conversationSummary);
    // res.setHeader('Content-Type', 'application/pdf');
    // res.setHeader('Content-Disposition', 'attachment; filename=ldc_summary.pdf');
    // res.send(Buffer.from(pdfBytes));
    console.warn('PDF generation not implemented.');
    res.status(501).send('PDF generation not implemented yet.');
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Failed to generate PDF');
  }
});

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

// --- Ensure required environment variables are set ---
if (!process.env.DEEPSEEK_API_KEY) {
  console.error('FATAL ERROR: DEEPSEEK_API_KEY environment variable is not set.');
  process.exit(1);
}
if (!process.env.EMBED_API_KEY) {
  console.warn('WARNING: EMBED_API_KEY environment variable is not set. Retrieval might fail.');
  // Decide if this is fatal or not depending on implementation
}

// --- DeepSeek Client Initialization (Placeholder) ---
// const deepseekClient = new DeepSeekClient({ apiKey: deepSeekApiKey });
console.warn("DeepSeekClient needs to be properly initialized using the actual SDK.");
const placeholderDeepSeekStream = async (prompt: string, history: any[]) => { // Placeholder function
    console.log("Simulating DeepSeek stream call...");
    const chunks = [`Received prompt: ${prompt.substring(0, 50)}... `, `Context length: ${history.length}. `, `Generating response... `];
    let i = 0;
    return {
        async *[Symbol.asyncIterator]() {
            while(i < chunks.length) {
                await new Promise(resolve => setTimeout(resolve, 300));
                yield { content: chunks[i++] }; // Simulate chunk structure
            }
        }
    };
}; 