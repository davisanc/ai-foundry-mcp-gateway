# AI Foundry MCP Gateway - Architecture Documentation

**Project:** ai-foundry-mcp-gateway  
**Owner:** davisanc  
**Date:** November 4, 2025  
**Version:** 1.0 with MCP Integration

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Component Details](#component-details)
4. [Data Flow](#data-flow)
5. [API Endpoints](#api-endpoints)
6. [Model Context Protocol Integration](#model-context-protocol-integration)
7. [Azure Deployment](#azure-deployment)
8. [Security](#security)
9. [Use Cases](#use-cases)
10. [Future Enhancements](#future-enhancements)

---

## Executive Summary

The **AI Foundry MCP Gateway** is a dual-mode document analysis server deployed on Azure that enables:

1. **Direct User Interaction** via a web-based UI for uploading and querying documents
2. **AI Agent Integration** via the Model Context Protocol (MCP) for automated document analysis

The system bridges human users and AI agents, providing a unified document storage and retrieval service backed by Azure AI Foundry's GPT-4o-mini language model.

### Key Capabilities

- ✅ Upload documents (text, TXT, CSV files)
- ✅ Query documents using natural language
- ✅ Summarize document content
- ✅ Search across multiple documents
- ✅ Expose document data to Azure AI Agents via MCP protocol
- ✅ Session-based document management
- ✅ API gateway protection via Azure APIM

---

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────┐
│                     │
│   End Users         │
│                     │
└──────────┬──────────┘
           │
           │ HTTPS
           ▼
┌─────────────────────┐         ┌──────────────────────┐
│                     │         │                      │
│   Azure APIM        │◄────────│  Azure AI Agent      │
│   (API Gateway)     │         │  (MCP Client)        │
│                     │         │                      │
└──────────┬──────────┘         └──────────────────────┘
           │                              │
           │ Forwards                     │ MCP/SSE
           │                              │
           ▼                              │
┌─────────────────────────────────────────┴──────┐
│                                                 │
│   Azure Web App (Node.js Express)              │
│   mcp-server-app-davisanc.azurewebsites.net    │
│                                                 │
│   ┌──────────────┐      ┌──────────────┐      │
│   │  REST API    │      │  MCP Server  │      │
│   │  Endpoints   │      │  (SSE)       │      │
│   └──────┬───────┘      └──────┬───────┘      │
│          │                     │               │
│          └─────────┬───────────┘               │
│                    │                           │
│          ┌─────────▼─────────┐                │
│          │  Document Store    │                │
│          │  (In-Memory)       │                │
│          │  sessions{}        │                │
│          └─────────┬─────────┘                │
│                    │                           │
└────────────────────┼───────────────────────────┘
                     │
                     │ HTTP POST
                     ▼
           ┌─────────────────────┐
           │                     │
           │  Azure AI Foundry   │
           │  GPT-4o-mini        │
           │  Inference Endpoint │
           │                     │
           └─────────────────────┘
```

### Architecture Layers

| Layer | Component | Purpose |
|-------|-----------|---------|
| **Presentation** | Web UI (HTML/JS) | User interface for document upload and queries |
| **API Gateway** | Azure APIM | Rate limiting, authentication, monitoring |
| **Application** | Express.js Server | REST API + MCP protocol handler |
| **Storage** | In-Memory Sessions | Temporary document storage |
| **AI/ML** | Azure AI Foundry | Language model for Q&A and summarization |

---

## Component Details

### 1. Web Application (Azure Web App)

**Technology Stack:**
- **Runtime:** Node.js v14+
- **Framework:** Express.js
- **Frontend:** Vanilla HTML/CSS/JavaScript
- **File Upload:** Multer middleware
- **MCP SDK:** @modelcontextprotocol/sdk

**Key Files:**
```
mcp-server/
├── index.js              # Main Express server
├── mcp-handler.js        # MCP protocol implementation
├── package.json          # Dependencies
└── public/
    └── index.html        # Web UI
```

**Environment Variables:**
- `FOUNDRY_ENDPOINT` - Azure AI Foundry API endpoint
- `PORT` - Server port (default: 3000)

**Authentication:**
- Uses system-assigned managed identity (no API keys needed)
- Automatically acquires Azure tokens via `@azure/identity`

### 2. Azure API Management (APIM)

**Instance Name:** `mcp-apim-davisancv2`

**Purpose:**
- Acts as a reverse proxy
- Provides subscription key management
- Enables rate limiting and quotas
- Centralizes API monitoring and logging

**Configuration:**
```yaml
Name: mcp-apim-davisancv2
Tier: Consumption
Backend: mcp-server-app-davisanc.azurewebsites.net
Subscription Keys: Optional (can be disabled)
```

### 3. Azure AI Foundry

**Model:** GPT-4o-mini

**Usage:**
- Answers questions about uploaded documents
- Generates document summaries
- Provides natural language understanding

**Integration:**
- REST API calls via `node-fetch`
- Authentication via managed identity (Azure SDK)
- Acquires bearer tokens automatically
- Request format: OpenAI-compatible chat completions

### 4. Document Store (In-Memory)

**Structure:**
```javascript
sessions = {
  "session-uuid-1": {
    docs: [
      {
        id: "doc-uuid-1",
        title: "Security Policy",
        text: "Full document text..."
      }
    ],
    history: [
      {
        query: "What are the password requirements?",
        response: "Minimum 12 characters..."
      }
    ]
  }
}
```

**Characteristics:**
- ✅ Fast access (in-memory)
- ✅ Session-based isolation
- ⚠️ Lost on server restart
- ⚠️ Not suitable for production persistence

---

## Data Flow

### Scenario 1: User Uploads Document and Asks Question

```
1. User opens Web UI
   └─► Browser loads https://mcp-server-app-davisanc.azurewebsites.net

2. Auto-create session
   ├─► POST /session
   └─► Returns sessionId: "abc-123"

3. User uploads TXT file
   ├─► POST /session/abc-123/upload-file
   ├─► Server extracts text from file
   ├─► Generates docId: "doc-456"
   └─► Stores in sessions[abc-123].docs[]

4. User asks: "What are the main points?"
   ├─► POST /session/abc-123/query
   ├─► Server retrieves doc-456 content
   ├─► Builds prompt: "Summarize: [document text]"
   ├─► POST to Azure AI Foundry
   ├─► Receives AI-generated summary
   └─► Returns answer to browser

5. Display answer to user
```

### Scenario 2: Azure AI Agent Uses MCP

```
1. Azure AI Agent connects to MCP endpoint
   ├─► GET /mcp/sse (Server-Sent Events)
   └─► Server creates persistent SSE stream with unique connectionId

2. Agent discovers available tools
   ├─► Sends: tools/list message via POST /mcp/message
   ├─► Server receives message on same connectionId
   ├─► Response sent back through SSE stream
   └─► Agent receives tool list: list_documents, get_document, 
                                  search_documents, upload_document

3. User asks Agent: "Analyze the security policy"
   └─► Agent thinks: "I need to find and retrieve documents"

4. Agent calls MCP tool: list_documents
   ├─► Sends: tools/call message via POST /mcp/message?sessionId={connectionId}
   ├─► MCP handler executes tool
   ├─► Response written to SSE stream: event: message, data: {jsonrpc response}
   ├─► Agent receives via SSE stream: [{id: "doc-456", title: "Security Policy"}]
   └─► POST request closes

5. Agent calls MCP tool: get_document
   ├─► Arguments: {sessionId: "abc-123", docId: "doc-456"}
   ├─► Sends: tools/call message via POST /mcp/message?sessionId={connectionId}
   ├─► MCP handler retrieves from sessions[abc-123].docs
   ├─► Response written to SSE stream
   ├─► Agent receives full document text via SSE stream
   └─► POST request closes

6. Agent analyzes document content
   └─► Agent responds to user with insights
```

**CRITICAL:** All tool responses (both tools/list and tools/call) are sent back through the original SSE connection established in step 1, NOT through the POST response. The agent listens on the SSE stream for all MCP server responses.

---

## API Endpoints

### REST API Endpoints (For Web UI)

#### 1. Create Session
```
POST /session

Response:
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### 2. Upload Document (Text)
```
POST /session/{sessionId}/upload

Body:
{
  "title": "Company Policy",
  "text": "Policy document content..."
}

Response:
{
  "docId": "660e8400-e29b-41d4-a716-446655440000"
}
```

#### 3. Upload Document (File)
```
POST /session/{sessionId}/upload-file

Content-Type: multipart/form-data

Form Data:
- file: [TXT or CSV file]
- title: "Optional title"

Response:
{
  "docId": "660e8400-e29b-41d4-a716-446655440000",
  "filename": "policy.txt"
}
```

#### 4. Query Document
```
POST /session/{sessionId}/query

Body:
{
  "docId": "660e8400-e29b-41d4-a716-446655440000",
  "query": "What are the security requirements?",
  "mode": "qa"  // or omit for summary
}

Response:
{
  "answer": "The security requirements include..."
}
```

#### 5. Health Check
```
GET /healthz

Response:
{
  "status": "ok"
}
```

### MCP Endpoints (For AI Agents)

#### 1. MCP SSE Connection
```
GET /mcp/sse

Response: Server-Sent Events stream
Content-Type: text/event-stream
```

#### 2. MCP Message Handler
```
POST /mcp/message

Body: MCP protocol messages (JSON-RPC)
```

---

## Model Context Protocol Integration

### MCP Communication Architecture

The MCP server uses a **hybrid HTTP/SSE pattern** for communication:

```
Agent                          Server
  │                              │
  ├──── GET /mcp/sse ───────────►│ (1) Create SSE stream
  │                              │     Return connectionId
  │◄─────── SSE Stream ──────────┤ (2) Keep-alive connection
  │  (long-lived, persistent)     │
  │                              │
  ├──── POST /mcp/message ──────►│ (3) Send tool request
  │  ?sessionId={connectionId}   │     (tools/list, tools/call)
  │                              │
  │                              │ (4) Execute tool
  │                              │
  │◄─── SSE Event (response) ────┤ (5) Send response via SSE
  │  event: message              │     stream
  │  data: {jsonrpc response}    │
  │                              │
```

**Key Points:**
1. **Connection Establishment** - Agent initiates GET /mcp/sse to create persistent SSE stream
2. **Request Delivery** - Tool requests sent via POST /mcp/message with connectionId
3. **Response Delivery** - **CRITICAL** - All responses sent back through the SSE stream, NOT the POST response
4. **Stream Persistence** - SSE stream remains open until agent disconnects

### What is MCP?

The **Model Context Protocol (MCP)** is a standard protocol that allows AI agents to:
- Discover available tools and resources
- Call tools to retrieve information
- Access external data sources

### MCP Tools Implemented

#### 1. `list_documents`

**Description:** Lists all documents in a session

**Input Schema:**
```json
{
  "sessionId": "string (required)"
}
```

**Output:**
```json
{
  "sessionId": "abc-123",
  "documentCount": 2,
  "documents": [
    {
      "id": "doc-456",
      "title": "Security Policy",
      "textLength": 1024
    }
  ]
}
```

#### 2. `get_document`

**Description:** Retrieves full document content

**Input Schema:**
```json
{
  "sessionId": "string (required)",
  "docId": "string (required)"
}
```

**Output:**
```json
{
  "id": "doc-456",
  "title": "Security Policy",
  "text": "Full document content here..."
}
```

#### 3. `search_documents`

**Description:** Searches for text across documents

**Input Schema:**
```json
{
  "query": "string (required)",
  "sessionId": "string (optional)"
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
      "docId": "doc-456",
      "title": "Security Policy",
      "snippet": "...use strong passwords..."
    }
  ]
}
```

#### 4. `upload_document`

**Description:** Uploads a new document via MCP

**Input Schema:**
```json
{
  "sessionId": "string (required)",
  "title": "string (required)",
  "text": "string (required)"
}
```

**Output:**
```json
{
  "success": true,
  "docId": "doc-789",
  "title": "New Document",
  "sessionId": "abc-123"
}
```

### MCP Resources

**Resource URI Scheme:** `session://{sessionId}`

**Example:**
```
URI: session://abc-123

Returns:
{
  "sessionId": "abc-123",
  "documentCount": 2,
  "documents": [...]
}
```

---

## Azure Deployment

### Deployment Pipeline

**CI/CD:** GitHub Actions

**Workflow File:** `.github/workflows/deploy.yml`

**Trigger:** Push to `main` branch

**Steps:**
1. Checkout code
2. Set up Node.js
3. Install dependencies (`npm install`)
4. Build application
5. Deploy to Azure Web App
6. Create/Update Azure APIM
7. Import OpenAPI specification

### Azure Resources

| Resource | Name | Type | Purpose |
|----------|------|------|---------|
| Resource Group | `ai-mcp-rg` | Container | Groups all resources |
| Web App | `mcp-server-app-davisanc` | App Service | Hosts Node.js application |
| APIM | `mcp-apim-davisancv2` | API Management | API gateway |
| AI Foundry | (Project-based) | AI Service | GPT-4o-mini endpoint |

### Environment Configuration

**Azure Web App Settings:**
```
FOUNDRY_ENDPOINT=https://[your-project].openai.azure.com/openai/deployments/[model]/chat/completions?api-version=2024-08-01-preview
```

**Authentication:**
- Web App has system-assigned managed identity
- RBAC roles assigned: `Cognitive Services OpenAI Contributor`, `Azure AI User`
- No API keys stored in configuration
- Tokens acquired automatically via Azure SDK

---

## Security

### Current Security Measures

1. **HTTPS Only**
   - All traffic encrypted via TLS
   - Azure-managed certificates

2. **Managed Identity Authentication**
   - No API keys stored in configuration
   - System-assigned identity for web app
   - Automatic token acquisition via Azure SDK

3. **RBAC (Role-Based Access Control)**
   - Web app can only access Foundry resource it has roles for
   - Roles: `Cognitive Services OpenAI Contributor`, `Azure AI User`
   - Credentials never exposed in logs or configuration

4. **CORS**
   - Configured in Express server
   - Controls which origins can access API

5. **Input Validation**
   - File type restrictions (TXT, CSV only)
   - File size limits (10MB max)

### Security Considerations

⚠️ **Current Limitations:**

1. **No User Authentication**
   - Sessions accessible by anyone with session ID
   - No login system implemented

2. **In-Memory Storage**
   - Data lost on restart
   - No encryption at rest

3. **Session Management**
   - No expiration policy
   - Potential memory exhaustion

### Managed Identity Security Benefits

✅ **Advantages over API Keys:**

1. **No Secrets in Code**
   - Credentials not stored in configuration files or code
   - Reduces exposure surface

2. **Automatic Token Rotation**
   - Azure manages token lifecycle
   - No manual key rotation needed

3. **Auditable Access**
   - All Foundry access logged to Azure Activity Log
   - RBAC assignments tracked and auditable

4. **Least Privilege**
   - Web app only has access to Foundry resource
   - Roles limited to specific operations needed

### Recommended Enhancements

1. **Add Authentication**
   - Microsoft Entra ID (Azure AD)
   - OAuth 2.0 / JWT tokens
   - APIM subscription keys

2. **Persistent Storage**
   - Azure Cosmos DB for session data
   - Azure Blob Storage for documents
   - Encryption at rest

3. **Rate Limiting**
   - APIM policies
   - Per-user quotas
   - DDoS protection

4. **Audit Logging**
   - Azure Application Insights
   - Log all document access
   - Monitor AI API usage

---

## Use Cases

### Use Case 1: Manual Document Analysis

**Actor:** Business User

**Scenario:**
1. User uploads company policy document (TXT file)
2. Asks: "What are the password requirements?"
3. System uses GPT-4o-mini to extract answer
4. User receives: "Minimum 12 characters, must include..."

**Benefits:**
- No need to read entire document
- Natural language interface
- Fast information retrieval

### Use Case 2: Automated Compliance Checking

**Actor:** Azure AI Agent

**Scenario:**
1. Agent connects via MCP
2. Searches for "compliance" across all documents
3. Retrieves relevant sections
4. Analyzes against compliance framework
5. Generates compliance report

**Benefits:**
- Automated analysis
- Consistent checking
- Scalable to many documents

### Use Case 3: Document Summarization

**Actor:** Executive

**Scenario:**
1. Upload lengthy report
2. Request summary (no query, just mode="summary")
3. Receive concise overview

**Benefits:**
- Save time reading
- Get key points quickly
- AI-powered extraction

---

## Future Enhancements

### Phase 1: Production Readiness

- [ ] Add persistent storage (Cosmos DB)
- [ ] Implement user authentication (Entra ID)
- [ ] Add session expiration and cleanup
- [ ] Enable APIM subscription keys
- [ ] Set up Application Insights monitoring

### Phase 2: Enhanced Features

- [ ] Support additional file formats (PDF, DOCX, PPTX)
- [ ] Add document versioning
- [ ] Implement document tagging/categories
- [ ] Multi-document conversations
- [ ] Export conversation history

### Phase 3: Advanced AI

- [ ] Use Azure AI Search for better document retrieval
- [ ] Add embeddings for semantic search
- [ ] Support larger context windows
- [ ] Multi-language support
- [ ] Custom fine-tuned models

### Phase 4: Enterprise Features

- [ ] Multi-tenancy support
- [ ] Role-based access control (RBAC)
- [ ] Audit trail and compliance reporting
- [ ] Integration with SharePoint/OneDrive
- [ ] Slack/Teams bot integration

---

## Appendix A: Technology Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Runtime | Node.js | 14+ |
| Web Framework | Express.js | 4.18.2 |
| File Upload | Multer | 2.0.2 |
| HTTP Client | node-fetch | 2.6.7 |
| MCP SDK | @modelcontextprotocol/sdk | Latest |
| UUID Generation | uuid | 9.0.0 |
| Cloud Platform | Microsoft Azure | - |
| CI/CD | GitHub Actions | - |
| AI Model | GPT-4o-mini | Azure AI Foundry |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **APIM** | Azure API Management - API gateway service |
| **MCP** | Model Context Protocol - Standard for AI agent tool integration |
| **SSE** | Server-Sent Events - HTTP streaming protocol |
| **Session** | Temporary container for uploaded documents |
| **Tool** | MCP function that AI agents can call |
| **Resource** | MCP data source accessible via URI |
| **Azure AI Foundry** | Microsoft's AI development platform |

---

## Appendix C: Support and Maintenance

**Repository:** https://github.com/davisanc/ai-foundry-mcp-gateway

**Documentation:**
- `README.md` - Project overview
- `MCP_INTEGRATION.md` - MCP setup guide
- `ARCHITECTURE.md` - This document

**Contact:**
- Owner: davisanc
- Issues: GitHub Issues

---

**Document Version:** 1.0  
**Last Updated:** November 4, 2025  
**Status:** Active Development
