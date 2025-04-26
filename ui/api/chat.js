// Simplified API handler for Vercel serverless functions
// No need to import NextResponse for basic API functionality

// Basic state machine - simplified from your fsm.js
function nextState(currentState, userInput) {
  const input = (userInput || "").trim().toLowerCase();
  
  // Handle direct number inputs (1, 2, 3)
  if (['1', '2', '3'].includes(input)) {
    return `concept${input}`;
  }
  
  // Default: remain in current state
  return currentState;
}

// Generate a response based on state
async function generateResponse(messages, state) {
  // A simple, hardcoded response system for testing
  const lastMessage = messages[messages.length - 1]?.content || '';
  
  if (state === 'intro') {
    return "Welcome to the LDC Coach Bot! I can help you learn about the three Leading Disruptive Change concepts. Type 1, 2, or 3 to select a concept.";
  }
  else if (state === 'concept1') {
    return "You've selected Concept 1: Change to Remain Unchanged. This concept focuses on tying changes to an organization's heritage and core values. For Banco BICE, this means linking transformational moves to the company's purpose.";
  }
  else if (state === 'concept2') {
    return "You've selected Concept 2: Strategic Sparring Sessions. These are data-backed debates designed to surface hidden disagreements within leadership teams.";
  }
  else if (state === 'concept3') {
    return "You've selected Concept 3: Adaptive Space. This concept involves creating autonomy and resource pools for experiments and innovation.";
  }
  
  return `I received your message: "${lastMessage}". What would you like to know about Leading Disruptive Change?`;
}

// Main API handler
module.exports = async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Parse request body
    const body = await req.json();
    const { messages, currentState } = body;
    
    // Log the request for debugging
    console.log('Received request:', { messagesCount: messages?.length, currentState });
    
    // Get the last user message
    const lastUserMessage = messages?.find(m => m.role === 'user')?.content || '';
    
    // Determine next state
    const newState = nextState(currentState, lastUserMessage);
    
    // Generate a response
    const response = await generateResponse(messages, newState);
    
    // Set up headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Stream the response in chunks to simulate streaming
    const chunks = response.match(/.{1,20}/g) || [];
    
    for (const chunk of chunks) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Send completion message
    res.write(`data: ${JSON.stringify({ done: true, finalState: newState })}\n\n`);
    res.end();
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
