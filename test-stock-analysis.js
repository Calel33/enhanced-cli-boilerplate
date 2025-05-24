// Test script for Stock Analysis MCP integration
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:8081';

// Test configuration
const TEST_SYMBOL = 'AAPL'; // Apple Inc. - reliable for testing
const TEST_CASES = [
  {
    name: 'get-stock-data',
    description: 'Get real-time stock market data',
    params: {
      symbol: TEST_SYMBOL
    }
  },
  {
    name: 'get-stock-alerts',
    description: 'Generate stock alerts based on price movements',
    params: {
      symbol: TEST_SYMBOL,
      threshold: 5.0 // 5% price change threshold
    }
  },
  {
    name: 'get-daily-stock-data',
    description: 'Get daily historical stock data',
    params: {
      symbol: TEST_SYMBOL,
      days: 30 // Last 30 days
    }
  }
];

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testStockAnalysisTools() {
  log('blue', '🧪 Testing Stock Analysis MCP Integration');
  log('blue', '==========================================\n');

  // Check if Alpha Vantage API key is configured
  if (!process.env.ALPHA_VANTAGE_API_KEY) {
    log('red', '❌ ALPHA_VANTAGE_API_KEY not configured in .env file');
    log('yellow', '   Please add your Alpha Vantage API key to test stock analysis tools');
    log('yellow', '   Get a free API key at: https://www.alphavantage.co/support/#api-key\n');
    return;
  }

  log('green', `✓ Alpha Vantage API key configured: ${process.env.ALPHA_VANTAGE_API_KEY.substring(0, 8)}...\n`);

  // Test server connection
  try {
    log('cyan', '🔌 Testing MCP server connection...');
    const healthResponse = await axios.get(`${MCP_SERVER_URL}/health`);
    if (healthResponse.data.status === 'ok') {
      log('green', '✓ MCP server is running\n');
    }
  } catch (error) {
    log('red', '❌ Cannot connect to MCP server');
    log('red', `   Make sure the server is running on ${MCP_SERVER_URL}`);
    log('yellow', '   Run: npm run server\n');
    return;
  }

  // Test tools list endpoint
  try {
    log('cyan', '📋 Fetching available tools...');
    const toolsResponse = await axios.post(`${MCP_SERVER_URL}/api/tools/list`);
    const stockTools = toolsResponse.data.tools.filter(t => t.source === 'stock-analysis');
    
    if (stockTools.length > 0) {
      log('green', `✓ Found ${stockTools.length} stock analysis tools:`);
      stockTools.forEach(tool => {
        log('green', `  - ${tool.name}: ${tool.description}`);
      });
      console.log();
    } else {
      log('yellow', '⚠ No stock analysis tools found in tools list');
      log('yellow', '  This might indicate a connection issue with the Stock Analysis MCP server\n');
    }
  } catch (error) {
    log('red', '❌ Error fetching tools list:', error.message);
    return;
  }

  // Test each stock analysis tool
  let successCount = 0;
  let totalTests = TEST_CASES.length;

  for (const testCase of TEST_CASES) {
    log('cyan', `🔧 Testing ${testCase.name}...`);
    log('blue', `   Description: ${testCase.description}`);
    log('blue', `   Parameters: ${JSON.stringify(testCase.params, null, 2)}`);

    try {
      const startTime = Date.now();
      const response = await axios.post(`${MCP_SERVER_URL}/api/tools/call`, {
        name: testCase.name,
        params: testCase.params
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (response.data.success) {
        log('green', `✅ ${testCase.name} succeeded (${duration}ms)`);
        
        // Show result summary
        const result = response.data.result;
        if (result.symbol) {
          log('green', `   Symbol: ${result.symbol}`);
        }
        if (result.data) {
          if (typeof result.data === 'object' && result.data !== null) {
            const dataKeys = Object.keys(result.data);
            log('green', `   Data fields: ${dataKeys.slice(0, 5).join(', ')}${dataKeys.length > 5 ? '...' : ''}`);
          } else {
            log('green', `   Data: ${String(result.data).substring(0, 100)}...`);
          }
        }
        if (result.alerts && Array.isArray(result.alerts)) {
          log('green', `   Alerts: ${result.alerts.length} alerts generated`);
        }
        
        successCount++;
      } else {
        log('red', `❌ ${testCase.name} failed: ${response.data.error}`);
      }
    } catch (error) {
      log('red', `❌ ${testCase.name} error: ${error.message}`);
      if (error.response && error.response.data) {
        log('red', `   Server response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    
    console.log(); // Add spacing between tests
  }

  // Test summary
  log('blue', '📊 Test Summary');
  log('blue', '===============');
  log('green', `✅ Successful tests: ${successCount}/${totalTests}`);
  log('red', `❌ Failed tests: ${totalTests - successCount}/${totalTests}`);
  
  if (successCount === totalTests) {
    log('green', '\n🎉 All stock analysis tools are working correctly!');
    log('green', '   You can now use these tools in your CLI with commands like:');
    log('cyan', '   - "What is the current stock price of AAPL?"');
    log('cyan', '   - "Get me daily stock data for Tesla"');
    log('cyan', '   - "Set up stock alerts for Microsoft"');
  } else {
    log('yellow', '\n⚠ Some tests failed. Check the error messages above.');
    log('yellow', '  Common issues:');
    log('yellow', '  - Invalid Alpha Vantage API key');
    log('yellow', '  - API rate limits exceeded');
    log('yellow', '  - Network connectivity issues');
    log('yellow', '  - Smithery server unavailable');
  }
}

// Test with different naming conventions
async function testNamingConventions() {
  log('blue', '\n🔤 Testing Tool Name Conventions');
  log('blue', '=================================\n');

  const namingTests = [
    { name: 'get-stock-data', format: 'hyphen' },
    { name: 'get_stock_data', format: 'underscore' }
  ];

  for (const test of namingTests) {
    log('cyan', `Testing ${test.format} format: ${test.name}`);
    
    try {
      const response = await axios.post(`${MCP_SERVER_URL}/api/tools/call`, {
        name: test.name,
        params: { symbol: 'MSFT' }
      });
      
      if (response.data.success) {
        log('green', `✅ ${test.format} format works`);
      } else {
        log('red', `❌ ${test.format} format failed: ${response.data.error}`);
      }
    } catch (error) {
      log('red', `❌ ${test.format} format error: ${error.message}`);
    }
  }
}

// Main test execution
async function main() {
  try {
    await testStockAnalysisTools();
    await testNamingConventions();
  } catch (error) {
    log('red', `\n💥 Test execution failed: ${error.message}`);
    process.exit(1);
  }
}

// Run tests
main(); 