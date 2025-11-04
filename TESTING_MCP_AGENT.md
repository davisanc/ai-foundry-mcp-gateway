# Testing Azure AI Agent with MCP - Step-by-Step Guide

## Overview

This guide walks you through testing your MCP server with an Azure AI Agent in Azure AI Foundry.

## Prerequisites

- ✅ MCP server deployed to Azure (https://mcp-server-app-davisanc.azurewebsites.net)
- ✅ Azure AI Foundry project with GPT-4o-mini deployed
- ✅ Access to Azure AI Foundry portal (https://ai.azure.com)

---

## Step 1: Prepare Test Data

### 1.1 Upload a Document via Web UI

1. Open your web app: https://mcp-server-app-davisanc.azurewebsites.net
2. A session will be auto-created
3. **Note the Session ID** displayed on the page (e.g., `abc-123-def-456`)
4. Upload a test document:
   - **Option A:** Paste text directly
   - **Option B:** Upload a TXT/CSV file

**Example Test Document:**
```
Security Policy - Version 2024

All employees must comply with the following security requirements:

1. PASSWORD POLICY
   - Minimum length: 12 characters
   - Must contain uppercase, lowercase, numbers, and symbols
   - Change every 90 days
   - No password reuse for last 12 passwords

2. MULTI-FACTOR AUTHENTICATION
   - Required for all corporate systems
   - Use Microsoft Authenticator app
   - Backup codes stored securely

3. NETWORK ACCESS
   - VPN required for remote work
   - Required ports:
     * HTTPS: 443
     * SSH: 22 (admin only)
     * RDP: 3389 (internal network only)

4. DATA CLASSIFICATION
   - Public: Can be shared externally
   - Internal: Company use only
   - Confidential: Restricted access
   - Secret: Executive level only

Contact IT Security for questions: security@company.com
```

5. **Note the Document ID** after upload (e.g., `doc-789-xyz-012`)

---

## Step 2: Create Azure AI Agent

### 2.1 Navigate to Azure AI Foundry

1. Open browser: https://ai.azure.com
2. Sign in with your Azure account
3. Select your **Project** (or create one if needed)

### 2.2 Create a New Agent

1. In the left navigation, click **Agents**
2. Click **+ Create agent** or **+ New agent**
3. Fill in the details:

   **Agent Configuration:**
   ```
   Name: Document Analysis Agent
   
   Description: 
   Agent that can analyze uploaded security policy documents 
   and answer questions using the MCP gateway.
   
   Instructions:
   You are a helpful assistant that specializes in analyzing 
   security policy documents. You have access to a document 
   server via MCP tools. When users ask about documents:
   
   1. First, list available documents using list_documents
   2. Then retrieve specific documents using get_document
   3. Analyze the content and provide clear, accurate answers
   4. If searching is needed, use search_documents
   
   Always cite which document you're referencing in your answers.
   
   Model: gpt-4o-mini (or your deployed model)
   
   Temperature: 0.3 (for more consistent answers)
   ```

4. Click **Create** or **Save**

---

## Step 3: Add MCP Tools to Agent

### 3.1 Configure MCP Connection

1. In your agent's configuration page, find the **Tools** section
2. Click **+ Add tool**
3. Select **MCP (Model Context Protocol)** or **External Tool**

### 3.2 MCP Server Configuration

**Note:** The exact UI may vary. You might need to configure this via:
- **Agent Studio UI** - If Azure AI Foundry supports visual MCP configuration
- **Code/API** - Using Azure AI Agent SDK
- **Configuration JSON** - Direct JSON configuration

**MCP Connection Settings:**
```json
{
  "type": "mcp",
  "transport": "sse",
  "url": "https://mcp-server-app-davisanc.azurewebsites.net/mcp/sse",
  "name": "document-server",
  "description": "Access to uploaded security policy documents"
}
```

**Alternative: If using Azure AI Agent API**

You may need to configure via code. Here's the Python SDK example:

```python
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential

# Initialize client
client = AIProjectClient(
    credential=DefaultAzureCredential(),
    subscription_id="your-subscription-id",
    resource_group_name="ai-mcp-rg",
    project_name="your-project-name"
)

# Create agent with MCP tool
agent = client.agents.create_agent(
    model="gpt-4o-mini",
    name="Document Analysis Agent",
    instructions="You are a helpful assistant...",
    tools=[
        {
            "type": "mcp",
            "mcp": {
                "url": "https://mcp-server-app-davisanc.azurewebsites.net/mcp/sse",
                "transport": "sse"
            }
        }
    ]
)
```

---

## Step 4: Test the Agent

### 4.1 Start a Conversation

1. In the Azure AI Foundry portal, open your agent's **Playground** or **Test** tab
2. Start a new conversation

### 4.2 Test Scenario 1: List Documents

**Your Message:**
```
Can you list all documents in session abc-123-def-456?
```
(Replace `abc-123-def-456` with your actual session ID from Step 1)

**Expected Agent Behavior:**
- Agent recognizes it needs to use a tool
- Calls `list_documents` MCP tool
- Returns: "I found X document(s) in the session:..."

**What to Look For:**
- Agent should show tool usage (may have a "🔧 Using tool" indicator)
- Should display document list with titles
- Should mention the session ID

### 4.3 Test Scenario 2: Get Document Content

**Your Message:**
```
Can you retrieve document doc-789-xyz-012 from session abc-123-def-456 
and tell me what it's about?
```

**Expected Agent Behavior:**
- Calls `get_document` tool with sessionId and docId
- Receives full document text
- Analyzes and summarizes content

**Expected Response:**
```
I retrieved the "Security Policy - Version 2024" document. 
This document outlines the company's security requirements including:

1. Password Policy: Minimum 12 characters, mixed case, 
   numbers, symbols, 90-day rotation
2. Multi-Factor Authentication: Required using Microsoft Authenticator
3. Network Access: VPN required, specific ports (443, 22, 3389)
4. Data Classification: Four levels from Public to Secret

Would you like me to elaborate on any specific section?
```

### 4.4 Test Scenario 3: Search Documents

**Your Message:**
```
Search all documents in session abc-123-def-456 for information 
about "password requirements"
```

**Expected Agent Behavior:**
- Calls `search_documents` tool with query="password requirements"
- Finds relevant snippets
- Presents findings

**Expected Response:**
```
I found information about password requirements in the 
Security Policy document:

- Minimum length: 12 characters
- Must contain uppercase, lowercase, numbers, and symbols
- Must be changed every 90 days
- Cannot reuse last 12 passwords

This information is from the PASSWORD POLICY section.
```

### 4.5 Test Scenario 4: Complex Multi-Step Query

**Your Message:**
```
I need a summary of the network security requirements. 
What ports are mentioned and what are they used for?
```

**Expected Agent Behavior:**
- May call `list_documents` to find relevant documents
- Calls `get_document` to retrieve content
- Analyzes the NETWORK ACCESS section
- Provides structured answer

**Expected Response:**
```
Based on the Security Policy document, here are the 
network security requirements:

Required Ports:
1. HTTPS (443) - General access
2. SSH (22) - Admin access only
3. RDP (3389) - Internal network only

Additional Requirements:
- VPN required for all remote work
- Port access is role-based and restricted

These requirements ensure secure remote access while 
limiting exposure of administrative interfaces.
```

---

## Step 5: Monitor and Debug

### 5.1 Check Azure Web App Logs

1. Go to Azure Portal
2. Navigate to: **App Services** → **mcp-server-app-davisanc**
3. Click **Log stream** or **Logs**

**Look for:**
```
🔧 MCP Tool called: list_documents { sessionId: 'abc-123...' }
📄 MCP uploaded document...
✅ Session created...
```

### 5.2 Check Agent Execution Logs

In Azure AI Foundry:
1. Go to your agent
2. Look for **Execution logs** or **Run history**
3. Expand tool calls to see:
   - Tool name
   - Arguments passed
   - Response received

### 5.3 Test MCP Endpoint Directly

You can test the MCP endpoint with curl:

```bash
# Test SSE connection (will stream events)
curl -N https://mcp-server-app-davisanc.azurewebsites.net/mcp/sse
```

---

## Troubleshooting

### Problem: Agent doesn't see MCP tools

**Solutions:**
1. Verify MCP endpoint is accessible: 
   ```
   https://mcp-server-app-davisanc.azurewebsites.net/mcp/sse
   ```
2. Check if agent configuration saved properly
3. Try recreating the agent
4. Verify Azure AI Foundry supports MCP (may be in preview)

### Problem: "Session not found" error

**Solutions:**
1. Create a new session via web UI first
2. Use the exact session ID (copy-paste)
3. Check session hasn't expired (restart server clears sessions)

### Problem: Agent gets empty responses

**Solutions:**
1. Verify documents were uploaded successfully
2. Check document ID is correct
3. Look at server logs for errors
4. Ensure Azure AI Foundry endpoint has network access to your Web App

### Problem: MCP connection fails

**Solutions:**
1. Check if APIM subscription keys are required
2. Verify no firewall blocking Azure AI Foundry
3. Test with APIM disabled temporarily
4. Check server logs for connection attempts

---

## Alternative: Test MCP Locally

If Azure AI Agent setup is complex, you can test MCP locally first:

### Option 1: Use Inspector Tool

```bash
npm install -g @modelcontextprotocol/inspector

npx @modelcontextprotocol/inspector \
  https://mcp-server-app-davisanc.azurewebsites.net/mcp/sse
```

### Option 2: Use Claude Desktop (if available)

Edit Claude config to add your MCP server:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "document-server": {
      "url": "https://mcp-server-app-davisanc.azurewebsites.net/mcp/sse",
      "transport": "sse"
    }
  }
}
```

### Option 3: Write a Test Script

```javascript
// test-mcp-client.js
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');

async function testMCP() {
  const transport = new SSEClientTransport(
    new URL('https://mcp-server-app-davisanc.azurewebsites.net/mcp/sse')
  );
  
  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  });
  
  await client.connect(transport);
  
  // List tools
  const tools = await client.listTools();
  console.log('Available tools:', tools);
  
  // Test list_documents
  const result = await client.callTool({
    name: 'list_documents',
    arguments: { sessionId: 'your-session-id' }
  });
  
  console.log('Result:', result);
}

testMCP();
```

---

## Success Criteria

✅ Agent successfully connects to MCP server  
✅ Agent can list documents in a session  
✅ Agent can retrieve document content  
✅ Agent can search across documents  
✅ Agent provides accurate answers based on document content  
✅ Server logs show MCP tool executions  

---

## Next Steps After Successful Test

1. **Upload More Documents** - Test with multiple documents
2. **Test Complex Queries** - Multi-document analysis
3. **Add Authentication** - Secure the MCP endpoint
4. **Monitor Usage** - Track tool calls via Application Insights
5. **Optimize Performance** - Add caching if needed
6. **Production Deployment** - Add persistent storage

---

## Resources

- **Your Web App:** https://mcp-server-app-davisanc.azurewebsites.net
- **MCP Endpoint:** https://mcp-server-app-davisanc.azurewebsites.net/mcp/sse
- **Azure AI Foundry:** https://ai.azure.com
- **MCP Specification:** https://spec.modelcontextprotocol.io/
- **Azure AI Agent Docs:** https://learn.microsoft.com/en-us/azure/ai-foundry/agents/

---

**Good luck with your testing! 🚀**
