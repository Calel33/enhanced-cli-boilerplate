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

// Warn about missing optional API keys
function checkOptionalApiKeys() {
  const warnings = [];
  
  if (!process.env.SMITHERY_API_KEY || !process.env.SMITHERY_PROFILE) {
    warnings.push('⚠ Smithery credentials not configured - hosted tools will be unavailable');
  }
  
  if (!process.env.ORDISCAN_API_KEY) {
    warnings.push('⚠ ORDISCAN_API_KEY not configured - Bitcoin ordinals tools will be unavailable');
  }
  
  if (!process.env.BRAVE_API_KEY) {
    warnings.push('⚠ BRAVE_API_KEY not configured - local search fallback will be unavailable');
  }
  
  if (warnings.length > 0) {
    console.log('\n' + warnings.join('\n'));
    console.log('\nTo enable all features, please configure the missing API keys in your .env file\n');
  }
}

checkOptionalApiKeys();

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
  apiKey: process.env.SMITHERY_API_KEY,
  profile: process.env.SMITHERY_PROFILE
});

// Initialize Smithery client for Ordiscan (only if API key is available)
let ordiscanClient = null;
if (process.env.ORDISCAN_API_KEY) {
  ordiscanClient = new SmitheryClient({
    baseUrl: `https://server.smithery.ai/@Calel33/ordiscan-mcp-v1/mcp?api_key=${process.env.ORDISCAN_API_KEY}`,
    apiKey: process.env.SMITHERY_API_KEY,
    profile: process.env.SMITHERY_PROFILE
  });
}

// Initialize Smithery connections on startup
let smitheryConnected = false;
let ordiscanConnected = false;

async function initializeSmithery() {
  if (!process.env.SMITHERY_API_KEY || !process.env.SMITHERY_PROFILE) {
    console.log('⚠ Smithery credentials not configured, skipping Smithery integration');
    return false;
  }

  try {
    const success = await smitheryClient.initialize();
    smitheryConnected = success;
    if (success) {
      console.log('✓ Smithery Brave Search integration ready');
    } else {
      console.log('⚠ Smithery connection failed, falling back to local tools');
    }
    return success;
  } catch (error) {
    console.error('Error initializing Smithery:', error.message);
    smitheryConnected = false;
    return false;
  }
}

async function initializeOrdiscan() {
  if (!process.env.SMITHERY_API_KEY || !process.env.SMITHERY_PROFILE) {
    console.log('⚠ Smithery credentials not configured, skipping Ordiscan integration');
    return false;
  }

  if (!process.env.ORDISCAN_API_KEY) {
    console.log('⚠ ORDISCAN_API_KEY not configured, skipping Ordiscan integration');
    console.log('  Please set ORDISCAN_API_KEY in your .env file to use Ordiscan tools');
    return false;
  }

  if (!ordiscanClient) {
    console.log('⚠ Ordiscan client not initialized, skipping Ordiscan integration');
    return false;
  }

  try {
    const success = await ordiscanClient.initialize();
    ordiscanConnected = success;
    if (success) {
      console.log('✓ Ordiscan MCP integration ready');
    } else {
      console.log('⚠ Ordiscan connection failed');
    }
    return success;
  } catch (error) {
    console.error('Error initializing Ordiscan:', error.message);
    ordiscanConnected = false;
    return false;
  }
}

// Initialize on startup - await the results
await initializeSmithery();
await initializeOrdiscan();

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
  if (smitheryConnected && smitheryClient.isAvailable()) {
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
      // Try to reconnect for next time
      smitheryConnected = false;
      console.log('⚠ Marking Smithery as disconnected, will attempt reconnection on next tool call');
    }
  }

  // Add Ordiscan tools if connected
  if (ordiscanConnected && ordiscanClient.isAvailable()) {
    try {
      const ordiscanTools = await ordiscanClient.listTools();
      // Add Ordiscan tools to our tools list
      ordiscanTools.forEach(tool => {
        tools.push({
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
          source: 'ordiscan' // Mark as Ordiscan tool for identification
        });
      });
      console.log(`✓ Added ${ordiscanTools.length} Ordiscan tools to the list`);
    } catch (error) {
      console.error('Error fetching Ordiscan tools:', error.message);
      // Try to reconnect for next time
      ordiscanConnected = false;
      console.log('⚠ Marking Ordiscan as disconnected, will attempt reconnection on next tool call');
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
        if ((smitheryConnected || await initializeSmithery()) && name === 'brave_web_search') {
          console.log(`Executing Smithery Brave search for query: ${params.query}`);
          try {
            const smitheryResult = await smitheryClient.callTool('brave_web_search', params);
            
            // Parse the result from Smithery
            // Smithery returns results as formatted text, not JSON
            let parsedResults = [];
            if (smitheryResult.content && smitheryResult.content[0] && smitheryResult.content[0].text) {
              const text = smitheryResult.content[0].text;
              
              // Parse the text format: Title: ... Description: ... URL: ...
              const resultBlocks = text.split('\n\n').filter(block => block.trim());
              
              for (const block of resultBlocks) {
                const lines = block.split('\n');
                let title = '', description = '', url = '';
                
                for (const line of lines) {
                  if (line.startsWith('Title: ')) {
                    title = line.substring(7).trim();
                  } else if (line.startsWith('Description: ')) {
                    description = line.substring(13).trim();
                    // Remove HTML tags and decode entities
                    description = description
                      .replace(/<[^>]*>/g, '') // Remove HTML tags
                      .replace(/&quot;/g, '"')
                      .replace(/&#x27;/g, "'")
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>')
                      .replace(/&amp;/g, '&');
                  } else if (line.startsWith('URL: ')) {
                    url = line.substring(5).trim();
                  }
                }
                
                if (title && url) {
                  parsedResults.push({ title, description, url });
                }
              }
            }
            
            // Format the results consistently
            result = {
              query: params.query,
              total: parsedResults.length,
              results: parsedResults,
              source: 'smithery'
            };
          } catch (error) {
            console.error('Error in Smithery Brave search:', error);
            smitheryConnected = false; // Mark as disconnected
            
            // Try local fallback if available
            if (process.env.BRAVE_API_KEY) {
              console.log('Falling back to local Brave Search...');
              const braveClient = new BraveSearchClient(process.env.BRAVE_API_KEY);
              const searchResult = await braveClient.search(params.query, {
                count: params.count || 5,
                safesearch: params.safesearch || 'moderate'
              });
              
              result = {
                query: params.query,
                total: searchResult.web?.total || 0,
                results: searchResult.web?.results?.map(r => ({
                  title: r.title,
                  description: r.description,
                  url: r.url
                })) || [],
                source: 'local-fallback'
              };
            } else {
              throw new Error(`Smithery Brave Search failed and no local API key available: ${error.message}`);
            }
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
        if (smitheryConnected || await initializeSmithery()) {
          console.log(`Executing Smithery local search for query: ${params.query}`);
          try {
            const smitheryResult = await smitheryClient.callTool('brave_local_search', params);
            
            // Parse the result from Smithery
            // Smithery returns results as formatted text, not JSON
            let parsedResults = [];
            if (smitheryResult.content && smitheryResult.content[0] && smitheryResult.content[0].text) {
              const text = smitheryResult.content[0].text;
              
              // Parse the text format: Title: ... Description: ... URL: ...
              const resultBlocks = text.split('\n\n').filter(block => block.trim());
              
              for (const block of resultBlocks) {
                const lines = block.split('\n');
                let title = '', description = '', url = '';
                
                for (const line of lines) {
                  if (line.startsWith('Title: ')) {
                    title = line.substring(7).trim();
                  } else if (line.startsWith('Description: ')) {
                    description = line.substring(13).trim();
                    // Remove HTML tags and decode entities
                    description = description
                      .replace(/<[^>]*>/g, '') // Remove HTML tags
                      .replace(/&quot;/g, '"')
                      .replace(/&#x27;/g, "'")
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>')
                      .replace(/&amp;/g, '&');
                  } else if (line.startsWith('URL: ')) {
                    url = line.substring(5).trim();
                  }
                }
                
                if (title && url) {
                  parsedResults.push({ title, description, url });
                }
              }
            }
            
            result = {
              query: params.query,
              total: parsedResults.length,
              results: parsedResults,
              source: 'smithery'
            };
          } catch (error) {
            console.error('Error in Smithery local search:', error);
            smitheryConnected = false; // Mark as disconnected
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

      // Ordiscan tools - Handle all 29 Ordiscan MCP tools
      case 'ordiscan_address_brc20_activity':
      case 'ordiscan_address_brc20':
      case 'ordiscan_brc20_info':
      case 'ordiscan_brc20_list':
      case 'ordiscan_collection_info':
      case 'ordiscan_collection_inscriptions':
      case 'ordiscan_collections_list':
      case 'ordiscan_inscription_info':
      case 'ordiscan_inscription_traits':
      case 'ordiscan_inscription_transfers':
      case 'ordiscan_inscriptions_activity':
      case 'ordiscan_inscriptions_detail':
      case 'ordiscan_inscriptions_list':
      case 'ordiscan_address_inscriptions':
      case 'ordiscan_address_rare_sats':
      case 'ordiscan_rune_market':
      case 'ordiscan_rune_name_unlock':
      case 'ordiscan_runes_activity':
      case 'ordiscan_address_runes':
      case 'ordiscan_runes_list':
      case 'ordiscan_sat_info':
      case 'ordiscan_tx_info':
      case 'ordiscan_tx_inscription_transfers':
      case 'ordiscan_tx_inscriptions':
      case 'ordiscan_tx_runes':
      case 'ordiscan_utxo_rare_sats':
      case 'ordiscan_utxo_sat_ranges':
      case 'ordiscan_address_utxos':
      case 'ordiscan_main':
        if (ordiscanConnected || await initializeOrdiscan()) {
          console.log(`Executing Ordiscan ${name} with params:`, params);
          try {
            // Add API key to params if available
            const ordiscanParams = { ...params };
            if (process.env.ORDISCAN_API_KEY) {
              ordiscanParams.apiKey = process.env.ORDISCAN_API_KEY;
              console.log(`✓ Adding API key to Ordiscan request: ${process.env.ORDISCAN_API_KEY.substring(0, 8)}...`);
            } else {
              throw new Error('ORDISCAN_API_KEY environment variable is required but not set');
            }
            
            const ordiscanResult = await ordiscanClient.callTool(name, ordiscanParams);
            
            // Parse the result from Ordiscan
            // Reason: Ordiscan returns structured data, usually as JSON text
            let parsedData = {};
            if (ordiscanResult.content && ordiscanResult.content[0] && ordiscanResult.content[0].text) {
              const text = ordiscanResult.content[0].text;
              try {
                // Try to parse as JSON first
                parsedData = JSON.parse(text);
              } catch (jsonError) {
                // If not JSON, return as text
                parsedData = { data: text };
              }
            }
            
            // Format the result consistently based on tool type
            if (name.includes('address')) {
              result = {
                address: params.address,
                data: parsedData,
                tool: name,
                source: 'ordiscan'
              };
            } else if (name.includes('inscription')) {
              result = {
                inscription: params.id || params.number,
                data: parsedData,
                tool: name,
                source: 'ordiscan'
              };
            } else if (name.includes('brc20')) {
              result = {
                token: params.tick,
                data: parsedData,
                tool: name,
                source: 'ordiscan'
              };
            } else if (name.includes('rune')) {
              result = {
                rune: params.name || params.runeName,
                data: parsedData,
                tool: name,
                source: 'ordiscan'
              };
            } else if (name.includes('collection')) {
              result = {
                collection: params.slug,
                data: parsedData,
                tool: name,
                source: 'ordiscan'
              };
            } else if (name.includes('tx')) {
              result = {
                transaction: params.txid,
                data: parsedData,
                tool: name,
                source: 'ordiscan'
              };
            } else if (name.includes('utxo')) {
              result = {
                utxo: params.utxo,
                data: parsedData,
                tool: name,
                source: 'ordiscan'
              };
            } else if (name.includes('sat')) {
              result = {
                satoshi: params.ordinal,
                data: parsedData,
                tool: name,
                source: 'ordiscan'
              };
            } else {
              // Generic format for other tools
              result = {
                data: parsedData,
                tool: name,
                source: 'ordiscan'
              };
            }
          } catch (error) {
            console.error(`Error in Ordiscan ${name}:`, error);
            ordiscanConnected = false; // Mark as disconnected
            throw new Error(`Ordiscan ${name} failed: ${error.message}`);
          }
        } else {
          throw new Error(`${name} not available - no Ordiscan connection`);
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
  
  if (ordiscanConnected) {
    console.log('\n🔗 Ordiscan Bitcoin Tools (29 tools available):');
    console.log('- ordiscan_address_brc20: Get BRC-20 token balances for a Bitcoin address');
    console.log('- ordiscan_inscription_info: Get detailed information about a specific inscription');
    console.log('- ordiscan_address_inscriptions: Get all inscriptions owned by a Bitcoin address');
    console.log('- ordiscan_runes_list: Get a paginated list of all runes');
    console.log('- ordiscan_collection_info: Get detailed information about a specific collection');
    console.log('- ordiscan_tx_info: Get information about a Bitcoin transaction');
    console.log('- And 23 more Bitcoin ordinals, inscriptions, BRC-20, and runes tools...');
  }
  
  console.log(`\nSmithery Integration: ${smitheryConnected ? '✓ Connected' : '✗ Not connected'}`);
  console.log(`Ordiscan Integration: ${ordiscanConnected ? '✓ Connected' : '✗ Not connected'}`);
}); 