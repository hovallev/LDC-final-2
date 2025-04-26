// ui/api/retriever.js
// Document retrieval using Cohere embeddings for Vercel serverless functions
const { CohereClient } = require('cohere-ai');

// Initialize Cohere client for embeddings
const cohereClient = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

// In-memory cache for embeddings (note this will reset on cold starts)
let documentEmbeddings = null;
let documentChunks = [];
let isInitializing = false;

// Hard-coded document content for essential materials
const documents = {
  'LDC_S25_LDC_Brief_5_course_Summary': `
Leading Disruptive Change (LDC) Framework Summary

Proposition I: You need to lead through fog.
Technologies are advancing exponentially, lines between industries are blurring, expectations are shifting, and global shocks are happening with increased frequency. It is the era of predictable unpredictability.
The forever normal of constant change places leaders in a thick fog where data to justify making a decision comes in when it's too late to make a decision.

Proposition II: You need to understand the particular nature of adaptive challenges.
Some problems are technical with a best answer and expertise that can solve it. In the fog you find adaptive challenges with no clear best answer that are messy with possibility of loss and certainty of struggle.

Proposition III: Technical solutions are necessary but insufficient to solve adaptive challenges.
Technical tools like future-back strategy, organization design, enabling systems, classic change management and communication are necessary but insufficient.

Proposition IV: Solving adaptive challenges requires inducing and managing discomfort.
Learning comes when we are uncomfortable. No discomfort, no learning. Leaders must purposefully make organizations uncomfortable for change.

Proposition V: Go deep to find the real problem.
Every organization has ghosts - past traumas, invisible patterns, fear of identity loss. Spike into the organization's subconscious to find them.

Proposition VI: Both/and it with a paradox mindset.
A paradox mindset that relishes these kinds of challenges, that seeks to turn either/ors into both/ands is critical for success.

Concept 1: Change to Remain Unchanged
This concept focuses on tying changes to an organization's heritage and core values, helping staff feel a sense of continuity during disruptive change. It recognizes that identity threat is a major barrier to change. By establishing historical consciousness and linking transformation to core purpose and values, organizations can change everything while preserving their essential identity.

Concept 2: Strategic Sparring Sessions
These are data-backed debates designed to surface hidden disagreements within leadership teams. By creating structured forums for productive conflict, organizations can prevent false consensus and build more robust strategies. Strategic sparring specifically addresses the "false consensus" adaptive challenge, using creative abrasion to improve decision quality.

Concept 3: Paradox Mindset
This concept focuses on developing the ability to turn either/or situations into both/and solutions. Wendy K. Smith and Marianne Lewis define paradoxes as persistent, interdependent contradictions. A paradox mindset helps leaders embrace tensions such as work/life balance, planet/purpose goals, and sustaining while disrupting. Research shows that simply being exposed to paradox mindset concepts boosts creativity. Leaders can build this mindset through paradox quests (doing something against type), shifting perspectives, and conducting thought experiments with varying constraints.`,

  'Memoria_BICECORP_Summary': `
BICECORP is undergoing transformative merger with Grupo Security to create one of Chile's three-largest private financial groups with >USD 34 billion in consolidated assets.

Key 2024 highlights:
- Merger progress – regulatory approvals obtained by Oct 2024; takeover bid secured 98.43% of GS shares
- Bank NPS +40%; BICE Vida NPS 70%; >700 employees now operate in agile squads
- Digital innovation: BICE Connect API transfers; AIDES AI cut credit-analysis time 80%

Integration challenges & risk management:
1. Cultural alignment - addressed via Culture & Change Office; 78 workshops; retention for key staff
2. Systems & data - "OneCore" micro-services + data-lake; 35% complete 
3. Customer migration - Phased waves with attrition cap ≤1%
4. Brand architecture - Market research Q2 2025; decision Q3 2025

Business lines include Banking (Banco BICE), Investments (BICE Inversiones), Insurance (BICE Vida), Auto Finance, Mortgage Finance, Securitization, and International operations (BICE US in Florida).

Digital transformation focuses on BICE Connect/Connect X, AIDES AI, GenAI contact center, and BICE ID biometric authentication, with a Company Builder incubating new services.`,

  'LDC_S25_Flip_Book': `
Leading Disruptive Change: Key Practices and Tools

Practice A: Act when the data tells you not to - Amplify weak signals to preempt ending up on a burning platform.

Practice B: Lead by letting go - Enable experiments to generate convincing data. As Scott Cook from Intuit said, "We want our leaders to be coaches and facilitators, not decision makers. The experiments that the team runs should provide the data to help the team make decisions, so the leader doesn't have to."

Practice C: Hear the voice that doesn't speak - The Abilene Paradox: A group collectively deciding to do what no individual actually wants to do.

Practice D: Disagree to agree - "You don't get innovation without diversity and conflict, and that means leaders need to build a capability for creative abrasion." - Linda Hill, HBS

Practice E: Change to remain unchanged - Transcending the Ship of Theseus paradox: Change everything and change nothing.

TOOL 1: Early Warning Signs of Disruptive Change - A checklist to identify signs of disruptive change early enough to allow action.

TOOL 6: Strategic Sparring Sessions - A way to surface and share differing assumptions driving lack of group alignment. Key enablers are a common language for the discussion and intentional design.

TOOL 9: Adaptive Space - Best practices include: Create a formal structure; Give it resources and autonomy over local resource-allocation decisions; Have senior leadership arbitrate disputes and bias towards the new; Micromanage the link between it and existing operations; Ensure stage-appropriate metrics & incentives (learning vs. earning).`
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
  
  if (normA === 0 || normB === 0) {
    return 0; // Handle division by zero
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Initialize document embeddings by generating them
 */
async function initializeEmbeddings() {
  if (documentEmbeddings !== null) {
    return; // Already initialized
  }

  if (isInitializing) {
    // Wait for the ongoing initialization to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    return initializeEmbeddings();
  }

  isInitializing = true;

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
    
    try {
      const embeddingResponse = await cohereClient.embed({
        texts,
        model: "embed-english-v3.0",
        inputType: "search_document"
      });
      
      documentEmbeddings = embeddingResponse.embeddings;
      console.log('Generated embeddings for', documentChunks.length, 'chunks');
    } catch (embeddingError) {
      console.error('Failed to generate embeddings:', embeddingError);
      // Fallback to using simple keyword matching if embeddings fail
      documentEmbeddings = []; // Empty but not null to indicate initialization completed
      console.log('Using keyword matching fallback');
    }
  } catch (error) {
    console.error('Failed to initialize retriever:', error);
    documentEmbeddings = []; // Mark as initialized even on error to prevent repeated failures
  } finally {
    isInitializing = false;
  }
}

/**
 * Fallback retrieval using keyword matching
 */
function keywordMatchRetrieval(query, maxResults = 3) {
  const keywords = query.toLowerCase().split(/\s+/).filter(word => word.length > 3);
  
  // Score chunks based on keyword matches
  const scoredChunks = documentChunks.map(chunk => {
    const text = chunk.text.toLowerCase();
    let score = 0;
    
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        score += 1;
      }
    }
    
    return {
      similarity: score / Math.max(1, keywords.length), // Normalize score
      chunk
    };
  });
  
  // Sort by score (descending)
  scoredChunks.sort((a, b) => b.similarity - a.similarity);
  
  // Return top results
  return scoredChunks.slice(0, maxResults).map(result => ({
    content: result.chunk.text,
    source: result.chunk.metadata.source,
    similarity: result.similarity
  }));
}

/**
 * Retrieve relevant document chunks for a query
 * @param {string} query - The user query
 * @param {number} maxResults - Maximum number of results to return
 * @returns {Array} Array of relevant document chunks
 */
async function retrieveContext(query, maxResults = 3) {
  try {
    console.log(`[RETRIEVER] Retrieving context for: "${query}"`);
    await initializeEmbeddings();
    
    // If embeddings couldn't be generated, use keyword matching
    if (!documentEmbeddings || documentEmbeddings.length === 0) {
      console.log('[RETRIEVER] Using keyword matching for retrieval - no embeddings available');
      const results = keywordMatchRetrieval(query, maxResults);
      console.log(`[RETRIEVER] Found ${results.length} results using keyword matching`);
      return results;
    }
    
    // Get embedding for the query
    console.log('[RETRIEVER] Getting embedding for query from Cohere API');
    const queryResponse = await cohereClient.embed({
      texts: [query],
      model: "embed-english-v3.0",
      inputType: "search_query"
    });
    const queryEmbedding = queryResponse.embeddings[0];
    console.log('[RETRIEVER] Successfully got query embedding');
    
    // Calculate similarities and rank results
    console.log('[RETRIEVER] Calculating similarities with document chunks');
    const similarities = documentEmbeddings.map((embedding, index) => {
      const sim = cosineSimilarity(queryEmbedding, embedding);
      return {
        similarity: sim,
        chunk: documentChunks[index]
      };
    });
    
    // Sort by similarity (descending)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Return top results
    const results = similarities.slice(0, maxResults);
    console.log(`[RETRIEVER] Found ${results.length} results using embeddings`);
    
    // Log the top results for debugging
    results.forEach((result, i) => {
      console.log(`[RETRIEVER] Result ${i+1}: source=${result.chunk.metadata.source}, similarity=${result.similarity.toFixed(3)}`);
    });
    
    return results.map(result => ({
      content: result.chunk.text,
      source: result.chunk.metadata.source,
      similarity: result.similarity
    }));
  } catch (error) {
    console.error('[RETRIEVER] Error retrieving context:', error);
    // Fallback to keyword matching on any error
    console.log('[RETRIEVER] Falling back to keyword matching due to error');
    const results = keywordMatchRetrieval(query, maxResults);
    console.log(`[RETRIEVER] Found ${results.length} results using keyword matching fallback`);
    return results;
  }
}

module.exports = {
  retrieveContext
};