import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createTransport } from '@smithery/sdk/client/transport.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testOrdiscanTools() {
  console.log('🔍 Testing Ordiscan MCP tools...\n');
  
  try {
    // Create transport for Ordiscan MCP server
    const transport = createTransport(`https://server.smithery.ai/@Calel33/ordiscan-mcp-v1/mcp?api_key=${process.env.ORDISCAN_API_KEY}`, {
      apiKey: process.env.SMITHERY_API_KEY,
      profile: process.env.SMITHERY_PROFILE
    });

    // Create MCP client
    const client = new Client({
      name: 'ordiscan-test-client',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    // Connect to the transport
    await client.connect(transport);
    console.log('✓ Connected to Ordiscan MCP server');

    // List available tools
    const toolsResult = await client.listTools();
    console.log('\n📋 Available Ordiscan tools:');
    console.log('='.repeat(50));
    
    toolsResult.tools.forEach((tool, index) => {
      console.log(`\n${index + 1}. ${tool.name}`);
      console.log(`   Description: ${tool.description}`);
      console.log(`   Input Schema:`, JSON.stringify(tool.inputSchema, null, 2));
    });

    // Test a tool call if tools are available
    if (toolsResult.tools.length > 0) {
      const firstTool = toolsResult.tools[0];
      console.log(`\n🧪 Testing ${firstTool.name} tool...`);
      
      // Create test parameters based on the tool's schema
      let testParams = {};
      if (firstTool.inputSchema && firstTool.inputSchema.properties) {
        const props = firstTool.inputSchema.properties;
        
        // Try to create reasonable test parameters
        for (const [key, prop] of Object.entries(props)) {
          if (prop.type === 'string') {
            if (key.toLowerCase().includes('address') || key.toLowerCase().includes('inscription')) {
              testParams[key] = 'bc1p...'; // Example Bitcoin address format
            } else if (key.toLowerCase().includes('id')) {
              testParams[key] = '12345';
            } else {
              testParams[key] = 'test';
            }
          } else if (prop.type === 'number') {
            testParams[key] = 1;
          } else if (prop.type === 'boolean') {
            testParams[key] = true;
          }
        }
      }
      
      console.log(`   Test parameters:`, testParams);
      
      try {
        const result = await client.callTool({
          name: firstTool.name,
          arguments: testParams
        });
        
        console.log(`   ✓ Tool executed successfully`);
        console.log(`   Result:`, JSON.stringify(result, null, 2));
      } catch (toolError) {
        console.log(`   ⚠ Tool execution failed: ${toolError.message}`);
        console.log(`   This is expected if test parameters are invalid`);
      }
    }

    // Clean up
    await client.close();
    console.log('\n✓ Test completed successfully');

  } catch (error) {
    console.error('❌ Error testing Ordiscan tools:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testOrdiscanTools().catch(console.error); 