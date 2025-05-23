// Smithery MCP client utility
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createTransport } from '@smithery/sdk/client/transport.js';

export class SmitheryClient {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.profile = config.profile;
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Initialize the Smithery MCP client
   * @returns {Promise<boolean>} True if connection successful
   */
  async initialize() {
    try {
      // Create transport using Smithery SDK
      const transport = createTransport(this.baseUrl, {
        apiKey: this.apiKey,
        profile: this.profile
      });

      // Create MCP client
      this.client = new Client({
        name: 'enhanced-cli-client',
        version: '1.0.0'
      }, {
        capabilities: {}
      });

      // Connect to the transport
      await this.client.connect(transport);
      
      this.isConnected = true;
      console.log('✓ Connected to Smithery MCP server');
      return true;
    } catch (error) {
      console.error('Failed to connect to Smithery:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * List available tools from Smithery
   * @returns {Promise<Array>} List of available tools
   */
  async listTools() {
    if (!this.client || !this.isConnected) {
      throw new Error('Client not initialized or not connected');
    }
    
    try {
      const result = await this.client.listTools();
      return result.tools;
    } catch (error) {
      console.error('Error listing Smithery tools:', error);
      throw new Error(`Failed to list tools: ${error.message}`);
    }
  }

  /**
   * Call a tool via Smithery
   * @param {string} name - Tool name
   * @param {Object} args - Tool arguments
   * @returns {Promise<Object>} Tool execution result
   */
  async callTool(name, args) {
    if (!this.client || !this.isConnected) {
      throw new Error('Client not initialized or not connected');
    }
    
    try {
      const result = await this.client.callTool({
        name,
        arguments: args
      });
      
      return result;
    } catch (error) {
      console.error(`Error calling Smithery tool ${name}:`, error);
      throw new Error(`Failed to call tool ${name}: ${error.message}`);
    }
  }

  /**
   * Check if client is connected
   * @returns {boolean} Connection status
   */
  isAvailable() {
    return this.isConnected && this.client !== null;
  }

  /**
   * Close the connection
   */
  async close() {
    if (this.client) {
      try {
        await this.client.close();
        this.isConnected = false;
        console.log('✓ Smithery client connection closed');
      } catch (error) {
        console.error('Error closing Smithery client:', error);
      }
    }
  }
} 