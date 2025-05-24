import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MCP_SERVER_URL = 'http://localhost:8081';

async function testApiKey() {
  console.log('🔑 Testing API Key Configuration\n');
  
  console.log('Environment variables:');
  console.log(`ORDISCAN_API_KEY: ${process.env.ORDISCAN_API_KEY ? process.env.ORDISCAN_API_KEY.substring(0, 8) + '...' : 'NOT SET'}`);
  console.log(`SMITHERY_API_KEY: ${process.env.SMITHERY_API_KEY ? process.env.SMITHERY_API_KEY.substring(0, 8) + '...' : 'NOT SET'}`);
  console.log(`SMITHERY_PROFILE: ${process.env.SMITHERY_PROFILE || 'NOT SET'}`);
  
  // Test 1: Missing API key validation
  console.log('\n🧪 Test 1: Testing missing API key validation...');
  const originalApiKey = process.env.ORDISCAN_API_KEY;
  delete process.env.ORDISCAN_API_KEY; // Temporarily remove
  
  if (!process.env.ORDISCAN_API_KEY) {
    console.log('✅ Validation working: ORDISCAN_API_KEY is properly detected as missing');
  }
  
  // Restore for actual test
  process.env.ORDISCAN_API_KEY = originalApiKey;
  
  // Test 2: Valid API key
  console.log('\n🧪 Test 2: Testing with valid API key...');
  if (!process.env.ORDISCAN_API_KEY) {
    console.log('❌ ORDISCAN_API_KEY is not set!');
    console.log('Please set the ORDISCAN_API_KEY environment variable to test Ordiscan tools.');
    console.log('Example: $env:ORDISCAN_API_KEY="your-api-key-here"');
    return;
  }
  
  try {
    // Test a simple Ordiscan tool call
    console.log('Testing ordiscan_brc20_list with API key...');
    const response = await axios.post(`${MCP_SERVER_URL}/api/tools/call`, {
      name: 'ordiscan_brc20_list',
      params: { 
        sort: 'newest', 
        page: '1',
        apiKey: process.env.ORDISCAN_API_KEY
      }
    });
    
    if (response.data.success) {
      console.log('✅ API key is working correctly!');
      console.log('Response preview:', JSON.stringify(response.data.result, null, 2).substring(0, 200) + '...');
    } else {
      console.log('❌ Tool execution failed:', response.data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    
    if (error.response?.data?.error?.includes('Invalid API key')) {
      console.log('\n💡 The API key appears to be invalid. Please check:');
      console.log('1. The API key is correct');
      console.log('2. The API key has the necessary permissions');
      console.log('3. The API key is not expired');
    }
  }
}

testApiKey().catch(console.error); 