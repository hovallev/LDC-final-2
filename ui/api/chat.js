// /api/chat.js
import { NextResponse } from 'next/server';
import { retrieveContext } from '../_utils/retriever.js';
import { nextState } from '../_utils/fsm.js';
import { SYSTEM } from '../_utils/prompt.js';
import OpenAI from 'openai';

// Initialize DeepSeek client using OpenAI SDK
const deepseekClient = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Set up SSE headers
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  };

  try {
    const body = await req.json();
    const { messages, currentState } = body;

    // Validate request
    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing or empty messages array' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!currentState) {
      return new Response(JSON.stringify({ error: 'Missing currentState' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userMessage = messages[messages.length - 1];
    if (userMessage.role !== 'user') {
      return new Response(JSON.stringify({ error: 'Last message must be from user' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userQuery = typeof userMessage.content === 'string' ? userMessage.content : '';
    if (!userQuery) {
      return new Response(JSON.stringify({ error: 'User message content is empty' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Determine next state based on user input
    const calculatedNextState = nextState(currentState, userQuery);
    
    // Retrieve context
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

    // Create a new TransformStream for streaming the response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start the response streaming
    const responseStream = stream.readable;
    
    // Asynchronously process the response
    (async () => {
      try {
        // Call DeepSeek API & stream response
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
            await writer.write(
              `data: ${JSON.stringify({ chunk: content })}\n\n`
            );
          }
        }

        // Send final state update
        await writer.write(
          `data: ${JSON.stringify({ done: true, finalState: calculatedNextState })}\n\n`
        );
      } catch (error) {
        console.error("Error streaming from DeepSeek:", error);
        const errorMessage = error.message || "Error communicating with AI model.";
        await writer.write(
          `data: ${JSON.stringify({ error: errorMessage })}\n\n`
        );
      } finally {
        await writer.close();
      }
    })();

    return new Response(responseStream, { headers });
  } catch (error) {
    console.error('Error in chat handler:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}