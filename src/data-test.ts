// src/data-test.ts
// Simple test script to check if data files can be found

import * as path from 'path';
import * as fs from 'fs/promises';

const DATA_DIRECTORY = path.resolve(__dirname, '../data');

async function checkDataFiles() {
  console.log('===== DATA FILES TEST =====');
  console.log(`Looking for data files in: ${DATA_DIRECTORY}`);
  
  try {
    // Check if directory exists
    try {
      await fs.access(DATA_DIRECTORY);
      console.log(`✅ Data directory exists: ${DATA_DIRECTORY}`);
    } catch (err) {
      console.error(`❌ Data directory NOT found: ${DATA_DIRECTORY}`);
      return;
    }
    
    // List files in directory
    const files = await fs.readdir(DATA_DIRECTORY);
    console.log(`Found ${files.length} files in data directory:`);
    
    for (const file of files) {
      const filePath = path.join(DATA_DIRECTORY, file);
      const stats = await fs.stat(filePath);
      console.log(`- ${file} (${stats.size} bytes)`);
      
      // Check if file is readable
      try {
        if (file.endsWith('.txt')) {
          const content = await fs.readFile(filePath, 'utf-8');
          console.log(`  ✅ File is readable, first 50 chars: ${content.substring(0, 50)}...`);
        }
      } catch (readErr) {
        console.error(`  ❌ Could not read file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error checking data files:', error);
  }
}

checkDataFiles().catch(console.error);
