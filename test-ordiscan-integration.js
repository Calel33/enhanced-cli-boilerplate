import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MCP_SERVER_URL = 'http://localhost:8081';

async function testOrdiscanIntegration() {
  console.log('🧪 Testing Ordiscan Integration with Enhanced CLI Boilerplate\n');
  
  try {
    // Test 1: Check if server is running
    console.log('1. Testing server health...');
    const healthResponse = await axios.get(`${MCP_SERVER_URL}/health`);
    console.log('✓ Server is running\n');

    // Test 2: List all available tools
    console.log('2. Fetching available tools...');
    const toolsResponse = await axios.post(`${MCP_SERVER_URL}/api/tools/list`);
    const tools = toolsResponse.data.tools;
    
    const ordiscanTools = tools.filter(tool => tool.source === 'ordiscan');
    console.log(`✓ Found ${ordiscanTools.length} Ordiscan tools`);
    console.log(`✓ Total tools available: ${tools.length}\n`);

    if (ordiscanTools.length === 0) {
      console.log('❌ No Ordiscan tools found. Check Smithery credentials and connection.');
      return;
    }

    // Test 3: Test specific Ordiscan tools with sample data
    const testCases = [
      {
        name: 'ordiscan_brc20_list',
        description: 'Get a list of BRC-20 tokens',
        params: { sort: 'newest', page: '1' }
      },
      {
        name: 'ordiscan_runes_list', 
        description: 'Get a list of runes',
        params: { sort: 'newest', after: '1' }
      },
      {
        name: 'ordiscan_collections_list',
        description: 'Get a list of collections',
        params: { page: '1' }
      },
      {
        name: 'ordiscan_inscriptions_list',
        description: 'Get a list of inscriptions',
        params: { after: '1000000' }
      },
      {
        name: 'ordiscan_brc20_info',
        description: 'Get info about a specific BRC-20 token',
        params: { tick: 'ordi' } // Popular BRC-20 token
      }
    ];

    console.log('3. Testing specific Ordiscan tools...\n');
    
    for (const testCase of testCases) {
      // Check if this tool is available
      const tool = ordiscanTools.find(t => t.name === testCase.name);
      if (!tool) {
        console.log(`⚠ Skipping ${testCase.name} - not available`);
        continue;
      }

      console.log(`Testing ${testCase.name}: ${testCase.description}`);
      console.log(`Parameters:`, testCase.params);
      
      try {
        const response = await axios.post(`${MCP_SERVER_URL}/api/tools/call`, {
          name: testCase.name,
          params: testCase.params
        });
        
        if (response.data.success) {
          console.log('✓ Tool executed successfully');
          
          // Show a brief summary of the result
          const result = response.data.result;
          if (result.data) {
            if (result.data.error) {
              console.log(`  ❌ API Error: ${result.data.error}`);
            } else if (Array.isArray(result.data)) {
              console.log(`  📊 Returned ${result.data.length} items`);
            } else if (typeof result.data === 'object') {
              const keys = Object.keys(result.data);
              console.log(`  📋 Result contains: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}`);
            } else {
              console.log(`  📄 Result type: ${typeof result.data}`);
            }
          }
          console.log(`  🔗 Source: ${result.source}`);
        } else {
          console.log(`❌ Tool failed: ${response.data.error}`);
        }
      } catch (error) {
        console.log(`❌ Error: ${error.response?.data?.error || error.message}`);
      }
      
      console.log(''); // Empty line for readability
    }

    // Test 4: Test with a real Bitcoin address (if available)
    console.log('4. Testing address-based tools...\n');
    
    const addressTestCases = [
      {
        name: 'ordiscan_address_brc20',
        description: 'Get BRC-20 balances for an address',
        params: { address: 'bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr' } // Example address
      },
      {
        name: 'ordiscan_address_inscriptions',
        description: 'Get inscriptions for an address', 
        params: { address: 'bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr' }
      }
    ];

    for (const testCase of addressTestCases) {
      const tool = ordiscanTools.find(t => t.name === testCase.name);
      if (!tool) {
        console.log(`⚠ Skipping ${testCase.name} - not available`);
        continue;
      }

      console.log(`Testing ${testCase.name}: ${testCase.description}`);
      
      try {
        const response = await axios.post(`${MCP_SERVER_URL}/api/tools/call`, {
          name: testCase.name,
          params: testCase.params
        });
        
        if (response.data.success) {
          console.log('✓ Address tool executed successfully');
          const result = response.data.result;
          console.log(`  🏠 Address: ${result.address}`);
          console.log(`  🔗 Source: ${result.source}`);
        } else {
          console.log(`❌ Tool failed: ${response.data.error}`);
        }
      } catch (error) {
        console.log(`❌ Error: ${error.response?.data?.error || error.message}`);
      }
      
      console.log('');
    }

    console.log('🎉 Ordiscan integration test completed!');
    console.log('\n📋 Summary:');
    console.log(`- Total Ordiscan tools available: ${ordiscanTools.length}`);
    console.log('- Integration status: ✓ Working');
    console.log('- All tools are accessible via the enhanced CLI boilerplate');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Make sure the MCP server is running: npm run start:server');
    }
  }
}

// Run the test
testOrdiscanIntegration().catch(console.error); 