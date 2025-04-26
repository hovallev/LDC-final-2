// src/retriever.ts
// Vector store retriever using Cohere v3 embeddings

import * as path from 'path';
import 'dotenv/config';
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { CohereEmbeddings } from "@langchain/cohere"; // Using Cohere embeddings from new package
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import * as fs from 'fs/promises';
import { Document } from "langchain/document";

console.log('Retriever module loaded - Using Cohere embed-english-v3.0 embeddings');

// --- Configuration ---
const DATA_DIRECTORY = path.resolve(__dirname, '../data');
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

// Using Cohere embeddings
const apiKey = process.env.COHERE_API_KEY;
console.log(`Using ${apiKey ? 'available' : 'MISSING'} API key for embeddings`);

// Create embeddings using Cohere's model
const embeddings = new CohereEmbeddings({
    apiKey: apiKey,
    model: "embed-english-v3.0",
    inputType: "search_document" // For document embedding
});

// --- State ---
let vectorStoreInstance: MemoryVectorStore | null = null;
let isInitializing = false;

/**
 * Initializes the vector store by reading files, splitting text, and embedding.
 * Uses a simple lock (isInitializing) to prevent concurrent initializations.
 */
async function initializeVectorStore(): Promise<MemoryVectorStore> {
    if (vectorStoreInstance) {
        return vectorStoreInstance;
    }

    if (isInitializing) {
        // Wait for the ongoing initialization to complete
        // Simple busy-wait, consider a more robust locking mechanism for production
        await new Promise(resolve => setTimeout(resolve, 100));        return initializeVectorStore(); // Re-check after waiting
    }
    
    isInitializing = true;
    console.log('Initializing vector store...');
    
    try {
        // Check for Cohere API Key
        if (!process.env.COHERE_API_KEY) {
             console.warn('WARNING: COHERE_API_KEY is not set. Embeddings will fail.');
             // Potentially throw error if key is strictly required
        }

        const documents: Document[] = [];
        try {
            const files = await fs.readdir(DATA_DIRECTORY);
            const txtFiles = files.filter(f => f.endsWith('.txt') && f !== 'placeholder.txt');
            console.log(`Found ${txtFiles.length} .txt files in ${DATA_DIRECTORY}`);

            for (const file of txtFiles) {
                const filePath = path.join(DATA_DIRECTORY, file);
                try {
                    const content = await fs.readFile(filePath, 'utf-8');
                    documents.push(new Document({ pageContent: content, metadata: { source: file } }));
                    console.log(` -> Loaded ${file}`);
                } catch (readError) {
                    console.error(`Error reading file ${filePath}:`, readError);
                }
            }
        } catch (dirError) {
            console.error(`Error reading data directory ${DATA_DIRECTORY}:`, dirError);
            // Decide how to handle this - proceed with empty store or throw?
        }

        if (documents.length === 0) {
            console.warn("No documents found or loaded. Vector store will be empty.");
            // Return an empty store or throw an error based on requirements
            vectorStoreInstance = new MemoryVectorStore(embeddings); // Create empty store
            return vectorStoreInstance;
        }

        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: CHUNK_SIZE,
            chunkOverlap: CHUNK_OVERLAP
        });
        const splits = await textSplitter.splitDocuments(documents);
        console.log(`Split ${documents.length} documents into ${splits.length} chunks.`);

        console.log('Generating embeddings and creating MemoryVectorStore...');
        vectorStoreInstance = await MemoryVectorStore.fromDocuments(splits, embeddings);
        console.log('Vector store initialized successfully.');
        return vectorStoreInstance;

    } catch (error) {
        console.error('Failed to initialize vector store:', error);
        vectorStoreInstance = null; // Ensure instance is null on failure
        throw error; // Re-throw the error to signal failure
    } finally {
        isInitializing = false; // Release the lock
    }
}

/**
 * Retrieves relevant context from the vector store.
 * Initializes the store on the first call if needed.
 * @param query The user's query or current context.
 * @param k The number of top documents to retrieve (default: 3).
 * @returns A promise that resolves to an array of relevant Document objects.
 */
export async function retrieveContext(query: string, k: number = 3): Promise<Document[]> {
    try {
        const store = await initializeVectorStore();
        if (!store) {
            throw new Error("Vector store is not available after initialization attempt.");
        }
        console.log(`Retrieving top ${k} contexts for query: "${query.substring(0, 50)}..."`);
        const results = await store.similaritySearch(query, k);
        console.log(`Found ${results.length} relevant documents.`);
        return results;
    } catch (error) {
        console.error('Error retrieving context:', error);
        return []; // Return empty array on error
    }
}

// Optional: Trigger initialization when the module loads
// initializeVectorStore().catch(error => {
//     console.error("Background initialization failed:", error);
//     // Decide if this failure is critical
// });

// Singleton pattern or similar might be needed to manage the vector store instance
// let vectorStoreInstance: any = null;
// async function getVectorStore() {
//   if (!vectorStoreInstance) {
//     vectorStoreInstance = await initializeVectorStore();
//   }
//   return vectorStoreInstance;
// }

// Initialize the store when the module loads (or lazily on first request)
// getVectorStore().catch(console.error);