# MCP Integration Guide

## Overview

This server now supports **two modes** of operation:

1. **REST API Mode** (Original) - Direct HTTP endpoints for web UI
2. **MCP Protocol Mode** (New) - Model Context Protocol for Azure AI Agents

## Architecture

```
┌─────────────┐                    ┌──────────────────────┐
│   Web UI    │──── HTTP REST ────▶│                      │
│ (Browser)   │                    │   Express Server     │
└─────────────┘                    │   (index.js)         │
                                   │                      │
┌─────────────┐                    │  ┌────────────────┐  │
│  Azure AI   │──── MCP/SSE ──────▶│  │  MCP Handler   │  │
│   Agent     │                    │  │ (mcp-handler)  │  │
└─────────────┘                    │  └────────────────┘  │
                                   │          │           │
                                   │          ▼           │
                                   │   Document Store     │
                                   │   (sessions)         │
                                   └──────────────────────┘
```

## MCP Tools Available

The MCP server exposes 4 tools that Azure AI Agents can call:

### 1. `list_documents`
Lists all documents in a session.

**Input:**
```json
{
  "sessionId": "abc-123"
}
```

**Output:**
```json
{
  "sessionId": "abc-123",
  "documentCount": 2,
  "documents": [
    {
      "id": "doc-001",
      "title": "Security Policy",
      "textLength": 1024
    }
  ]
}
```

### 2. `get_document`
Retrieves the full content of a specific document.

**Input:**
```json
{
  "sessionId": "abc-123",
  "docId": "doc-001"
}
```

**Output:**
```json
{
  "id": "doc-001",
  "title": "Security Policy",
  "text": "Full document text here..."
}
```

### 3. `search_documents`
Searches for text across documents.

**Input:**
```json
{
  "query": "password",
  "sessionId": "abc-123"  // optional
}
```

**Output:**
```json
{
  "query": "password",
  "resultCount": 1,
  "results": [
    {
      "sessionId": "abc-123",
      "docId": "doc-001",
      "title": "Security Policy",
      "snippet": "...use strong passwords..."
    }
  ]
}
```

### 4. `upload_document`
Uploads a new document to a session.

**Input:**
```json
{
  "sessionId": "abc-123",
  "title": "New Policy",
  "text": "Document content..."
}
```

**Output:**
```json
{
  "success": true,
  "docId": "doc-002",
  "title": "New Policy",
  "sessionId": "abc-123"
}
```

## MCP Resources

The server also exposes resources via the `session://` URI scheme:

- `session://{sessionId}` - Returns metadata about a session

## Setting Up Azure AI Agent

### Step 1: Deploy Your MCP Server

Your server is already deployed at:
```
https://mcp-server-app-davisanc.azurewebsites.net
```

The MCP endpoint is available at:
```
https://mcp-server-app-davisanc.azurewebsites.net/mcp/sse
```

### Step 2: Create an Azure AI Agent

1. Go to **Azure AI Foundry** portal: https://ai.azure.com
2. Navigate to your project
3. Click **Agents** in the left menu
4. Click **+ Create agent**
5. Fill in:
   - **Name**: Document Analysis Agent
   - **Description**: Agent that can analyze uploaded documents
   - **Instructions**: "You are a helpful assistant that can access and analyze documents. Use the available tools to retrieve and search document content."

### Step 3: Connect MCP Server to Agent

1. In the agent configuration, go to **Tools** section
2. Click **+ Add tool**
3. Select **Model Context Protocol (MCP)**
4. Configure the MCP connection:
   ```json
   {
     "type": "mcp",
     "name": "document-server",
     "description": "Access to uploaded documents",
     "url": "https://mcp-server-app-davisanc.azurewebsites.net/mcp/sse",
     "transport": "sse"
   }
   ```

### Step 4: Test the Agent

1. Upload a document via the web UI:
   - Go to: https://mcp-server-app-davisanc.azurewebsites.net
   - Create a session (automatic)
   - Upload a document (note the sessionId and docId)

2. In the Azure AI Agent chat, ask:
   ```
   Can you list the documents in session {sessionId}?
   ```

3. The agent will use the `list_documents` tool to retrieve the information

4. Try more complex queries:
   ```
   Can you get document {docId} from session {sessionId} and summarize it?
   ```
   
   ```
   Search all documents for the word "security" and tell me what you find.
   ```

## Example Agent Conversation

**User**: "I just uploaded a security policy document. Can you analyze it?"

**Agent** (thinking): 
- User mentioned a document, I should list available documents
- Calls `list_documents` tool
- Gets back document list
- Calls `get_document` tool with the document ID
- Receives the full document text
- Analyzes and summarizes

**Agent** (responds): "I found your security policy document. It covers password requirements (minimum 12 characters), multi-factor authentication, and lists required network ports including HTTPS (443), SSH (22), and RDP (3389) for internal use only..."

## MCP vs REST API

| Feature | REST API | MCP Protocol |
|---------|----------|--------------|
| **Client** | Web Browser | Azure AI Agent |
| **Transport** | HTTP JSON | SSE + JSON |
| **Authentication** | Session-based | Tool-based |
| **Use Case** | Direct user interaction | AI-driven analysis |
| **Endpoints** | `/session/*` | `/mcp/sse` |

## Testing Locally

1. Start the server:
```bash
cd mcp-server
npm start
```

2. The server will be available at:
   - REST API: http://localhost:3000
   - MCP endpoint: http://localhost:3000/mcp/sse

3. Test the structure:
```bash
node test-mcp-tools.js
```

## Troubleshooting

### Agent can't connect to MCP server

- Verify the URL is correct and includes `/mcp/sse`
- Check that the server is running and accessible
- Look at server logs for connection attempts

### Tools not working

- Check server logs for tool execution errors
- Verify sessionId and docId are valid
- Ensure documents have been uploaded first

### No documents found

- Create a session first via the web UI or REST API
- Upload documents via the web UI or use the `upload_document` tool
- Check that you're using the correct sessionId

## Security Considerations

1. **Session IDs**: Currently no authentication - sessions are accessible by anyone with the ID
2. **APIM**: Consider enabling subscription keys for production
3. **Data persistence**: Sessions are in-memory only (lost on restart)
4. **Rate limiting**: Consider adding rate limits for production use

## Next Steps

1. ✅ MCP server is deployed and running
2. ✅ Tools are defined and tested
3. ⏭️ Create an Azure AI Agent
4. ⏭️ Connect the agent to your MCP server
5. ⏭️ Upload documents and test agent interactions
6. ⏭️ Add authentication/authorization if needed
7. ⏭️ Consider persistent storage (Azure Storage, Cosmos DB)

## References

- [Azure AI Foundry MCP Documentation](https://learn.microsoft.com/en-us/azure/ai-foundry/agents/how-to/tools/model-context-protocol)
- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
