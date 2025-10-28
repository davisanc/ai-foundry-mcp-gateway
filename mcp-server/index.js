// added debugging options

//test to trigger pipeline

// require('dotenv').config();

const express = require('express');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { createMCPServer } = require('./mcp-handler');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
// ...existing code...

const app = express();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Accept only txt and csv files
    const allowedTypes = ['.txt', '.csv'];
    const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt and .csv files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Serve static files from /public (index.html is our landing page)
app.use(express.static('public'));


app.use(express.json());

const sessions = {}; // In-memory store (for demo)

// Health / landing page
app.get('/', (_, res) => {
  res.type('text/plain').send('MCP server OK');
});

// (Optional) a dedicated health endpoint for probes/APIM
app.get('/healthz', (_, res) => res.json({ status: 'ok' }));

// ==================== MCP ENDPOINT ====================
// SSE endpoint for Model Context Protocol
app.get('/mcp/sse', async (req, res) => {
  console.log('🔌 MCP SSE connection initiated');
  
  const transport = new SSEServerTransport('/mcp/message', res);
  const mcpServer = createMCPServer(sessions);
  
  await mcpServer.connect(transport);
  
  console.log('✅ MCP server connected via SSE');
});

app.post('/mcp/message', async (req, res) => {
  // This endpoint receives messages from the MCP client
  // The SSE transport handles the actual message processing
  console.log('📨 MCP message received:', req.body);
  res.json({ received: true });
});
// ==================== END MCP ENDPOINT ====================


app.post('/session', (req, res) => {
  const sid = uuidv4();
  sessions[sid] = { docs: [], history: [] };
  console.log(`✅ New session created: ${sid}`);
  res.json({ sessionId: sid });
});

app.post('/session/:sid/upload', (req, res) => {
  const { sid } = req.params;
  if (!sessions[sid]) return res.status(404).send('Session not found');

  const { text, title } = req.body;
  const docId = uuidv4();
  sessions[sid].docs.push({ id: docId, title, text });
  console.log(`📄 Uploaded document ${docId} to session ${sid}`);
  res.json({ docId });
});

// New endpoint for file uploads
app.post('/session/:sid/upload-file', upload.single('file'), (req, res) => {
  const { sid } = req.params;
  if (!sessions[sid]) return res.status(404).send('Session not found');

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const text = req.file.buffer.toString('utf-8');
    const title = req.body.title || req.file.originalname;
    const docId = uuidv4();
    
    sessions[sid].docs.push({ id: docId, title, text });
    console.log(`📁 Uploaded file ${req.file.originalname} (${docId}) to session ${sid}`);
    res.json({ docId, filename: req.file.originalname });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: 'Failed to process file' });
  }
});

app.post('/session/:sid/query', async (req, res) => {
  const { sid } = req.params;
  if (!sessions[sid]) return res.status(404).send('Session not found');

  const { docId, query, mode } = req.body;
  const doc = sessions[sid].docs.find(d => d.id === docId);
  if (!doc) return res.status(404).send('Document not found');

  // ...existing code...

  const prompt = mode === 'qa'
    ? `Document:\n${doc.text}\n\nQuestion: ${query}\nAnswer:`
    : `Summarize the following document:\n\n${doc.text}\n\nSummary:`;

  const endpoint = process.env.FOUNDRY_ENDPOINT;
  const apiKey = process.env.FOUNDRY_API_KEY;

  // Log everything for debugging
  console.log("🔹 Sending request to Azure GPT-4o-mini...");
  console.log("Endpoint:", endpoint);
  console.log("Headers:", { "api-key": apiKey ? apiKey.substring(0, 10) + "..." : '[NO KEY]' });
  console.log("Request body:", JSON.stringify({
    messages: [{ role: "user", content: prompt }],
    max_tokens: 300
  }, null, 2));

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300
      })
    });

    const data = await response.json();

    console.log("🔹 Raw Azure response:");
    console.log(JSON.stringify(data, null, 2));

    let assistantMessage = data?.choices?.[0]?.message?.content ||
                           data?.choices?.[0]?.content ||
                           data?.error?.message ||
                           "No response from model";

    sessions[sid].history.push({ query, response: assistantMessage });
    res.json({ answer: assistantMessage });

  } catch (err) {
    console.error("❌ Error during fetch:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 MCP server listening on port ${PORT}`));