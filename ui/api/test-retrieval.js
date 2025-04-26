// ui/api/test-retrieval.js
const { retrieveContext } = require('./retriever.js');

module.exports = async function handler(req, res) {
  // Set CORS headers to allow testing from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS requests (for CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET or POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get query from query string or body
    let query = '';
    let maxResults = 3;
    
    if (req.method === 'GET') {
      query = req.query.q || '';
      maxResults = parseInt(req.query.max || '3', 10);
    } else {
      query = req.body.query || '';
      maxResults = parseInt(req.body.maxResults || '3', 10);
    }
    
    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter "q" or body parameter "query"' });
    }
    
    // Log the environment for debugging
    console.log('Environment check:');
    console.log(`- COHERE_API_KEY set: ${Boolean(process.env.COHERE_API_KEY)}`);
    console.log(`- DEEPSEEK_API_KEY set: ${Boolean(process.env.DEEPSEEK_API_KEY)}`);
    console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    
    // Get the documents
    console.log(`[TEST] Testing retrieval for query: "${query}"`);
    const startTime = Date.now();
    const results = await retrieveContext(query, maxResults);
    const endTime = Date.now();
    
    // Additional logging to help diagnose issues
    console.log(`[TEST] Retrieved ${results.length} results in ${endTime - startTime}ms`);
    if (results.length > 0) {
      console.log(`[TEST] First result from source: ${results[0].source}`);
      const firstContentPreview = results[0].content.substring(0, 50);
      console.log(`[TEST] First content preview: ${firstContentPreview}...`);
    } else {
      console.log(`[TEST] No results found for query: "${query}"`);
    }
    
    return res.status(200).json({
      query,
      resultsCount: results.length,
      timeTaken: `${endTime - startTime}ms`,
      env: {
        cohereKeySet: Boolean(process.env.COHERE_API_KEY),
        deepseekKeySet: Boolean(process.env.DEEPSEEK_API_KEY),
        nodeEnv: process.env.NODE_ENV || 'not set'
      },
      results: results.map(doc => ({
        source: doc.source,
        similarity: doc.similarity,
        // Include a preview of the content
        preview: doc.content.substring(0, 200) + '...',
        // Include full content for testing
        content: doc.content
      }))
    });
  } catch (error) {
    console.error('[TEST] Error in test-retrieval handler:', error);
    return res.status(500).json({ 
      error: 'Error testing retrieval',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};