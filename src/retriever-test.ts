// src/retriever-test.ts
// Test script for checking if document retrieval is working

import 'dotenv/config'; // Load environment variables
import { retrieveContext } from './retriever';

// Display the current directory path for debugging
console.log('Current directory:', __dirname);

async function testRetrieval() {
  console.log('===== DOCUMENT RETRIEVAL TEST =====');
  console.log('Testing retrieval with specific queries...');
  
  // Test queries
  const queries = [
    'Change to Remain Unchanged',
    'Strategic Sparring Sessions',
    'Adaptive Space',
    'Banco BICE merger'
  ];
  
  // Test each query
  for (const query of queries) {
    console.log(`\n----- Query: "${query}" -----`);
    try {
      const results = await retrieveContext(query, 3);
      console.log(`Found ${results.length} results`);
      
      if (results.length > 0) {
        results.forEach((doc, i) => {
          console.log(`\nResult ${i+1} (${doc.metadata?.source || 'unknown source'}):`);
          // Display a preview of content
          console.log(doc.pageContent.substring(0, 200) + '...');
        });
      } else {
        console.log('No documents found for this query.');
      }
    } catch (error) {
      console.error(`Error testing query "${query}":`, error);
    }
  }
  
  console.log('\n===== TEST COMPLETE =====');
}

// Run the test
testRetrieval().catch(error => {
  console.error('Test failed with error:', error);
});
