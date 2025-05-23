# Enhanced CLI Boilerplate with AgentHustle Integration

This is an enhanced CLI boilerplate that demonstrates integration between AgentHustle's AI capabilities and tools using both local implementations and Smithery's hosted Model Context Protocol (MCP) services.

## Features

- **Multiple Operation Modes**:
  - `chat`: Default mode for interacting with AgentHustle AI
  - `tools`: Direct tool usage mode
  - `stream`: Streaming response mode (for real-time AI responses)

- **Integrated Tools**:
  - `brave-search`: Web search using **Smithery hosted Brave Search** (preferred) or local Brave Search API
  - `rugcheck`: Security analysis for crypto tokens
  - `trending-tokens`: Get trending tokens on various blockchains
  - `wallet-balance`: Check wallet balances
  - `crypto-chat`: Specialized crypto-focused chat

- **Smithery Integration**:
  - **Hosted MCP Tools**: Access to Smithery's hosted tool ecosystem
  - **Automatic Fallback**: Falls back to local implementations when Smithery is unavailable
  - **No API Key Management**: Use Smithery's hosted services without managing your own API keys
  - **Consistent Interface**: Standard MCP protocol for all tools

- **Tool Integration Features**:
  - Automatic tool call parsing from AgentHustle responses
  - Client-side tool execution
  - Result summarization by AgentHustle
  - Interactive follow-up suggestions

## 📚 Documentation

- **[Quick Reference](QUICK_REFERENCE.md)**: 5-minute checklist for adding any Smithery tool
- **[Smithery Integration Guide](SMITHERY_INTEGRATION_GUIDE.md)**: Complete guide for adding any Smithery tool to your project
- **[Tool Template](templates/new-smithery-tool-template.js)**: Copy-paste template for quick tool integration
- **[Weather Tool Example](examples/add-weather-tool-example.js)**: Concrete example of adding a weather tool

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with required credentials (copy from `env.example`):
```env
# Required
HUSTLE_API_KEY=your-api-key-here
VAULT_ID=your-vault-id-here

# Smithery Configuration (for hosted tools)
SMITHERY_API_KEY=your-smithery-api-key-here
SMITHERY_PROFILE=your-smithery-profile-here

# Optional - Local Brave Search API (fallback only)
BRAVE_API_KEY=your-brave-search-api-key

# Optional
MCP_PORT=8081
MCP_SERVER_URL=http://localhost:8081
```

**Note**: You'll need to obtain your own Smithery credentials from [https://smithery.ai/](https://smithery.ai/) to use the hosted tools. Alternatively, you can use local tool implementations by providing the appropriate API keys.

## Usage

1. Start the MCP server:
```bash
npm run start:server
# or
node src/server.js
```

2. In a new terminal, start the CLI:
```bash
npm start
# or
node src/cli.js
```

### Available Commands

- `/mode chat`: Switch to chat mode (default)
- `/mode tools`: Switch to tools mode
- `/mode stream`: Switch to streaming mode
- `/tools`: List available tools
- `/use <tool-name>`: Use a specific tool directly
- `/exit`: Exit the application

### Tool Usage Examples

1. **Using Chat Mode with Tool Integration**:
```
[chat]> What are the latest developments in Solana?
```
AgentHustle will automatically use the Smithery hosted Brave search tool and summarize the results.

2. **Direct Tool Usage**:
```
[chat]> /use brave-search
Enter query: latest Solana developments
Enter count (default: 5): 10
```

## Smithery vs Local Tools

- **Smithery Tools** (Preferred): Hosted on Smithery's infrastructure, no API key management required
- **Local Tools** (Fallback): Run locally with your own API keys when Smithery is unavailable
- **Automatic Selection**: The system automatically chooses Smithery when available, falls back to local implementations

## 🔧 Adding New Smithery Tools

Want to add more tools from Smithery? It's easy! Follow these steps:

1. **Quick Start**: Check the [Smithery Integration Guide](SMITHERY_INTEGRATION_GUIDE.md) for detailed instructions
2. **Use the Template**: Copy `templates/new-smithery-tool-template.js` and modify it for your tool
3. **See Examples**: Look at `examples/add-weather-tool-example.js` for a complete working example

### Basic Steps:
1. Find your tool on [smithery.ai](https://smithery.ai)
2. Add tool configuration to `src/utils/smithery-client.js`
3. Add tool execution logic to `src/server.js`
4. Create a test script
5. Test and enjoy!

The same pattern used for Brave Search works for **any** Smithery tool.

## Tool Response Handling

The system handles tool responses in the following way:

1. AgentHustle makes a tool call using the format:
```
<tool>brave_web_search({
  query: "search query",
  count: 10,
  offset: 0
})</tool>
```

2. The CLI intercepts and processes these tool calls
3. Tools are executed via Smithery (preferred) or locally (fallback)
4. Results are sent back to AgentHustle for summarization
5. AgentHustle provides a summary and suggests next steps

## Development

### Adding New Tools

1. **For Smithery Integration**: Follow the [Smithery Integration Guide](SMITHERY_INTEGRATION_GUIDE.md)
2. **For Local Tools**: Create a new tool file in `src/tools/` and add registration in `src/server.js`

### Tool Implementation Requirements

- Each tool must provide:
  - `name`: Unique identifier
  - `description`: Tool purpose
  - `parameters`: JSON Schema of accepted parameters
  - `execute()`: Implementation function (for local tools)

## Error Handling

The system includes comprehensive error handling for:
- Missing environment variables
- Smithery connection failures with automatic fallback
- Tool execution failures
- API communication issues
- Invalid tool calls or parameters

## Contributing

Feel free to contribute by:
- Adding new tools using the [Smithery Integration Guide](SMITHERY_INTEGRATION_GUIDE.md)
- Improving existing tool implementations
- Enhancing the CLI interface
- Adding new features
- Improving Smithery integration

## License

MIT License - See LICENSE file for details