// Test script to verify the improved tool flow with raw response display
import axios from 'axios';
import chalk from 'chalk';

const MCP_SERVER_URL = 'http://localhost:8081';

async function testImprovedFlow() {
  console.log(chalk.blue('🧪 Testing Improved Tool Flow with Raw Response Display\n'));
  
  try {
    // Test 1: Get available tools
    console.log(chalk.yellow('1. Fetching available tools...'));
    const toolsResponse = await axios.post(`${MCP_SERVER_URL}/api/tools/list`);
    
    if (toolsResponse.data && toolsResponse.data.tools) {
      const tools = toolsResponse.data.tools;
      console.log(chalk.green(`✅ Found ${tools.length} available tools`));
      
      // Find a test tool (prefer Brave Search if available)
      const testTool = tools.find(t => t.name === 'brave_web_search') || 
                      tools.find(t => t.name.includes('ordiscan')) ||
                      tools.find(t => t.name.includes('stock')) ||
                      tools[0];
      
      if (testTool) {
        console.log(chalk.cyan(`📋 Testing with tool: ${testTool.name} (${testTool.source || 'unknown source'})`));
        
        // Test 2: Execute the tool
        console.log(chalk.yellow('\n2. Executing tool...'));
        
        let testParams = {};
        if (testTool.name === 'brave_web_search') {
          testParams = { query: 'test search', count: 3 };
        } else if (testTool.name.includes('ordiscan')) {
          // Use minimal params for Ordiscan tools
          if (testTool.name.includes('list')) {
            testParams = { page: '1' };
          } else if (testTool.name.includes('rune')) {
            testParams = { name: 'UNCOMMON•GOODS' };
          }
        } else if (testTool.name.includes('stock')) {
          testParams = { symbol: 'AAPL' };
        }
        
        try {
          const toolResponse = await axios.post(`${MCP_SERVER_URL}/api/tools/call`, {
            name: testTool.name,
            params: testParams
          });
          
          if (toolResponse.data && toolResponse.data.success) {
            console.log(chalk.green('✅ Tool executed successfully'));
            
            // Simulate the improved flow display
            console.log(chalk.white('\n📋 Tool Response Data:'));
            console.log(chalk.gray('─'.repeat(50)));
            
            try {
              const formattedResult = JSON.stringify(toolResponse.data.result, null, 2);
              
              if (formattedResult.length > 500) {
                const truncated = formattedResult.substring(0, 500);
                console.log(chalk.white(truncated));
                console.log(chalk.yellow('\n... (response truncated for test display)'));
                console.log(chalk.gray(`Full response: ${formattedResult.length} characters`));
              } else {
                console.log(chalk.white(formattedResult));
              }
            } catch (jsonError) {
              console.log(chalk.white(String(toolResponse.data.result)));
            }
            
            console.log(chalk.gray('─'.repeat(50)));
            
            console.log(chalk.green('\n✅ Improved flow test completed successfully!'));
            console.log(chalk.cyan('🎉 Users will now see the raw tool response data before AI summarization'));
            
          } else {
            console.log(chalk.red(`❌ Tool execution failed: ${toolResponse.data?.error || 'Unknown error'}`));
            console.log(chalk.yellow('This is expected for some tools without proper API keys'));
          }
          
        } catch (toolError) {
          console.log(chalk.red(`❌ Tool execution error: ${toolError.message}`));
          console.log(chalk.yellow('This is expected for some tools without proper configuration'));
        }
        
      } else {
        console.log(chalk.red('❌ No suitable test tool found'));
      }
      
    } else {
      console.log(chalk.red('❌ Failed to fetch tools list'));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error.message);
  }
}

// Run the test
testImprovedFlow(); 