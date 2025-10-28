// MCP (Model Context Protocol) Handler
// This module implements MCP protocol for Azure AI Agents to interact with document store

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

/**
 * Create an MCP server instance that provides document management tools
 * @param {Object} sessions - Shared sessions object from main Express app
 * @returns {Server} MCP Server instance
 */
function createMCPServer(sessions) {
  const server = new Server(
    {
      name: 'ai-foundry-mcp-gateway',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // ==================== TOOLS ====================
  
  // List all available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'list_documents',
          description: 'List all documents in a session with their IDs and titles',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'The session ID to list documents from',
              },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'get_document',
          description: 'Retrieve the full content of a specific document by ID',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'The session ID containing the document',
              },
              docId: {
                type: 'string',
                description: 'The document ID to retrieve',
              },
            },
            required: ['sessionId', 'docId'],
          },
        },
        {
          name: 'search_documents',
          description: 'Search for documents containing specific text across all sessions or a specific session',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The text to search for in documents',
              },
              sessionId: {
                type: 'string',
                description: 'Optional: limit search to a specific session',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'upload_document',
          description: 'Upload a new document to a session',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'The session ID to upload the document to',
              },
              title: {
                type: 'string',
                description: 'The title/name of the document',
              },
              text: {
                type: 'string',
                description: 'The full text content of the document',
              },
            },
            required: ['sessionId', 'title', 'text'],
          },
        },
      ],
    };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    console.log(`🔧 MCP Tool called: ${name}`, args);

    try {
      switch (name) {
        case 'list_documents':
          return await handleListDocuments(sessions, args);
        
        case 'get_document':
          return await handleGetDocument(sessions, args);
        
        case 'search_documents':
          return await handleSearchDocuments(sessions, args);
        
        case 'upload_document':
          return await handleUploadDocument(sessions, args);
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      console.error(`❌ Error executing MCP tool ${name}:`, error);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // ==================== RESOURCES ====================
  
  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = [];
    
    // Create a resource for each session
    for (const [sessionId, session] of Object.entries(sessions)) {
      resources.push({
        uri: `session://${sessionId}`,
        name: `Session ${sessionId}`,
        description: `Session with ${session.docs.length} document(s)`,
        mimeType: 'application/json',
      });
    }
    
    return { resources };
  });

  // Read a resource
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    
    // Parse session:// URIs
    if (uri.startsWith('session://')) {
      const sessionId = uri.replace('session://', '');
      const session = sessions[sessionId];
      
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }
      
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              sessionId,
              documentCount: session.docs.length,
              documents: session.docs.map(d => ({
                id: d.id,
                title: d.title,
                textLength: d.text.length,
              })),
            }, null, 2),
          },
        ],
      };
    }
    
    throw new Error(`Unknown resource URI: ${uri}`);
  });

  return server;
}

// ==================== TOOL HANDLERS ====================

async function handleListDocuments(sessions, args) {
  const { sessionId } = args;
  const session = sessions[sessionId];
  
  if (!session) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: Session not found: ${sessionId}`,
        },
      ],
      isError: true,
    };
  }
  
  const docList = session.docs.map(doc => ({
    id: doc.id,
    title: doc.title,
    textLength: doc.text.length,
  }));
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          sessionId,
          documentCount: docList.length,
          documents: docList,
        }, null, 2),
      },
    ],
  };
}

async function handleGetDocument(sessions, args) {
  const { sessionId, docId } = args;
  const session = sessions[sessionId];
  
  if (!session) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: Session not found: ${sessionId}`,
        },
      ],
      isError: true,
    };
  }
  
  const doc = session.docs.find(d => d.id === docId);
  
  if (!doc) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: Document not found: ${docId}`,
        },
      ],
      isError: true,
    };
  }
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          id: doc.id,
          title: doc.title,
          text: doc.text,
        }, null, 2),
      },
    ],
  };
}

async function handleSearchDocuments(sessions, args) {
  const { query, sessionId } = args;
  const results = [];
  const searchLower = query.toLowerCase();
  
  // Determine which sessions to search
  const sessionsToSearch = sessionId 
    ? { [sessionId]: sessions[sessionId] }
    : sessions;
  
  for (const [sid, session] of Object.entries(sessionsToSearch)) {
    if (!session) continue;
    
    for (const doc of session.docs) {
      if (doc.text.toLowerCase().includes(searchLower) || 
          doc.title.toLowerCase().includes(searchLower)) {
        
        // Find the context around the match
        const index = doc.text.toLowerCase().indexOf(searchLower);
        const start = Math.max(0, index - 50);
        const end = Math.min(doc.text.length, index + query.length + 50);
        const snippet = doc.text.substring(start, end);
        
        results.push({
          sessionId: sid,
          docId: doc.id,
          title: doc.title,
          snippet: `...${snippet}...`,
        });
      }
    }
  }
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          query,
          resultCount: results.length,
          results,
        }, null, 2),
      },
    ],
  };
}

async function handleUploadDocument(sessions, args) {
  const { sessionId, title, text } = args;
  const session = sessions[sessionId];
  
  if (!session) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: Session not found: ${sessionId}`,
        },
      ],
      isError: true,
    };
  }
  
  const { v4: uuidv4 } = require('uuid');
  const docId = uuidv4();
  
  session.docs.push({ id: docId, title, text });
  
  console.log(`📄 MCP uploaded document ${docId} to session ${sessionId}`);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          docId,
          title,
          sessionId,
        }, null, 2),
      },
    ],
  };
}

module.exports = { createMCPServer };
