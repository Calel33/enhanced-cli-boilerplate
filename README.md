# Enhanced CLI Boilerplate with MCP Integration

This is a boilerplate for creating an enhanced CLI application that integrates with the Mission Control Protocol (MCP) and AgentHustle API. It provides a powerful command-line interface for interacting with various crypto and web3 tools.

## Features

- Interactive CLI with multiple operation modes
- Real-time chat with AgentHustle AI
- Integration with MCP tools
- Support for Brave Search API
- Crypto-specific tools (rugcheck, wallet balance, trending tokens)
- Streaming mode for real-time responses
- Built-in feedback system for responses

## Prerequisites

- Node.js v16 or higher
- npm or yarn package manager
- AgentHustle API key
- Vault ID
- (Optional) Brave Search API key

## Installation

1. Clone the repository or copy the boilerplate files
2. Install dependencies:
```bash
npm install
```

## Configuration

1. Create a `.env` file in the root directory:
```env
# Required
HUSTLE_API_KEY=your_hustle_api_key_here
VAULT_ID=your_vault_id_here

# Optional
PORT=8081
DEBUG=true
MCP_SERVER_URL=http://localhost:8081
HUSTLE_API_URL=https://agenthustle.ai

# Optional - For Brave Search
BRAVE_API_KEY=your_brave_api_key_here
```

2. Replace the placeholder values with your actual credentials:
   - `HUSTLE_API_KEY`: Your AgentHustle API key
   - `VAULT_ID`: Your vault ID
   - `BRAVE_API_KEY`: (Optional) Your Brave Search API key

## Running the Application

1. Start the MCP server:
```bash
node src/server.js
```

2. In a new terminal, start the CLI client:
```bash
node src/cli.js
```

## Available Commands

- `/mode chat` - Switch to chat mode (default)
- `/mode tools` - Switch to tools mode
- `/mode stream` - Switch to streaming chat mode
- `/tools` - List available tools
- `/use <tool>` - Use a specific tool
- `/feedback <positive|negative> [comment]` - Submit feedback for the last response
- `/exit` - Exit the application

## Available Tools

1. **brave-search**
   - Web search using Brave Search API
   - Parameters:
     - query: Search term
     - count: Number of results (default: 5, max: 20)
     - safesearch: Filter level (strict/moderate/off)

2. **rugcheck**
   - Security analysis for crypto tokens
   - Parameters:
     - token: Token symbol or address
     - chain: Blockchain network (default: solana)

3. **trending-tokens**
   - Get trending tokens on a blockchain
   - Parameters:
     - chain: Blockchain network (default: solana)
     - limit: Maximum results (default: 10)

4. **wallet-balance**
   - Check wallet balance
   - Parameters:
     - address: Wallet address
     - chain: Blockchain network (default: solana)

5. **crypto-chat**
   - Chat with AgentHustle AI about crypto
   - Parameters:
     - message: Your question or message

6. **feedback**
   - Submit feedback for previous responses
   - Parameters:
     - messageId: ID of the message to provide feedback for
     - feedback: Rating (positive/negative)
     - comment: Optional feedback comment

## Usage Examples

### Using Brave Search
```bash
# Method 1: Direct tool mode
/mode tools
brave-search
# Follow the prompts for query and options

# Method 2: Using the /use command
/use brave-search
# Follow the prompts for query and options
```

### Checking Wallet Balance
```bash
/use wallet-balance
# Enter wallet address when prompted
```

### Crypto Chat
```bash
# In chat mode (default)
Tell me about Bitcoin's current market status

# Using tool directly
/use crypto-chat
# Enter your crypto-related question when prompted
```

### Providing Feedback
```bash
# After receiving a response, you can provide feedback:
/feedback positive Great explanation!
/feedback negative This wasn't helpful

# The system will automatically prompt for feedback after each response:
👍 /feedback positive [comment]
👎 /feedback negative [comment]
```

## Error Handling

- If the MCP server is not running, the CLI will continue in chat-only mode
- Invalid commands will display an error message
- API errors will be displayed with relevant error messages
- Missing required environment variables will be reported on startup
- Feedback errors will be displayed with appropriate error messages

## Dependencies

- express: ^4.18.2
- hustle-incognito: ^0.1.3
- dotenv: ^16.3.1
- axios: ^1.6.2
- chalk: ^5.3.0

## Contributing

Feel free to submit issues and enhancement requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 