// Serverless API function for handling chat requests on Vercel
// This is a simplified placeholder implementation

export default async function handler(req, res) {
  // Only handle POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse incoming request body
    const { messages, currentState } = req.body;
    
    // Log incoming request data to verify what's being received
    console.log('Received chat request:', { 
      messageCount: messages?.length,
      currentState,
      lastUserMessage: messages?.length > 0 ? messages[messages.length - 1].content : 'No messages'
    });
    
    // Send initial headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Send a verification message indicating the API is working
    res.write(`data: ${JSON.stringify({ chunk: "🎉 Success! The Vercel API deployment is working correctly. " })}\n\n`);
    
    // Wait a bit to simulate streaming
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    res.write(`data: ${JSON.stringify({ 
      chunk: "This is a test response from the placeholder API. Your request was successfully received and processed. ",
      contextInfo: "Test API verification" 
    })}\n\n`);
    
    // Wait a bit more
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Send the last user message back as confirmation
    const lastMessage = messages?.length > 0 ? messages[messages.length - 1].content : 'No message';
    res.write(`data: ${JSON.stringify({ 
      chunk: `\n\nYou said: "${lastMessage}"\n\nCurrent state: ${currentState}`,
    })}\n\n`);
    
    // Wait a bit more
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Final message with completion status
    res.write(`data: ${JSON.stringify({ 
      chunk: "\n\nWhen you're ready, you can implement your full backend logic in this API function.",
      done: true,
      finalState: currentState 
    })}\n\n`);
    
    res.end();
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
