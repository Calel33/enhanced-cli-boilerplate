// Simple test script for Smithery integration
import axios from 'axios';

async function testSmitheryIntegration() {
  try {
    console.log('🧪 Testing Enhanced Smithery Integration...\n');
    
    // Test 1: Check if server is running
    console.log('1. Testing server health...');
    const healthResponse = await axios.get('http://localhost:8081/health');
    console.log('✅ Server is running:', healthResponse.data);
    
    // Test 2: List available tools
    console.log('\n2. Listing available tools...');
    const toolsResponse = await axios.post('http://localhost:8081/api/tools/list');
    const tools = toolsResponse.data.tools;
    console.log(`✅ Found ${tools.length} tools:`);
    
    // Group and display tools by source
    const localTools = tools.filter(t => !t.source || t.source === 'local');
    const smitheryTools = tools.filter(t => t.source === 'smithery');
    
    if (localTools.length > 0) {
      console.log('\n📦 Local Tools:');
      localTools.forEach(tool => {
        console.log(`   - ${tool.name}: ${tool.description}`);
      });
    }
    
    if (smitheryTools.length > 0) {
      console.log('\n🌐 Smithery Tools:');
      smitheryTools.forEach(tool => {
        console.log(`   - ${tool.name}: ${tool.description}`);
      });
    }
    
    // Test 3: Test Smithery tools if available
    if (smitheryTools.length > 0) {
      console.log('\n3. Testing Smithery tools...');
      
      // Test brave_web_search
      const braveWebTool = smitheryTools.find(t => t.name === 'brave_web_search');
      if (braveWebTool) {
        console.log('\n🔍 Testing brave_web_search...');
        try {
          const searchResponse = await axios.post('http://localhost:8081/api/tools/call', {
            name: 'brave_web_search',
            params: {
              query: 'Node.js latest features',
              count: 3
            }
          });
          
          if (searchResponse.data.success) {
            console.log('✅ Smithery brave_web_search successful!');
            console.log(`   Query: ${searchResponse.data.result.query}`);
            console.log(`   Results: ${searchResponse.data.result.results?.length || 0}`);
            console.log(`   Source: ${searchResponse.data.result.source}`);
          } else {
            console.log('❌ Smithery brave_web_search failed:', searchResponse.data.error);
          }
        } catch (error) {
          console.log('❌ Error testing brave_web_search:', error.response?.data?.error || error.message);
        }
      }
      
      // Test brave_local_search
      const braveLocalTool = smitheryTools.find(t => t.name === 'brave_local_search');
      if (braveLocalTool) {
        console.log('\n🏠 Testing brave_local_search...');
        try {
          const localSearchResponse = await axios.post('http://localhost:8081/api/tools/call', {
            name: 'brave_local_search',
            params: {
              query: 'coffee shops near me',
              count: 2
            }
          });
          
          if (localSearchResponse.data.success) {
            console.log('✅ Smithery brave_local_search successful!');
            console.log(`   Query: ${localSearchResponse.data.result.query}`);
            console.log(`   Results: ${localSearchResponse.data.result.results?.length || 0}`);
            console.log(`   Source: ${localSearchResponse.data.result.source}`);
          } else {
            console.log('❌ Smithery brave_local_search failed:', localSearchResponse.data.error);
          }
        } catch (error) {
          console.log('❌ Error testing brave_local_search:', error.response?.data?.error || error.message);
        }
      }
    } else {
      console.log('\n3. ⚠️  No Smithery tools found');
      console.log('   This could mean:');
      console.log('   - Smithery credentials not configured');
      console.log('   - Connection to Smithery failed');
      console.log('   - Check server logs for more details');
    }
    
    // Test 4: Test local tools
    console.log('\n4. Testing local tools...');
    const cryptoChatTool = localTools.find(t => t.name === 'crypto-chat');
    if (cryptoChatTool) {
      console.log('\n💬 Testing crypto-chat...');
      try {
        const chatResponse = await axios.post('http://localhost:8081/api/tools/call', {
          name: 'crypto-chat',
          params: {
            message: 'What is Bitcoin?'
          }
        });
        
        if (chatResponse.data.success) {
          console.log('✅ Crypto-chat successful!');
          console.log(`   Response length: ${chatResponse.data.result.response?.length || 0} characters`);
        } else {
          console.log('❌ Crypto-chat failed:', chatResponse.data.error);
        }
      } catch (error) {
        console.log('❌ Error testing crypto-chat:', error.response?.data?.error || error.message);
      }
    }
    
    console.log('\n🎉 Integration test completed!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Total tools: ${tools.length}`);
    console.log(`   - Local tools: ${localTools.length}`);
    console.log(`   - Smithery tools: ${smitheryTools.length}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testSmitheryIntegration(); 