// Smithery MCP client utility
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createTransport } from '@smithery/sdk/client/transport.js';

export class SmitheryClient {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.profile = config.profile;
    this.client = null;
    this.transport = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
  }

  /**
   * Initialize the Smithery MCP client
   * @returns {Promise<boolean>} True if connection successful
   */
  async initialize() {
    try {
      // Close existing connection if any
      if (this.client) {
        await this.close();
      }

      // Create transport using Smithery SDK
      this.transport = createTransport(this.baseUrl, {
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
      await this.client.connect(this.transport);
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('✓ Connected to Smithery MCP server');
      return true;
    } catch (error) {
      console.error('Failed to connect to Smithery:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Ensure connection is active, reconnect if needed
   * @returns {Promise<boolean>} True if connected
   */
  async ensureConnection() {
    if (this.isConnected && this.client) {
      return true;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log(`Attempting to reconnect to Smithery (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);
      this.reconnectAttempts++;
      return await this.initialize();
    }

    return false;
  }

  /**
   * List available tools from Smithery
   * @returns {Promise<Array>} List of available tools
   */
  async listTools() {
    if (!(await this.ensureConnection())) {
      throw new Error('Cannot connect to Smithery server');
    }
    
    try {
      const result = await this.client.listTools();
      return result.tools;
    } catch (error) {
      console.error('Error listing Smithery tools:', error);
      // Mark as disconnected and try to reconnect on next call
      this.isConnected = false;
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
    if (!(await this.ensureConnection())) {
      throw new Error('Cannot connect to Smithery server');
    }
    
    try {
      const result = await this.client.callTool({
        name,
        arguments: args
      });
      
      return result;
    } catch (error) {
      console.error(`Error calling Smithery tool ${name}:`, error);
      // Mark as disconnected and try to reconnect on next call
      this.isConnected = false;
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
        this.client = null;
        this.transport = null;
        console.log('✓ Smithery client connection closed');
      } catch (error) {
        console.error('Error closing Smithery client:', error);
      }
    }
  }
} 