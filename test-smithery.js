// Simple test script for Smithery integration
import axios from 'axios';

async function testSmitheryIntegration() {
  try {
    console.log('🧪 Testing Smithery Integration...\n');
    
    // Test 1: Check if server is running
    console.log('1. Testing server health...');
    const healthResponse = await axios.get('http://localhost:8081/health');
    console.log('✅ Server is running:', healthResponse.data);
    
    // Test 2: List available tools
    console.log('\n2. Listing available tools...');
    const toolsResponse = await axios.post('http://localhost:8081/api/tools/list');
    const tools = toolsResponse.data.tools;
    console.log(`✅ Found ${tools.length} tools:`);
    
    tools.forEach(tool => {
      const source = tool.source ? `(${tool.source})` : '(local)';
      console.log(`   - ${tool.name}: ${tool.description} ${source}`);
    });
    
    // Test 3: Test Smithery Brave Search
    const smitheryTools = tools.filter(t => t.source === 'smithery');
    if (smitheryTools.length > 0) {
      console.log('\n3. Testing Smithery Brave Search...');
      const searchResponse = await axios.post('http://localhost:8081/api/tools/call', {
        name: 'brave_web_search',
        params: {
          query: 'JavaScript news',
          count: 2
        }
      });
      
      if (searchResponse.data.success) {
        console.log('✅ Smithery search successful!');
        console.log(`   Query: ${searchResponse.data.result.query}`);
        console.log(`   Results: ${searchResponse.data.result.results?.length || 0}`);
        console.log(`   Source: ${searchResponse.data.result.source}`);
      } else {
        console.log('❌ Smithery search failed:', searchResponse.data.error);
      }
    } else {
      console.log('\n3. ⚠️  No Smithery tools found - connection may have failed');
    }
    
    console.log('\n🎉 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testSmitheryIntegration(); 