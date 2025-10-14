// added debugging options

// require('dotenv').config();

const express = require('express');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const upload = multer();
const mammoth = require('mammoth');
const pptxParser = require('pptx-parser');
const csvParse = require('csv-parse/lib/sync');
const XLSX = require('xlsx');

const app = express();

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


app.post('/session', (req, res) => {
  const sid = uuidv4();
  sessions[sid] = { docs: [], history: [] };
  console.log(`✅ New session created: ${sid}`);
  res.json({ sessionId: sid });
});

app.post('/session/:sid/upload', upload.single('file'), async (req, res) => {
  const { sid } = req.params;
  if (!sessions[sid]) return res.status(404).send('Session not found');

  let text = '';
  let title = req.body.title || 'Untitled';

  if (req.file) {
    const mime = req.file.mimetype;
    const ext = (req.file.originalname || '').split('.').pop().toLowerCase();
    try {
      if (mime === 'text/plain' || ext === 'txt') {
        text = req.file.buffer.toString('utf8');
      } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx') {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        text = result.value;
      } else if (mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || ext === 'pptx') {
        const slides = await pptxParser.parse(req.file.buffer);
        text = slides.map(s => s.text).join('\n---\n');
      } else if (mime === 'text/csv' || ext === 'csv') {
        text = csvParse(req.file.buffer.toString('utf8')).map(row => row.join(', ')).join('\n');
      } else if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || ext === 'xlsx' || mime === 'application/vnd.ms-excel') {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        text = workbook.SheetNames.map(name => XLSX.utils.sheet_to_csv(workbook.Sheets[name])).join('\n');
      } else {
        return res.status(400).json({ error: 'Unsupported file type.' });
      }
    } catch (err) {
      return res.status(500).json({ error: 'Failed to parse file: ' + err.message });
    }
  } else {
    text = req.body.text || '';
  }

  if (!text) {
    return res.status(400).json({ error: 'No document text provided.' });
  }

  const docId = uuidv4();
  sessions[sid].docs.push({ id: docId, title, text });
  console.log(`📄 Uploaded document ${docId} to session ${sid}`);
  res.json({ docId });
});

app.post('/session/:sid/query', async (req, res) => {
  const { sid } = req.params;
  if (!sessions[sid]) return res.status(404).send('Session not found');

  const { docId, query, mode } = req.body;
  const doc = sessions[sid].docs.find(d => d.id === docId);
  if (!doc) return res.status(404).send('Document not found');

  const prompt = mode === 'qa'
    ? `Document:\n${doc.text}\n\nQuestion: ${query}\nAnswer:`
    : `Summarize the following document:\n\n${doc.text}\n\nSummary:`;

  const endpoint = process.env.FOUNDRY_ENDPOINT;
  const apiKey = process.env.FOUNDRY_API_KEY;

  // Log everything for debugging
  console.log("🔹 Sending request to Azure GPT-4o-mini...");
  console.log("Endpoint:", endpoint);
  console.log("Headers:", { "api-key": apiKey.substring(0, 10) + "..." });
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
