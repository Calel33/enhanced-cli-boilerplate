// ESM-compatible MCP server
import express from 'express';
import { HustleIncognitoClient } from 'hustle-incognito';
import dotenv from 'dotenv';
import axios from 'axios';

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

// Initialize the AgnetHustle client
const client = new HustleIncognitoClient({
  apiKey: process.env.HUSTLE_API_KEY,
  debug: true
});

// Store the vault ID for use in API calls
const vaultId = process.env.VAULT_ID;

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
app.post('/api/tools/list', (req, res) => {
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

  // Add Brave Search tool if API key is provided
  if (process.env.BRAVE_API_KEY) {
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
      }
    });
  }

  res.json({ tools });
});

app.post('/api/tools/call', async (req, res) => {
  const { name, params } = req.body;
  
  try {
    let result;

    switch (name) {
      case 'rugcheck':
        console.log(`Executing rugcheck for token: ${params.token}`);
        try {
          const rugcheckResponse = await client.headlessChat(
            `Run a rugcheck for ${params.token}`, 
            {
              'rugcheck': async (p) => p
            },
            { vaultId }
          );
          result = rugcheckResponse.toolResults[0] || { 
            token: params.token,
            score: 0,
            risk: 'unknown',
            message: 'Unable to perform rugcheck'
          };
        } catch (error) {
          console.error('Error in rugcheck:', error);
          result = { 
            token: params.token,
            score: 0,
            risk: 'error',
            message: `Error: ${error.message}`
          };
        }
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

      case 'brave-search':
        if (!process.env.BRAVE_API_KEY) {
          throw new Error('Brave Search API key not configured');
        }
        console.log(`Executing Brave search: ${params.query}`);
        try {
          const braveClient = new BraveSearchClient(process.env.BRAVE_API_KEY);
          result = await braveClient.search(params.query, params);
        } catch (error) {
          console.error('Error in brave-search:', error);
          result = {
            error: `Search failed: ${error.message}`
          };
        }
        break;

      default:
        return res.status(404).json({ error: `Tool "${name}" not found` });
    }

    res.json(result);
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    res.status(500).json({ error: error.message });
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
  if (process.env.BRAVE_API_KEY) {
    console.log('- brave-search: Search the web using Brave Search API');
  }
  console.log('- rugcheck: Perform a security analysis on a specific token');
  console.log('- trending-tokens: Get trending tokens on a specific blockchain');
  console.log('- wallet-balance: Check wallet balance for a specific address');
  console.log('- crypto-chat: Chat with the AgnetHustle AI about crypto and web3 topics');
}); 