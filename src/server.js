// ESM-compatible MCP server
import express from 'express';
import { HustleIncognitoClient } from 'hustle-incognito';
import dotenv from 'dotenv';
import axios from 'axios';
import { SmitheryClient } from './utils/smithery-client.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['HUSTLE_API_KEY', 'VAULT_ID'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error('Please create a .env file based on env.example');
  process.exit(1);
}

// Create Express app
const app = express();
app.use(express.json());

// Initialize the AgentHustle client
const client = new HustleIncognitoClient({
  apiKey: process.env.HUSTLE_API_KEY,
  debug: true
});

// Store the vault ID for use in API calls
const vaultId = process.env.VAULT_ID;

// Initialize Smithery client for Brave Search
const smitheryClient = new SmitheryClient({
  baseUrl: 'https://server.smithery.ai/@smithery-ai/brave-search',
  apiKey: process.env.SMITHERY_API_KEY || '9c441b5c-510a-41cd-a242-f77baa272f2c',
  profile: process.env.SMITHERY_PROFILE || 'glad-squid-LrsVYY'
});

// Initialize Smithery connection on startup
let smitheryConnected = false;
smitheryClient.initialize().then(success => {
  smitheryConnected = success;
  if (success) {
    console.log('✓ Smithery Brave Search integration ready');
  } else {
    console.log('⚠ Smithery connection failed, falling back to local tools');
  }
}).catch(error => {
  console.error('Error initializing Smithery:', error.message);
  smitheryConnected = false;
});

/**
 * Brave Search API client
 */
class BraveSearchClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.search.brave.com/res/v1';
  }

  /**
   * Search the web using Brave Search API
   * @param query Search query
   * @param options Search options
   * @returns Search results
   */
  async search(query, options = {}) {
    const params = {
      q: query,
      count: options.count || 10,
      offset: options.offset || 0,
      country: options.country || 'US',
      safesearch: options.safesearch || 'moderate'
    };

    try {
      const response = await axios.get(`${this.baseUrl}/web/search`, {
        params,
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error searching with Brave:', error);
      throw new Error(`Brave Search API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Define API endpoints
app.post('/api/tools/list', async (req, res) => {
  const tools = [
    {
      name: 'rugcheck',
      description: 'Perform a security analysis (rugcheck) on a specific token',
      parameters: {
        type: 'object',
        required: ['token'],
        properties: {
          token: {
            type: 'string',
            description: 'The token symbol or address to analyze'
          },
          chain: {
            type: 'string',
            description: 'The blockchain network (defaults to Solana)',
            default: 'solana'
          }
        }
      }
    },
    {
      name: 'trending-tokens',
      description: 'Get trending tokens on a specific blockchain',
      parameters: {
        type: 'object',
        properties: {
          chain: {
            type: 'string',
            description: 'The blockchain network (defaults to Solana)',
            default: 'solana'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of tokens to return',
            default: 10
          }
        }
      }
    },
    {
      name: 'wallet-balance',
      description: 'Check wallet balance for a specific address',
      parameters: {
        type: 'object',
        required: ['address'],
        properties: {
          address: {
            type: 'string',
            description: 'The wallet address to check'
          },
          chain: {
            type: 'string',
            description: 'The blockchain network (defaults to Solana)',
            default: 'solana'
          }
        }
      }
    },
    {
      name: 'crypto-chat',
      description: 'Chat with the AgentHustle AI about crypto and web3 topics',
      parameters: {
        type: 'object',
        required: ['message'],
        properties: {
          message: {
            type: 'string',
            description: 'The message to send to the crypto assistant'
          }
        }
      }
    }
  ];

  // Add Smithery Brave Search if connected
  if (smitheryConnected) {
    try {
      const smitheryTools = await smitheryClient.listTools();
      // Add Smithery tools to our tools list
      smitheryTools.forEach(tool => {
        tools.push({
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
          source: 'smithery' // Mark as Smithery tool for identification
        });
      });
      console.log(`✓ Added ${smitheryTools.length} Smithery tools to the list`);
    } catch (error) {
      console.error('Error fetching Smithery tools:', error.message);
    }
  }

  // Add local Brave Search tool if API key is provided (fallback)
  if (process.env.BRAVE_API_KEY && !smitheryConnected) {
    tools.push({
      name: 'brave-search',
      description: 'Search the web using Brave Search API',
      parameters: {
        type: 'object',
        required: ['query'],
        properties: {
          query: {
            type: 'string',
            description: 'The search query'
          },
          count: {
            type: 'number',
            description: 'Number of results to return (max 20)',
            default: 5
          },
          safesearch: {
            type: 'string',
            enum: ['strict', 'moderate', 'off'],
            description: 'SafeSearch filter level',
            default: 'moderate'
          }
        }
      },
      source: 'local' // Mark as local tool
    });
  }

  res.json({ tools });
});

app.post('/api/tools/call', async (req, res) => {
  const { name, params } = req.body;
  
  try {
    let result;

    switch (name) {
      case 'brave-search':
      case 'brave_web_search': // Handle Smithery tool name
        // Use Smithery if connected, otherwise fall back to local implementation
        if (smitheryConnected && name === 'brave_web_search') {
          console.log(`Executing Smithery Brave search for query: ${params.query}`);
          try {
            const smitheryResult = await smitheryClient.callTool('brave_web_search', params);
            
            // Parse the result from Smithery
            // Smithery returns results in content array with text
            let parsedResult;
            if (smitheryResult.content && smitheryResult.content[0] && smitheryResult.content[0].text) {
              try {
                parsedResult = JSON.parse(smitheryResult.content[0].text);
              } catch (parseError) {
                // If parsing fails, use the raw text
                parsedResult = { raw: smitheryResult.content[0].text };
              }
            } else {
              parsedResult = smitheryResult;
            }
            
            // Format the results consistently with your existing format
            result = {
              query: params.query,
              total: parsedResult.total || parsedResult.results?.length || 0,
              results: parsedResult.results || parsedResult.web?.results || [],
              source: 'smithery'
            };
          } catch (error) {
            console.error('Error in Smithery Brave search:', error);
            throw new Error(`Smithery Brave Search failed: ${error.message}`);
          }
        } else if (process.env.BRAVE_API_KEY) {
          // Fallback to local Brave Search implementation
          console.log(`Executing local Brave search for query: ${params.query}`);
          try {
            const braveClient = new BraveSearchClient(process.env.BRAVE_API_KEY);
            const searchResult = await braveClient.search(params.query, {
              count: params.count || 5,
              safesearch: params.safesearch || 'moderate'
            });
            
            // Format the results in a more usable way
            result = {
              query: params.query,
              total: searchResult.web?.total || 0,
              results: searchResult.web?.results?.map(r => ({
                title: r.title,
                description: r.description,
                url: r.url
              })) || [],
              source: 'local'
            };
          } catch (error) {
            console.error('Error in local Brave search:', error);
            throw new Error(`Local Brave Search failed: ${error.message}`);
          }
        } else {
          throw new Error('Brave Search not available - no Smithery connection and no local API key configured');
        }
        break;

      case 'brave_local_search': // Handle Smithery local search
        if (smitheryConnected) {
          console.log(`Executing Smithery local search for query: ${params.query}`);
          try {
            const smitheryResult = await smitheryClient.callTool('brave_local_search', params);
            
            // Parse the result from Smithery
            let parsedResult;
            if (smitheryResult.content && smitheryResult.content[0] && smitheryResult.content[0].text) {
              try {
                parsedResult = JSON.parse(smitheryResult.content[0].text);
              } catch (parseError) {
                parsedResult = { raw: smitheryResult.content[0].text };
              }
            } else {
              parsedResult = smitheryResult;
            }
            
            result = {
              query: params.query,
              total: parsedResult.total || parsedResult.results?.length || 0,
              results: parsedResult.results || [],
              source: 'smithery'
            };
          } catch (error) {
            console.error('Error in Smithery local search:', error);
            throw new Error(`Smithery Local Search failed: ${error.message}`);
          }
        } else {
          throw new Error('Smithery Local Search not available - no Smithery connection');
        }
        break;

      case 'rugcheck':
        console.log(`Executing rugcheck for token: ${params.token}`);
        const rugcheckResponse = await client.headlessChat(
          `Run a rugcheck for ${params.token}`, 
          {
            'rugcheck': async (p) => p
          },
          { vaultId }
        );
        result = rugcheckResponse.toolResults[0] || { error: 'No results from rugcheck' };
        break;

      case 'trending-tokens':
        console.log(`Fetching trending tokens on chain: ${params.chain || 'solana'}`);
        try {
          const trendingResponse = await client.headlessChat(
            `Show me trending tokens on ${params.chain || 'solana'}`, 
            {
              'birdeye-trending': async (p) => p
            },
            { vaultId }
          );
          result = trendingResponse.toolResults[0] || { 
            tokens: [],
            message: 'Unable to fetch trending tokens'
          };
        } catch (error) {
          console.error('Error in trending-tokens:', error);
          result = { 
            tokens: [],
            message: `Error: ${error.message}`
          };
        }
        break;

      case 'wallet-balance':
        console.log(`Checking wallet balance for: ${params.address}`);
        try {
          const balanceResponse = await client.headlessChat(
            `Check wallet balance for ${params.address}`, 
            {
              'wallet-balance': async (p) => p
            },
            { vaultId }
          );
          result = balanceResponse.toolResults[0] || { 
            address: params.address,
            balances: [],
            message: 'Unable to fetch wallet balance'
          };
        } catch (error) {
          console.error('Error in wallet-balance:', error);
          result = { 
            address: params.address,
            balances: [],
            message: `Error: ${error.message}`
          };
        }
        break;

      case 'crypto-chat':
        console.log(`Crypto chat: ${params.message}`);
        try {
          const chatResponse = await client.chat([
            { role: 'user', content: params.message }
          ], { vaultId });
          
          result = {
            response: chatResponse.content,
            toolsUsed: chatResponse.toolCalls ? chatResponse.toolCalls.map(tool => tool.name) : []
          };
        } catch (error) {
          console.error('Error in crypto-chat:', error);
          result = {
            response: `Sorry, I encountered an error: ${error.message}`,
            toolsUsed: []
          };
        }
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    res.json({ 
      success: true, 
      result,
      tool: name
    });
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message || `Failed to execute tool ${name}`,
      tool: name
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
const port = process.env.PORT || 8081;
app.listen(port, () => {
  console.log(`MCP Server running on port ${port}`);
  console.log('\nAvailable tools:');
  
  if (smitheryConnected) {
    console.log('- brave-search: Search the web using Smithery hosted Brave Search');
  } else if (process.env.BRAVE_API_KEY) {
    console.log('- brave-search: Search the web using local Brave Search API');
  }
  
  console.log('- rugcheck: Perform a security analysis on a specific token');
  console.log('- trending-tokens: Get trending tokens on a specific blockchain');
  console.log('- wallet-balance: Check wallet balance for a specific address');
  console.log('- crypto-chat: Chat with the AgentHustle AI about crypto and web3 topics');
  
  console.log(`\nSmithery Integration: ${smitheryConnected ? '✓ Connected' : '✗ Not connected'}`);
}); 