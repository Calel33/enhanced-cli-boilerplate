# 🔄 Tool Flow Integration Guide

This guide documents the complete flow pattern used in our enhanced CLI boilerplate for seamless tool integration with AgentHustle AI. Follow this pattern to ensure any tool (Smithery or local) provides the same excellent user experience.

## 📋 Overview

Our tool integration follows a 6-step flow that ensures:
- **Automatic tool selection** (Smithery preferred, local fallback)
- **Transparent execution** with clear source indicators
- **AI-powered summarization** of results
- **Interactive follow-up** suggestions
- **Graceful error handling** with AI guidance

## 🔄 The Complete Flow

### Step 1: User Question → AgentHustle Tool Decision
```
User: "What are the latest developments in Solana?"
↓
AgentHustle: <tool>brave_web_search({query: "latest Solana developments", count: 5})</tool>
```

### Step 2: CLI Tool Call Detection & Mapping
```javascript
// In src/cli.js - parseToolCalls()
const toolCalls = parseToolCalls(response.content);
// Detects: <tool>brave_web_search(...)</tool>

// Smart tool mapping handles naming conventions
if (toolName === 'brave_web_search' || toolName === 'brave-search') {
  const smitheryTool = availableTools.find(t => t.name === 'brave_web_search');
  const localTool = availableTools.find(t => t.name === 'brave-search');
  mappedToolName = smitheryTool ? 'brave_web_search' : (localTool ? 'brave-search' : toolName);
}
```

### Step 3: Tool Execution with Source Indicator
```javascript
// Shows clear source indicator to user
const toolSource = tool.source === 'smithery' ? '🌐 Smithery' : '📦 Local';
console.log(chalk.blue(`\n🔧 Using ${toolCall.name} (${toolSource})...`));

// Collect all tool results first
const toolResults = [];
let hasErrors = false;

try {
  // Execute tool
  const toolResponse = await axios.post(`${MCP_SERVER_URL}/api/tools/call`, {
    name: toolCall.name,
    params: toolCall.arguments
  });
  
  if (toolResponse.data && toolResponse.data.success) {
    console.log(chalk.green('✅ Tool executed successfully'));
    
    // 3. Show brief result summary (customize based on your tool's output)
    if (toolResponse.data.result) {
      const result = toolResponse.data.result;
      // Customize this section for your tool's specific output format
      if (result.query && result.results) {
        console.log(chalk.cyan(`📊 Found ${result.results.length} results for: "${result.query}"`));
      } else if (result.data) {
        console.log(chalk.cyan(`📈 Processed ${result.data.length} items`));
      } else if (result.response) {
        console.log(chalk.cyan(`💬 Response: ${result.response.substring(0, 100)}...`));
      }
    }
    
    // Collect successful result
    toolResults.push({
      toolName: toolCall.name,
      success: true,
      result: toolResponse.data.result
    });
  } else {
    console.log(chalk.red(`❌ Tool execution failed: ${toolResponse.data?.error || 'Unknown error'}`));
    hasErrors = true;
    
    // Collect error result
    toolResults.push({
      toolName: toolCall.name,
      success: false,
      error: toolResponse.data?.error || 'Unknown error'
    });
  }
} catch (error) {
  console.error(chalk.red(`❌ Error using ${toolCall.name}:`), error.message);
  hasErrors = true;
  
  // Collect error result
  toolResults.push({
    toolName: toolCall.name,
    success: false,
    error: error.message
  });
}

// 4. After ALL tools are executed, send single summarization request
if (toolResults.length > 0) {
  console.log(chalk.yellow('\n🤖 Asking Agent Hustle to analyze all results...'));
  
  let followUpPrompt;
  if (hasErrors) {
    // Handle mixed success/error results
    const successfulResults = toolResults.filter(r => r.success);
    const failedResults = toolResults.filter(r => !r.success);
    
    followUpPrompt = `I executed ${toolResults.length} tool(s) with the following results:

SUCCESSFUL TOOLS (${successfulResults.length}):
${successfulResults.map(r => `- ${r.toolName}: ${JSON.stringify(r.result, null, 2)}`).join('\n')}

FAILED TOOLS (${failedResults.length}):
${failedResults.map(r => `- ${r.toolName}: ${r.error}`).join('\n')}

Please summarize the successful results for the user, acknowledge any failures, and ask if they would like to do anything further with the data or try alternative approaches for the failed tools.`;
  } else {
    // All tools succeeded
    const resultsString = toolResults.map(r => 
      `${r.toolName} results: ${JSON.stringify(r.result, null, 2)}`
    ).join('\n\n');
    
    followUpPrompt = `I successfully executed ${toolResults.length} tool(s) and got the following results:

${resultsString}

Please summarize this data for the user and then ask if they would like to do anything further with it.`;
  }
  
  const summaryResponse = await client.chat([
    { role: 'user', content: followUpPrompt }
  ], { vaultId });
  
  // 5. Display AI summary and follow-up
  console.log(chalk.magentaBright('\n🤖 Agent Hustle Summary & Follow-up:'));
  console.log(summaryResponse.content);
}
```

## 🛠️ Implementation Template

### For Any New Tool Integration

```javascript
// 1. Tool Call Detection (add to parseToolCalls function)
if (toolName === 'your_tool_name' || toolName === 'your-tool-name') {
  const smitheryTool = availableTools.find(t => t.name === 'your_tool_name');
  const localTool = availableTools.find(t => t.name === 'your-tool-name');
  mappedToolName = smitheryTool ? 'your_tool_name' : (localTool ? 'your-tool-name' : toolName);
}

// 2. Tool Execution (add to handleChatMode function)
const toolSource = tool.source === 'smithery' ? '🌐 Smithery' : '📦 Local';
console.log(chalk.blue(`\n🔧 Using ${toolCall.name} (${toolSource})...`));

// Collect all tool results first
const toolResults = [];
let hasErrors = false;

try {
  // Execute tool
  const toolResponse = await axios.post(`${MCP_SERVER_URL}/api/tools/call`, {
    name: toolCall.name,
    params: toolCall.arguments
  });
  
  if (toolResponse.data && toolResponse.data.success) {
    console.log(chalk.green('✅ Tool executed successfully'));
    
    // 3. Show brief result summary (customize based on your tool's output)
    if (toolResponse.data.result) {
      const result = toolResponse.data.result;
      // Customize this section for your tool's specific output format
      if (result.query && result.results) {
        console.log(chalk.cyan(`📊 Found ${result.results.length} results for: "${result.query}"`));
      } else if (result.data) {
        console.log(chalk.cyan(`📈 Processed ${result.data.length} items`));
      } else if (result.response) {
        console.log(chalk.cyan(`💬 Response: ${result.response.substring(0, 100)}...`));
      }
    }
    
    // Collect successful result
    toolResults.push({
      toolName: toolCall.name,
      success: true,
      result: toolResponse.data.result
    });
  } else {
    console.log(chalk.red(`❌ Tool execution failed: ${toolResponse.data?.error || 'Unknown error'}`));
    hasErrors = true;
    
    // Collect error result
    toolResults.push({
      toolName: toolCall.name,
      success: false,
      error: toolResponse.data?.error || 'Unknown error'
    });
  }
} catch (error) {
  console.error(chalk.red(`❌ Error using ${toolCall.name}:`), error.message);
  hasErrors = true;
  
  // Collect error result
  toolResults.push({
    toolName: toolCall.name,
    success: false,
    error: error.message
  });
}

// 4. After ALL tools are executed, send single summarization request
if (toolResults.length > 0) {
  console.log(chalk.yellow('\n🤖 Asking Agent Hustle to analyze all results...'));
  
  let followUpPrompt;
  if (hasErrors) {
    // Handle mixed success/error results
    const successfulResults = toolResults.filter(r => r.success);
    const failedResults = toolResults.filter(r => !r.success);
    
    followUpPrompt = `I executed ${toolResults.length} tool(s) with the following results:

SUCCESSFUL TOOLS (${successfulResults.length}):
${successfulResults.map(r => `- ${r.toolName}: ${JSON.stringify(r.result, null, 2)}`).join('\n')}

FAILED TOOLS (${failedResults.length}):
${failedResults.map(r => `- ${r.toolName}: ${r.error}`).join('\n')}

Please summarize the successful results for the user, acknowledge any failures, and ask if they would like to do anything further with the data or try alternative approaches for the failed tools.`;
  } else {
    // All tools succeeded
    const resultsString = toolResults.map(r => 
      `${r.toolName} results: ${JSON.stringify(r.result, null, 2)}`
    ).join('\n\n');
    
    followUpPrompt = `I successfully executed ${toolResults.length} tool(s) and got the following results:

${resultsString}

Please summarize this data for the user and then ask if they would like to do anything further with it.`;
  }
  
  const summaryResponse = await client.chat([
    { role: 'user', content: followUpPrompt }
  ], { vaultId });
  
  // 5. Display AI summary and follow-up
  console.log(chalk.magentaBright('\n🤖 Agent Hustle Summary & Follow-up:'));
  console.log(summaryResponse.content);
}
```

## 📊 Tool-Specific Result Summary Examples

### Search Tools (like Brave Search)
```javascript
if (result.query && result.results) {
  console.log(chalk.cyan(`📊 Found ${result.results.length} results for: "${result.query}"`));
}
```

### Data Analysis Tools
```javascript
if (result.analysis && result.insights) {
  console.log(chalk.cyan(`📈 Analysis complete: ${result.insights.length} insights found`));
}
```

### Financial Tools
```javascript
if (result.symbol && result.price) {
  console.log(chalk.cyan(`💰 ${result.symbol}: $${result.price} (${result.change > 0 ? '+' : ''}${result.change}%)`));
}
```

### Weather Tools
```javascript
if (result.location && result.weather) {
  console.log(chalk.cyan(`🌤️ ${result.location}: ${result.weather.temperature}°F, ${result.weather.conditions}`));
}
```

### Text Processing Tools
```javascript
if (result.input && result.output) {
  console.log(chalk.cyan(`📝 Processed ${result.input.length} characters → ${result.output.length} characters`));
}
```

### Blockchain/Crypto Tools
```javascript
if (result.address && result.balance) {
  console.log(chalk.cyan(`🔗 Balance: ${result.balance} ${result.token || 'ETH'}`));
} else if (result.token && result.security_score) {
  console.log(chalk.cyan(`🛡️ Security Score: ${result.security_score}/100 for ${result.token}`));
}
```

## 🎯 Key Benefits of This Flow

### 1. **Seamless User Experience**
- User doesn't need to know which implementation is being used
- Consistent interface regardless of tool source
- Clear visual indicators for transparency

### 2. **Intelligent Tool Selection**
- Automatically prefers Smithery (hosted, no API key management)
- Falls back to local implementations when needed
- Handles naming convention differences transparently

### 3. **AI-Powered Enhancement**
- AgentHustle provides intelligent summarization
- Contextual follow-up suggestions
- Natural conversation flow continuation

### 4. **Robust Error Handling**
- Graceful degradation when tools fail
- AI-powered error guidance and suggestions
- Clear error communication to users

### 5. **Extensible Architecture**
- Easy to add new tools following the same pattern
- Consistent behavior across all tool types
- Maintainable and scalable codebase

## 🔧 Implementation Checklist

When adding a new tool, ensure you implement:

- [ ] **Tool name mapping** in `parseToolCalls()` function
- [ ] **Source indicator** display (🌐 Smithery or 📦 Local)
- [ ] **Tool-specific result summary** for immediate feedback
- [ ] **AgentHustle summarization** with proper prompt formatting
- [ ] **Error handling** with AI guidance fallback
- [ ] **Consistent visual styling** using chalk colors
- [ ] **JSON result formatting** for AgentHustle analysis

## 📝 Best Practices

### 1. **Result Summary Guidelines**
- Keep summaries brief (1-2 lines max)
- Include key metrics or counts
- Use appropriate emojis for visual clarity
- Show the most important information first

### 2. **AgentHustle Prompt Format**
```javascript
const followUpPrompt = `The ${toolCall.name} tool has returned the following data based on the request:

\`\`\`json
${resultsString}
\`\`\`

Please summarize this data for the user and then ask if they would like to do anything further with it.`;
```

### 3. **Error Handling**
- Always provide AI guidance for errors
- Include specific error details in prompts
- Maintain conversation flow even during failures
- Suggest alternative approaches when possible

### 4. **Visual Consistency**
- Use `chalk.blue()` for tool execution messages
- Use `chalk.green()` for success indicators
- Use `chalk.cyan()` for result summaries
- Use `chalk.magentaBright()` for AgentHustle responses
- Use `chalk.red()` for errors
- Use `chalk.yellow()` for processing messages

## 🚀 Example: Complete Weather Tool Integration

```javascript
// In parseToolCalls function
if (toolName === 'weather_forecast' || toolName === 'weather-forecast') {
  const smitheryTool = availableTools.find(t => t.name === 'weather_forecast');
  const localTool = availableTools.find(t => t.name === 'weather-forecast');
  mappedToolName = smitheryTool ? 'weather_forecast' : (localTool ? 'weather-forecast' : toolName);
}

// In handleChatMode function
const toolSource = tool.source === 'smithery' ? '🌐 Smithery' : '📦 Local';
console.log(chalk.blue(`\n🔧 Using ${toolCall.name} (${toolSource})...`));

try {
  const toolResponse = await axios.post(`${MCP_SERVER_URL}/api/tools/call`, {
    name: toolCall.name,
    params: toolCall.arguments
  });
  
  if (toolResponse.data && toolResponse.data.success) {
    console.log(chalk.green('\n✅ Tool executed successfully'));
    
    // Weather-specific result summary
    if (toolResponse.data.result) {
      const result = toolResponse.data.result;
      if (result.location && result.weather) {
        console.log(chalk.cyan(`🌤️ ${result.location}: ${result.weather.temperature}°F, ${result.weather.conditions}`));
      }
    }
    
    // Send to AgentHustle for summarization
    console.log(chalk.yellow('\n🤖 Asking Agent Hustle to analyze the results...'));
    const resultsString = JSON.stringify(toolResponse.data.result, null, 2);
    const followUpPrompt = `The ${toolCall.name} tool has returned the following weather data:

\`\`\`json
${resultsString}
\`\`\`

Please summarize this weather information for the user and ask if they would like to do anything further with it.`;
    
    const summaryResponse = await client.chat([
      { role: 'user', content: followUpPrompt }
    ], { vaultId });
    
    console.log(chalk.magentaBright('\n🤖 Agent Hustle Summary & Follow-up:'));
    console.log(summaryResponse.content);
  }
} catch (error) {
  console.error(chalk.red(`\n❌ Error using ${toolCall.name}:`), error.message);
  
  const errorPrompt = `The weather forecast tool failed with error: ${error.message}. Please inform the user and suggest alternative ways to get weather information.`;
  
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
```

## 🔗 Example: Complete Ordiscan Bitcoin Tools Integration

Our Ordiscan tools **already follow the exact same flow pattern** as Brave Search! Here's how they work:

### 1. **Rune Market Tool Example**

**User Query:**
```
[chat]> What's the current market data for DOGGOTOTHEMOON rune?
```

**AgentHustle Tool Call:**
```xml
<tool>ordiscan_rune_market({
  name: "DOGGOTOTHEMOON"
})</tool>
```

**Complete Flow Implementation:**
```javascript
// 1. Tool Detection & Mapping (already implemented)
else if (toolName.startsWith('ordiscan_') || toolName.includes('ordiscan')) {
  const ordiscanTool = availableTools.find(t => t.name === toolName);
  mappedToolName = ordiscanTool ? toolName : toolName;
}

// 2. Tool Execution with Source Indicator (FIXED: now shows Smithery correctly)
const toolSource = (tool.source === 'smithery' || tool.source === 'ordiscan') ? '🌐 Smithery' : '📦 Local';
console.log(chalk.blue(`\n🔧 Using ${toolCall.name} (${toolSource})...`));

try {
  const toolResponse = await axios.post(`${MCP_SERVER_URL}/api/tools/call`, {
    name: 'ordiscan_rune_market',
    params: { name: "DOGGOTOTHEMOON" }
  });
  
  if (toolResponse.data && toolResponse.data.success) {
    console.log(chalk.green('✅ Tool executed successfully'));
    
    // 3. Ordiscan-specific result summary (already implemented)
    const result = toolResponse.data.result;
    if (result.rune) {
      console.log(chalk.cyan(`🔮 Rune: ${result.rune}`));
    } else if (toolCall.name.includes('market')) {
      console.log(chalk.cyan(`💰 Market data retrieved for rune`));
    }
    
    // 4. Send to AgentHustle for summarization (already implemented)
    console.log(chalk.yellow('\n🤖 Asking Agent Hustle to analyze the results...'));
    const resultsString = JSON.stringify(result, null, 2);
    const followUpPrompt = `The ordiscan_rune_market tool has returned the following rune market data:

\`\`\`json
${resultsString}
\`\`\`

Please summarize this market information for the user and ask if they would like to do anything further with it.`;
    
    const summaryResponse = await client.chat([
      { role: 'user', content: followUpPrompt }
    ], { vaultId });
    
    // 5. Display AI summary and follow-up (already implemented)
    console.log(chalk.magentaBright('\n🤖 Agent Hustle Summary & Follow-up:'));
    console.log(summaryResponse.content);
  }
} catch (error) {
  // Error handling with AI guidance (already implemented)
  const errorPrompt = `The ordiscan_rune_market tool failed with error: ${error.message}. Please inform the user and suggest alternative ways to get rune market information.`;
  
  const errorResponse = await client.chat([
    { role: 'user', content: errorPrompt }
  ], { vaultId });
  
  console.log(chalk.magentaBright('\n🤖 Agent Hustle Error Guidance:'));
  console.log(errorResponse.content);
}
```

### 2. **All 29 Ordiscan Tools Follow This Pattern**

**BRC-20 Token Example:**
```
User: "What BRC-20 tokens are trending?"
AgentHustle: <tool>ordiscan_brc20_list({sort: "newest", page: "1"})</tool>
Result Summary: 📋 BRC-20 token list retrieved
```

**Address Balance Example:**
```
User: "What Bitcoin ordinals does this address own: bc1p5cyxn..."
AgentHustle: <tool>ordiscan_address_inscriptions({address: "bc1p5cyxn..."})</tool>
Result Summary: 🏠 Bitcoin address: bc1p5cyxn...
```

**Inscription Info Example:**
```
User: "Tell me about inscription #12345"
AgentHustle: <tool>ordiscan_inscription_info({id: "12345"})</tool>
Result Summary: 🖼️ Inscription: 12345
```

### 3. **Function Call Mapping Support**

Your requested function call format is **already supported**! AgentHustle can use any of these formats:

**Standard Tool Format:**
```xml
<tool>ordiscan_rune_market({
  name: "DOGGOTOTHEMOON",
  apiKey: "your-api-key"
})</tool>
```

**Function Call Format (also works):**
```xml
<function_calls>
  <invoke name="ordiscan_rune_market" call_id="1">
    <parameter name="name">DOGGOTOTHEMOON</parameter>
    <parameter name="apiKey">your-api-key</parameter>
  </invoke>
</function_calls>
```

Both formats are parsed and executed identically through our flow!

### 4. **Complete Tool Coverage**

All 29 Ordiscan tools follow this exact pattern:

**🔮 Runes Tools:**
- `ordiscan_rune_market` - Market data with price/cap
- `ordiscan_runes_list` - Paginated runes list
- `ordiscan_address_runes` - Rune balances for addresses
- `ordiscan_runes_activity` - Rune transfer activity

**🪙 BRC-20 Tools:**
- `ordiscan_brc20_list` - Token list with pagination
- `ordiscan_brc20_info` - Detailed token information
- `ordiscan_address_brc20` - Token balances for addresses

**🖼️ Inscription Tools:**
- `ordiscan_inscription_info` - Detailed inscription data
- `ordiscan_address_inscriptions` - All inscriptions for address
- `ordiscan_inscription_transfers` - Transfer history

**And 20 more tools** - all following the same seamless flow pattern!

### 5. **Enhanced Result Summaries**

We've implemented specific result summaries for each tool type:

```javascript
// Tool-specific summaries based on Ordiscan tool type
if (toolCall.name.includes('market')) {
  console.log(chalk.cyan(`💰 Market data retrieved for rune`));
} else if (toolCall.name.includes('brc20_list')) {
  console.log(chalk.cyan(`📋 BRC-20 token list retrieved`));
} else if (toolCall.name.includes('runes_list')) {
  console.log(chalk.cyan(`🔮 Runes list retrieved`));
} else if (toolCall.name.includes('balance') || toolCall.name.includes('address')) {
  console.log(chalk.cyan(`💼 Address data retrieved`));
}
```

## 🎉 Conclusion

This flow pattern ensures that every tool integration provides:
- **Consistent user experience** across all tools
- **Intelligent AI enhancement** of tool results
- **Graceful error handling** with helpful guidance
- **Clear visual feedback** throughout the process
- **Seamless conversation flow** with natural follow-ups

By following this pattern, any tool (whether Smithery-hosted or local) will integrate seamlessly into the CLI boilerplate and provide an excellent user experience powered by AgentHustle AI.

---

**Related Documentation:**
- [Smithery Integration Guide](SMITHERY_INTEGRATION_GUIDE.md) - How to add Smithery tools
- [Quick Reference](QUICK_REFERENCE.md) - 5-minute integration checklist
- [Tool Templates](templates/) - Copy-paste templates for quick integration
- [Examples](examples/) - Working examples of tool integrations 