// Enhanced CLI client that combines AgentHustle chatbot with Smithery MCP tools
import { HustleIncognitoClient } from 'hustle-incognito';
import axios from 'axios';
import dotenv from 'dotenv';
import readline from 'readline';
import chalk from 'chalk';

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

// Configuration
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:8081';
const HUSTLE_API_URL = process.env.HUSTLE_API_URL || 'https://agenthustle.ai';
const DEBUG = process.env.DEBUG === 'true';

// Initialize the AgentHustle client
const client = new HustleIncognitoClient({
  apiKey: process.env.HUSTLE_API_KEY,
  hustleApiUrl: HUSTLE_API_URL,
  debug: DEBUG
});

// Store the vault ID for use in API calls
const vaultId = process.env.VAULT_ID;

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Available modes
const MODES = {
  CHAT: 'chat',
  TOOLS: 'tools',
  STREAM: 'stream'
};

// Current mode
let currentMode = MODES.CHAT;
let availableTools = [];

// Store last message ID for feedback
let lastMessageId = null;

// Main function
async function main() {
  console.log(chalk.green('🤖 AgentHustle Enhanced CLI'));
  console.log(chalk.green('============================='));
  console.log('Commands:');
  console.log('  /mode chat    - Switch to chat mode (default)');
  console.log('  /mode tools   - Switch to tools mode');
  console.log('  /mode stream  - Switch to streaming chat mode');
  console.log('  /tools        - List available tools');
  console.log('  /use <tool>   - Use a specific tool');
  console.log('  /exit         - Exit the application');
  console.log('  /feedback     - Provide feedback on the last response');
  console.log('');
  
  try {
    // Fetch available tools from MCP server
    console.log('Connecting to MCP server...');
    const toolsResponse = await axios.post(`${MCP_SERVER_URL}/api/tools/list`);
    availableTools = toolsResponse.data.tools;
    
    console.log(chalk.green(`✓ Connected to MCP server`));
    console.log(chalk.green(`✓ Available tools: ${availableTools.map(t => t.name).join(', ')}`));
    console.log('');
    console.log(chalk.yellow(`Current mode: ${currentMode.toUpperCase()}`));
    console.log('');
    
    // Start the interaction loop
    promptForInput();
  } catch (error) {
    console.error(chalk.red('Error connecting to MCP server:'), error.message);
    console.log(chalk.yellow('Continuing in chat-only mode...'));
    console.log('');
    promptForInput();
  }
}

// Prompt for input
function promptForInput() {
  const prefix = currentMode === MODES.TOOLS ? 'tools' : currentMode === MODES.STREAM ? 'stream' : 'chat';
  rl.question(`[${prefix}]> `, async (input) => {
    // Handle commands
    if (input.startsWith('/')) {
      await handleCommand(input);
      return promptForInput();
    }
    
    if (!input.trim()) {
      return promptForInput();
    }
    
    try {
      // Process input based on current mode
      switch (currentMode) {
        case MODES.CHAT:
          await handleChatMode(input);
          break;
          
        case MODES.TOOLS:
          await handleToolsMode(input);
          break;
          
        case MODES.STREAM:
          await handleStreamMode(input);
          break;
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
    }
    
    // Always prompt for next input after processing
    promptForInput();
  });
}

// Handle commands
async function handleCommand(input) {
  const parts = input.slice(1).split(' ');
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);
  
  switch (command) {
    case 'mode':
      if (args[0] && Object.values(MODES).includes(args[0])) {
        currentMode = args[0];
        console.log(chalk.yellow(`Switched to ${currentMode.toUpperCase()} mode`));
      } else {
        console.log(chalk.red(`Invalid mode. Available modes: ${Object.values(MODES).join(', ')}`));
      }
      break;
      
    case 'tools':
      if (availableTools.length > 0) {
        console.log(chalk.green('\nAvailable Tools:'));
        
        // Group tools by source
        const localTools = availableTools.filter(t => !t.source || t.source === 'local');
        const smitheryTools = availableTools.filter(t => t.source === 'smithery');
        
        if (localTools.length > 0) {
          console.log(chalk.blue('\n📦 Local Tools:'));
          localTools.forEach(tool => {
            console.log(`- ${chalk.bold(tool.name)}: ${tool.description}`);
          });
        }
        
        if (smitheryTools.length > 0) {
          console.log(chalk.magenta('\n🌐 Smithery Hosted Tools:'));
          smitheryTools.forEach(tool => {
            console.log(`- ${chalk.bold(tool.name)}: ${tool.description}`);
          });
        }
        
        console.log(chalk.gray(`\nTotal: ${availableTools.length} tools available`));
      } else {
        console.log(chalk.yellow('No tools available. MCP server may not be connected.'));
      }
      break;
      
    case 'use':
      if (args[0] && availableTools.length > 0) {
        const toolName = args[0];
        const tool = availableTools.find(t => t.name === toolName);
        
        if (tool) {
          await useTool(tool);
        } else {
          console.log(chalk.red(`Tool "${toolName}" not found.`));
        }
      } else {
        console.log(chalk.red('Please specify a tool name: /use <tool-name>'));
      }
      break;
      
    case 'exit':
    case 'quit':
      console.log(chalk.green('Goodbye!'));
      rl.close();
      process.exit(0);
      break;
      
    case 'feedback':
      if (!lastMessageId) {
        console.log(chalk.red('No previous message to provide feedback for'));
        break;
      }
      
      if (!args[0] || !['positive', 'negative'].includes(args[0])) {
        console.log(chalk.red('Please specify feedback as "positive" or "negative"'));
        break;
      }
      
      try {
        const comment = args.slice(1).join(' ');
        const response = await axios.post(`${MCP_SERVER_URL}/api/tools/call`, {
          name: 'feedback',
          params: {
            messageId: lastMessageId,
            feedback: args[0],
            comment
          }
        });
        
        console.log(chalk.green('Thank you for your feedback!'));
        if (response.data.error) {
          console.log(chalk.red('Error:', response.data.message));
        }
      } catch (error) {
        console.error(chalk.red('Error submitting feedback:'), error.message);
      }
      break;
      
    default:
      console.log(chalk.red('Unknown command.'));
      break;
  }
}

// Parse tool calls from AgentHustle response
function parseToolCalls(content) {
  const toolRegex = /<tool>(.*?)<\/tool>/gs;
  const matches = [...content.matchAll(toolRegex)];
  return matches.map(match => {
    try {
      const functionCall = match[1];
      const toolMatch = functionCall.match(/(\w+)\((.*)\)/s);
      if (toolMatch) {
        const [_, toolName, paramsStr] = toolMatch;
        const params = eval(`(${paramsStr})`);
        
        // Map tool names to handle both local and Smithery naming conventions
        let mappedToolName = toolName;
        if (toolName === 'brave_web_search' || toolName === 'brave-search') {
          // Check if we have Smithery brave_web_search available, otherwise use local brave-search
          const smitheryTool = availableTools.find(t => t.name === 'brave_web_search');
          const localTool = availableTools.find(t => t.name === 'brave-search');
          mappedToolName = smitheryTool ? 'brave_web_search' : (localTool ? 'brave-search' : toolName);
        } else if (toolName === 'brave_local_search') {
          mappedToolName = 'brave_local_search';
        }
        
        return {
          name: mappedToolName,
          arguments: params
        };
      }
    } catch (error) {
      console.error('Error parsing tool call:', error);
    }
    return null;
  }).filter(Boolean);
}

// Handle chat mode
async function handleChatMode(input) {
  console.log(chalk.yellow('Thinking...'));
  
  try {
    const response = await client.chat([
      { role: 'user', content: input }
    ], { vaultId });
    
    console.log(chalk.green('\nResponse:'));
    console.log(response.content);
    
    // Parse tool calls from the response content
    const toolCalls = parseToolCalls(response.content);
    if (toolCalls && toolCalls.length > 0) {
      console.log(chalk.blue('\n🤖 Agent Hustle is using tools to help answer your question...'));
      
      // Handle each tool call
      for (const toolCall of toolCalls) {
        const tool = availableTools.find(t => t.name === toolCall.name);
        
        if (tool) {
          const toolSource = tool.source === 'smithery' ? '🌐 Smithery' : '📦 Local';
          console.log(chalk.blue(`\n🔧 Using ${toolCall.name} (${toolSource})...`));
          try {
            // Call the tool
            const toolResponse = await axios.post(`${MCP_SERVER_URL}/api/tools/call`, {
              name: toolCall.name,
              params: toolCall.arguments
            });
            
            if (toolResponse.data && toolResponse.data.success) {
              console.log(chalk.green('\n✅ Tool executed successfully'));
              
              // Show brief result summary
              if (toolResponse.data.result) {
                const result = toolResponse.data.result;
                if (result.query && result.results) {
                  console.log(chalk.cyan(`📊 Found ${result.results.length} results for: "${result.query}"`));
                } else if (result.response) {
                  console.log(chalk.cyan(`💬 Response: ${result.response.substring(0, 100)}...`));
                }
              }
              
              // Ask AgentHustle to summarize the results
              console.log(chalk.yellow('\n🤖 Asking Agent Hustle to analyze the results...'));
              const resultsString = JSON.stringify(toolResponse.data.result, null, 2);
              const followUpPrompt = `The ${toolCall.name} tool has returned the following data based on the request:\n\n\`\`\`json\n${resultsString}\n\`\`\`\n\nPlease summarize this data for the user and then ask if they would like to do anything further with it.`;
              
              const summaryResponse = await client.chat([
                { role: 'user', content: followUpPrompt }
              ], { vaultId });
              
              console.log(chalk.magentaBright('\n🤖 Agent Hustle Summary & Follow-up:'));
              console.log(summaryResponse.content);
            } else {
              console.log(chalk.red(`\n❌ Tool execution failed: ${toolResponse.data?.error || 'Unknown error'}`));
              
              // Still ask AgentHustle for guidance
              const errorPrompt = `The ${toolCall.name} tool failed to execute with error: ${toolResponse.data?.error || 'Unknown error'}. Please inform the user and suggest alternative approaches.`;
              
              const errorResponse = await client.chat([
                { role: 'user', content: errorPrompt }
              ], { vaultId });
              
              console.log(chalk.magentaBright('\n🤖 Agent Hustle Error Guidance:'));
              console.log(errorResponse.content);
            }
          } catch (error) {
            console.error(chalk.red(`\n❌ Error using ${toolCall.name}:`), error.message);
            
            // Ask AgentHustle for guidance on the error
            const errorPrompt = `There was a technical error when trying to use the ${toolCall.name} tool: ${error.message}. Please inform the user and suggest what to do next.`;
            
            try {
              const errorResponse = await client.chat([
                { role: 'user', content: errorPrompt }
              ], { vaultId });
              
              console.log(chalk.magentaBright('\n🤖 Agent Hustle Error Guidance:'));
              console.log(errorResponse.content);
            } catch (chatError) {
              console.error(chalk.red('Could not get guidance from Agent Hustle:'), chatError.message);
            }
          }
        } else {
          console.error(chalk.red(`\n❌ Tool "${toolCall.name}" not found in available tools.`));
          console.log(chalk.yellow('Available tools:'), availableTools.map(t => t.name).join(', '));
        }
      }
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
  }
}

// Handle tools mode
async function handleToolsMode(input) {
  if (!availableTools.length) {
    console.log(chalk.red('No tools available. Please check MCP server connection.'));
    return;
  }

  try {
    const tool = availableTools.find(t => t.name === input);
    if (tool) {
      await useTool(tool);
    } else {
      console.log(chalk.red(`Tool "${input}" not found. Use /tools to see available tools.`));
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
  }
}

// Handle streaming mode
async function handleStreamMode(input) {
  console.log(chalk.yellow('Streaming mode not implemented yet'));
}

// Use a specific tool
async function useTool(tool) {
  try {
    // Get tool parameters
    const params = {};
    for (const [name, schema] of Object.entries(tool.parameters.properties)) {
      const isRequired = tool.parameters.required?.includes(name);
      const defaultValue = schema.default;
      
      const answer = await new Promise(resolve => {
        const message = `Enter ${name}${defaultValue ? ` (default: ${defaultValue})` : ''}: `;
        rl.question(message, resolve);
      });
      
      if (answer.trim() || isRequired) {
        params[name] = answer.trim() || defaultValue;
      }
    }
    
    console.log(chalk.yellow(`\nExecuting ${tool.name}...`));
    
    const response = await axios.post(`${MCP_SERVER_URL}/api/tools/call`, {
      name: tool.name,
      params
    });
    
    console.log(chalk.green('\nResult:'));
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
  }
}

// Start the CLI
main(); 