// Document retrieval using Cohere embeddings for Vercel serverless functions
import { createClient } from '@vercel/kv';
import { CohereClient } from 'cohere-ai';

// Initialize Cohere client for embeddings
const cohereClient = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

// Initialize Vercel KV for storing embeddings (if available)
let kv;
try {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    kv = createClient({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
} catch (error) {
  console.error('Failed to initialize Vercel KV:', error);
}

// In-memory cache for embeddings when KV is not available
let documentEmbeddings = null;
let documentChunks = [];

// Hard-coded document content for essential materials
// This approach ensures the documents are available in the serverless environment
const documents = {
  'LDC_Summary': `
    Leading Disruptive Change (LDC) Framework Summary
    
    Concept 1: Change to Remain Unchanged
    This concept focuses on tying changes to an organization's heritage and core values, 
    helping staff feel a sense of continuity during disruptive change. For Banco BICE, linking
    transformational moves to the company's "propósito" reduces resistance to change and preserves
    organizational identity during the merger with Grupo Security.
    
    Concept 2: Strategic Sparring Sessions
    These are data-backed debates designed to surface hidden disagreements within leadership teams.
    By creating structured forums for productive conflict, organizations can prevent false consensus
    and build more robust strategies. In the context of Banco BICE and Grupo Security, these sessions
    would be particularly valuable for preventing echo chambers between the Matte leadership and
    ex-Security leadership teams.
    
    Concept 3: Adaptive Space
    This concept involves creating autonomy and resource pools for experiments and innovation.
    It allows new mixed teams to launch Banking-as-a-Service or wealth management pilots without
    risking the core Return on Equity metrics. Creating this adaptive space enables innovation
    to flourish while maintaining business stability during disruptive change periods.
  `,
  'BICECORP_Summary': `
    BICECORP Summary
    
    BICECORP is a diversified financial services holding company in Chile, with Banco BICE as its
    primary subsidiary. The company has a strong tradition of conservative risk management and focus
    on high-net-worth individual banking and corporate banking services.
    
    Key characteristics include:
    - Founded with a heritage tied to traditional Chilean industrial families
    - Strong emphasis on personalized service and relationship banking
    - Conservative approach to growth and risk management
    - Expertise in wealth management and corporate banking
    - Focus on maintaining high service quality rather than competing solely on price
    
    The potential merger with Grupo Security represents a significant change to the company's
    historical independent trajectory, bringing both opportunities for expansion and challenges
    related to cultural integration and maintaining its distinctive service approach.
  `
};

/**
 * Split text into chunks for embedding and retrieval
 */
function splitTextIntoChunks(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let i = 0;
  
  while (i < text.length) {
    chunks.push({
      text: text.slice(i, i + chunkSize),
      metadata: { position: chunks.length }
    });
    i += (chunkSize - overlap);
  }
  
  return chunks;
}

/**
 * Initialize document embeddings - either from KV or by generating them
 */
async function initializeEmbeddings() {
  if (documentEmbeddings) {
    return;
  }
  
  // Try to get embeddings from KV store first
  if (kv) {
    try {
      const cachedEmbeddings = await kv.get('document_embeddings');
      const cachedChunks = await kv.get('document_chunks');
      
      if (cachedEmbeddings && cachedChunks) {
        documentEmbeddings = cachedEmbeddings;
        documentChunks = cachedChunks;
        console.log('Loaded document embeddings from KV store');
        return;
      }
    } catch (error) {
      console.error('Failed to load from KV store:', error);
    }
  }
  
  // Generate embeddings if not available in KV
  try {
    console.log('Generating document embeddings...');
    
    // Process all documents
    for (const [docName, content] of Object.entries(documents)) {
      // Split the document into chunks
      const chunks = splitTextIntoChunks(content);
      
      // Add source information to each chunk
      const sourceChunks = chunks.map(chunk => ({
        ...chunk,
        metadata: {
          ...chunk.metadata,
          source: docName
        }
      }));
      
      // Add to our document chunks collection
      documentChunks.push(...sourceChunks);
    }
    
    // Get embeddings for all chunks
    const texts = documentChunks.map(chunk => chunk.text);
    const embeddingResponse = await cohereClient.embed({
      texts,
      model: "embed-english-v3.0",
      inputType: "search_document"
    });
    
    documentEmbeddings = embeddingResponse.embeddings;
    
    // Save to KV if available
    if (kv) {
      try {
        await kv.set('document_embeddings', documentEmbeddings);
        await kv.set('document_chunks', documentChunks);
        console.log('Saved document embeddings to KV store');
      } catch (error) {
        console.error('Failed to save to KV store:', error);
      }
    }
    
    console.log('Generated embeddings for', documentChunks.length, 'chunks');
  } catch (error) {
    console.error('Failed to generate embeddings:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Retrieve relevant document chunks for a query
 */
export async function retrieveContext(query, maxResults = 3) {
  try {
    await initializeEmbeddings();
    
    // Get embedding for the query
    const queryResponse = await cohereClient.embed({
      texts: [query],
      model: "embed-english-v3.0",
      inputType: "search_query"
    });
    const queryEmbedding = queryResponse.embeddings[0];
    
    // Calculate similarities and rank results
    const similarities = documentEmbeddings.map((embedding, index) => {
      return {
        similarity: cosineSimilarity(queryEmbedding, embedding),
        chunk: documentChunks[index]
      };
    });
    
    // Sort by similarity (descending)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Return top results
    const results = similarities.slice(0, maxResults);
    
    return results.map(result => ({
      content: result.chunk.text,
      source: result.chunk.metadata.source,
      similarity: result.similarity
    }));
  } catch (error) {
    console.error('Error retrieving context:', error);
    return [];
  }
}
