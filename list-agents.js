// List all assistants in the Azure AI project
const https = require('https');

const API_VERSION = '2024-07-01-preview';
const endpoint = 'https://davidsr-ai-project-resourcev2.cognitiveservices.azure.com';
const apiKey = process.env.AZURE_OPENAI_API_KEY;

if (!apiKey) {
  console.error('❌ AZURE_OPENAI_API_KEY environment variable not set');
  process.exit(1);
}

console.log('📋 Listing all assistants...\n');

const url = new URL(`${endpoint}/openai/assistants?api-version=${API_VERSION}`);

const req = https.request({
  hostname: url.hostname,
  path: url.pathname + url.search,
  method: 'GET',
  headers: {
    'api-key': apiKey,
  },
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error(`❌ Failed to list assistants: ${res.statusCode}`);
      console.error(data);
      return;
    }
    
    const response = JSON.parse(data);
    
    if (response.data && response.data.length > 0) {
      console.log(`✅ Found ${response.data.length} assistant(s):\n`);
      response.data.forEach(assistant => {
        console.log(`ID: ${assistant.id}`);
        console.log(`Name: ${assistant.name || '(no name)'}`);
        console.log(`Model: ${assistant.model}`);
        console.log(`Created: ${new Date(assistant.created_at * 1000).toISOString()}`);
        
        if (assistant.tools && assistant.tools.length > 0) {
          console.log(`Tools: ${assistant.tools.map(t => t.type).join(', ')}`);
        }
        
        console.log('---');
      });
    } else {
      console.log('No assistants found.');
    }
  });
});

req.on('error', err => {
  console.error('❌ Error:', err.message);
});

req.end();
