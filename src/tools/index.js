// Tools setup and initialization
import { BraveSearchTool } from './brave-search.js';
import { RugcheckTool } from './rugcheck.js';
import { WalletBalanceTool } from './wallet-balance.js';
import { TrendingTokensTool } from './trending-tokens.js';

/**
 * Setup and initialize all available tools
 * @param {MCPClient} mcpClient - MCP client instance
 * @returns {Promise<Array>} List of initialized tools
 */
export async function setupTools(mcpClient) {
  // Check MCP server availability
  const isServerAvailable = await mcpClient.isAvailable();
  if (!isServerAvailable) {
    throw new Error('MCP server is not available');
  }

  // Initialize tool instances
  const tools = [
    new BraveSearchTool(),
    new RugcheckTool(),
    new WalletBalanceTool(),
    new TrendingTokensTool()
  ];

  // Fetch tool configurations from server
  const serverTools = await mcpClient.listTools();

  // Map server configurations to tool instances
  return tools.map(tool => {
    const serverTool = serverTools.find(t => t.name === tool.name);
    if (serverTool) {
      return {
        ...tool,
        ...serverTool
      };
    }
    return tool;
  }).filter(tool => tool.isAvailable());
} 