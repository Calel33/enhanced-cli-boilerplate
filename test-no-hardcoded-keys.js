import axios from 'axios';
import fs from 'fs';
import path from 'path';

const MCP_SERVER_URL = 'http://localhost:8081';

async function testNoHardcodedKeys() {
  console.log('🔒 Testing: No Hardcoded API Keys\n');
  
  // Test 1: Check source files for hardcoded keys
  console.log('🔍 Test 1: Scanning source files for hardcoded API keys...');
  
  const filesToCheck = [
    'src/server.js',
    'test-ordiscan.js',
    'test-api-key.js'
  ];
  
  const suspiciousPatterns = [
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, // UUID pattern
    /[0-9a-f]{32,}/gi, // Long hex strings
    /sk_[a-zA-Z0-9]{32,}/gi, // API key patterns
    /pk_[a-zA-Z0-9]{32,}/gi
  ];
  
  let foundHardcodedKeys = false;
  
  for (const file of filesToCheck) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      for (const pattern of suspiciousPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          // Filter out environment variable references and placeholders
          const realMatches = matches.filter(match => 
            !content.includes(`process.env.`) &&
            !match.includes('your-') &&
            !match.includes('example') &&
            match.length > 20 // Only flag longer strings
          );
          
          if (realMatches.length > 0) {
            console.log(`❌ Found potential hardcoded key in ${file}: ${realMatches[0].substring(0, 8)}...`);
            foundHardcodedKeys = true;
          }
        }
      }
    } catch (error) {
      console.log(`⚠ Could not read ${file}: ${error.message}`);
    }
  }
  
  if (!foundHardcodedKeys) {
    console.log('✅ No hardcoded API keys found in source files');
  }
  
  // Test 2: Check env.example for placeholders only
  console.log('\n🔍 Test 2: Checking env.example for proper placeholders...');
  
  try {
    const envExample = fs.readFileSync('env.example', 'utf8');
    const hasPlaceholders = envExample.includes('your-api-key-here') || 
                           envExample.includes('your-ordiscan-api-key-here');
    const hasRealKeys = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(envExample);
    
    if (hasPlaceholders && !hasRealKeys) {
      console.log('✅ env.example contains only placeholders, no real API keys');
    } else if (hasRealKeys) {
      console.log('❌ env.example contains what appears to be real API keys');
    } else {
      console.log('⚠ env.example format may need review');
    }
  } catch (error) {
    console.log(`⚠ Could not read env.example: ${error.message}`);
  }
  
  // Test 3: Test server behavior without API keys
  console.log('\n🔍 Test 3: Testing server behavior without API keys...');
  
  try {
    // Clear environment variables for this test
    const originalKeys = {
      ORDISCAN_API_KEY: process.env.ORDISCAN_API_KEY,
      SMITHERY_API_KEY: process.env.SMITHERY_API_KEY,
      SMITHERY_PROFILE: process.env.SMITHERY_PROFILE
    };
    
    delete process.env.ORDISCAN_API_KEY;
    delete process.env.SMITHERY_API_KEY;
    delete process.env.SMITHERY_PROFILE;
    
    // Test Ordiscan tool call without API key
    const response = await axios.post(`${MCP_SERVER_URL}/api/tools/call`, {
      name: 'ordiscan_brc20_list',
      params: { 
        sort: 'newest', 
        page: '1'
      }
    });
    
    // Restore environment variables
    Object.assign(process.env, originalKeys);
    
    if (response.data.success === false && 
        response.data.error.includes('ORDISCAN_API_KEY')) {
      console.log('✅ Server properly rejects requests without API key');
    } else {
      console.log('❌ Server may be using hardcoded API key as fallback');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    if (error.response?.data?.error?.includes('ORDISCAN_API_KEY')) {
      console.log('✅ Server properly rejects requests without API key');
    } else {
      console.log('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
  
  console.log('\n🎯 Summary:');
  console.log('- All API keys must be provided via environment variables');
  console.log('- No hardcoded fallback keys should exist in the codebase');
  console.log('- env.example should contain only placeholder values');
  console.log('- Server should gracefully handle missing API keys');
}

testNoHardcodedKeys().catch(console.error); 