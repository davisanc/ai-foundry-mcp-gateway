# Azure AI Agent MCP Tool Response Bug Report

**Date:** November 9, 2025  
**Reporter:** David Sanchez  
**Severity:** Critical - Blocks MCP tool functionality  

## Executive Summary

Azure AI Agent's Model Context Protocol (MCP) integration has a critical bug where **all MCP tool calls return `null` output** regardless of whether the tool executes successfully. Additionally, when an MCP tool returns an error, **the agent hangs indefinitely in `in_progress` state** instead of handling the error gracefully.

## Environment Details

- **Azure AI Foundry Project:** davidsr-ai-project-resourcev2
- **Resource Group:** AI-RG
- **Agent ID:** asst_sHbLyHnSS9G9KpaAFd076PEY (document-analysis-agent)
- **MCP Server:** https://mcp-server-app-davisanc.azurewebsites.net/mcp/sse
- **MCP Server Code:** https://github.com/davisanc/ai-foundry-mcp-gateway

## Problem Description

### Issue 1: Tool Responses Return Null

When the Azure AI Agent calls any MCP tool, the tool executes successfully on the MCP server (confirmed by server logs and independent tests), but the agent **always receives `null` output**.

**Agent Playground Output:**
```json
{
  "type": "mcp",
  "name": "get_document",
  "arguments": "{\"sessionId\":\"b3d6bb63-94d9-4e02-9850-513f11ee8209\",\"docId\":\"1b08b1de-e9d8-4bec-abff-0bb5d10c72b4\"}",
  "output": null,
  "status": "Error",
  "description": "RequiresAction"
}
```

### Issue 2: Agent Hangs on Error Responses

When an MCP tool returns a JSON-RPC error (e.g., "Session not found"), the agent becomes stuck in `in_progress` state indefinitely instead of displaying the error to the user.

**Agent Thread Logs:**
```json
{
  "name": "tool_calls",
  "context": {
    "trace_id": "thread_GzZCnFSicfnItBjJ7zhWtWJz",
    "span_id": "step_i5LdUhSip6TaNqFZ5YlAjU3X",
    "thread_id": "thread_GzZCnFSicfnItBjJ7zhWtWJz"
  },
  "kind": "RunStep",
  "parent_id": "run_KrbQHPT4drxAzLyXduyv3pTA",
  "start_time": "2025-11-09T07:24:57.000Z",
  "end_time": "undefined",
  "status": {
    "status_code": "Error",
    "description": "in_progress"
  }
}
```

## Evidence: MCP Server Works Correctly

We created comprehensive tests proving the MCP server functions correctly:

### Test 1: Tool Discovery Works ✅
**File:** `test-mcp-connection.js`

```bash
node test-mcp-connection.js
```

**Result:** Agent successfully lists all 4 MCP tools:
- `list_documents`
- `get_document`
- `search_documents`
- `upload_document`

### Test 2: Small Document Retrieval Works ✅
**File:** `test-small-document.js`

```bash
node test-small-document.js
```

**Result:** Successfully uploaded and retrieved a 3-row CSV document.

**Output:**
```
✅ Small document uploaded with ID: 1b08b1de-e9d8-4bec-abff-0bb5d10c72b4
🎉 Successfully retrieved small document:
  ID: 1b08b1de-e9d8-4bec-abff-0bb5d10c72b4
  Title: small_test_doc
  Content: OrderID,Customer,Amount
ORD001,Alice,10.50
ORD002,Bob,20.75
ORD003,Charlie,15.25
```

### Test 3: Large Document Retrieval Works ✅
**File:** `test-get-document.js`

```bash
node test-get-document.js
```

**Result:** Successfully retrieved a 1000+ row CSV document with full content.

### Test 4: Error Handling Works ✅
**File:** `test-invalid-session.js`

```bash
node test-invalid-session.js
```

**Result:** MCP server correctly returns JSON-RPC error:
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32000,
    "message": "Session not found: 9da9c4ad-13b1-4a42-88b9-b8c31d9f722c"
  },
  "id": 1
}
```

## Expected Behavior

1. **Tool Success:** Agent should receive and display the tool's output
2. **Tool Error:** Agent should gracefully handle the error and display the error message to the user
3. **All tool responses** should be processed correctly regardless of size

## Actual Behavior

1. **Tool Success:** Agent receives `null` output and shows status "Error" / "RequiresAction"
2. **Tool Error:** Agent hangs indefinitely in `in_progress` state
3. **All tool calls fail** on the agent side despite working correctly on the server side

## Reproduction Steps

### Reproduce Issue 1 (Null Output)

1. Create an Azure AI Agent with MCP server configuration:
   - **URL:** `https://mcp-server-app-davisanc.azurewebsites.net/mcp/sse`
   
2. In Azure AI Foundry Agent Playground, create a session:
   ```
   Please create a new session for document analysis
   ```

3. Upload a small document:
   ```
   Upload a document with title "test" and text "Hello World"
   ```

4. Try to retrieve the document:
   ```
   Get the document I just uploaded
   ```

5. **Observe:** Agent returns null output despite tool executing successfully

### Reproduce Issue 2 (Hanging on Error)

1. Use the same agent setup
2. In the playground, ask:
   ```
   Get document with ID "invalid-id" from session "invalid-session"
   ```

3. **Observe:** Agent gets stuck in `in_progress` state forever

## Impact

- **MCP functionality is completely unusable** with Azure AI Agent
- Developers cannot build agents that use external tools via MCP
- This blocks the use case for document analysis, API integrations, and custom tool development

## Technical Analysis

The issue appears to be in the Azure AI Agent's MCP client implementation:

1. **SSE Connection Works:** The agent successfully connects to the MCP server (confirmed by `tools/list` working)
2. **Tool Execution Works:** The MCP server executes tools and sends responses via SSE
3. **Response Processing Fails:** The agent's MCP client either:
   - Doesn't read the SSE response for tool results, OR
   - Reads it but fails to parse/process it correctly

## Workaround

**None available.** The bug is in the platform, not user code.

## Requested Actions

1. **Fix the MCP client** in Azure AI Agent to properly process tool response SSE messages
2. **Add error handling** for when tools return JSON-RPC errors
3. **Add timeout handling** to prevent indefinite hanging
4. **Test with various response sizes** to ensure no size limits cause issues

## Additional Resources

- **GitHub Repository:** https://github.com/davisanc/ai-foundry-mcp-gateway
- **Test Scripts Location:** Root directory (`test-*.js` files)
- **MCP Server Logs:** Available via Azure App Service logs for `mcp-server-app-davisanc`

## Contact Information

**Name:** David Sanchez  
**GitHub:** davisanc  
**Availability:** Available for follow-up testing and providing additional details

---

## Appendix: Test Evidence

### A. MCP Server Response Format (Correct)

The MCP server sends responses in the correct JSON-RPC 2.0 format over SSE:

```
event: message
data: {"jsonrpc":"2.0","result":{"content":[{"type":"text","text":"{\"id\":\"1b08b1de-e9d8-4bec-abff-0bb5d10c72b4\",\"title\":\"small_test_doc\",\"text\":\"OrderID,Customer,Amount\\nORD001,Alice,10.50\\nORD002,Bob,20.75\\nORD003,Charlie,15.25\"}"}]},"id":3}
```

### B. Agent Configuration

```json
{
  "name": "document-analysis-agent",
  "instructions": "You are a document analysis assistant...",
  "tools": {
    "mcp_servers": {
      "document_mcp_server": {
        "url": "https://mcp-server-app-davisanc.azurewebsites.net/mcp/sse"
      }
    }
  }
}
```

### C. Server Logs Show Successful Execution

```
📨 MCP message received
🔧 Executing tool: get_document
📄 Session found, has 1 documents
✅ Document found: small_test_doc
✅ Tool get_document executed
```

Despite these logs showing success, the agent receives `null`.
