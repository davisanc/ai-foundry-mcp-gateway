// Test the Azure AI Agent with MCP tools
const https = require('https');

const AGENT_ID = 'asst_sHbLyHnSS9G9KpaAFd076PEY';
const API_VERSION = '2024-07-01-preview';

// Get credentials from environment or use defaults
const endpoint = process.env.AZURE_OPENAI_ENDPOINT || 'https://davidsr-ai-project-resourcev2.cognitiveservices.azure.com';
const apiKey = process.env.AZURE_OPENAI_API_KEY;

if (!apiKey) {
  console.error('❌ AZURE_OPENAI_API_KEY environment variable not set');
  process.exit(1);
}

console.log('🤖 Testing Azure AI Agent with MCP tools...\n');
console.log(`Agent ID: ${AGENT_ID}`);
console.log(`Endpoint: ${endpoint}\n`);

// Step 1: Create a thread
console.log('Step 1: Creating thread...');
const url = new URL(`${endpoint}/openai/threads?api-version=${API_VERSION}`);

const createThreadReq = https.request({
  hostname: url.hostname,
  path: url.pathname + url.search,
  method: 'POST',
  headers: {
    'api-key': apiKey,
    'Content-Type': 'application/json',
  },
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error(`❌ Failed to create thread: ${res.statusCode}`);
      console.error(data);
      return;
    }
    
    const thread = JSON.parse(data);
    console.log(`✅ Thread created: ${thread.id}\n`);
    
    // Step 2: Add a message
    console.log('Step 2: Adding message to thread...');
    addMessage(thread.id);
  });
});

createThreadReq.on('error', err => {
  console.error('❌ Error creating thread:', err.message);
});

createThreadReq.end();

function addMessage(threadId) {
  const url = new URL(`${endpoint}/openai/threads/${threadId}/messages?api-version=${API_VERSION}`);
  
  const messageData = JSON.stringify({
    role: 'user',
    content: 'What tools do you have available? Please list them.',
  });
  
  const req = https.request({
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(messageData),
    },
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.error(`❌ Failed to add message: ${res.statusCode}`);
        console.error(data);
        return;
      }
      
      console.log(`✅ Message added\n`);
      
      // Step 3: Run the assistant
      console.log('Step 3: Running assistant...');
      runAssistant(threadId);
    });
  });
  
  req.on('error', err => {
    console.error('❌ Error adding message:', err.message);
  });
  
  req.write(messageData);
  req.end();
}

function runAssistant(threadId) {
  const url = new URL(`${endpoint}/openai/threads/${threadId}/runs?api-version=${API_VERSION}`);
  
  const runData = JSON.stringify({
    assistant_id: AGENT_ID,
  });
  
  const req = https.request({
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(runData),
    },
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.error(`❌ Failed to run assistant: ${res.statusCode}`);
        console.error(data);
        return;
      }
      
      const run = JSON.parse(data);
      console.log(`✅ Run started: ${run.id}`);
      console.log(`   Status: ${run.status}\n`);
      
      // Step 4: Poll for completion
      console.log('Step 4: Waiting for completion...');
      pollRun(threadId, run.id);
    });
  });
  
  req.on('error', err => {
    console.error('❌ Error running assistant:', err.message);
  });
  
  req.write(runData);
  req.end();
}

function pollRun(threadId, runId, attempt = 0) {
  if (attempt > 30) {
    console.error('❌ Timeout waiting for run to complete');
    return;
  }
  
  setTimeout(() => {
    const url = new URL(`${endpoint}/openai/threads/${threadId}/runs/${runId}?api-version=${API_VERSION}`);
    
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
        const run = JSON.parse(data);
        console.log(`   [${attempt + 1}] Status: ${run.status}`);
        
        if (run.status === 'completed') {
          console.log('\n✅ Run completed! Fetching messages...\n');
          getMessages(threadId);
        } else if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
          console.error(`\n❌ Run ${run.status}`);
          if (run.last_error) {
            console.error('Error:', run.last_error);
          }
        } else {
          // Continue polling
          pollRun(threadId, runId, attempt + 1);
        }
      });
    });
    
    req.on('error', err => {
      console.error('❌ Error polling run:', err.message);
    });
    
    req.end();
  }, 2000);
}

function getMessages(threadId) {
  const url = new URL(`${endpoint}/openai/threads/${threadId}/messages?api-version=${API_VERSION}`);
  
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
      const messages = JSON.parse(data);
      
      console.log('📝 Messages:');
      console.log('='.repeat(60));
      
      messages.data.reverse().forEach(msg => {
        console.log(`\n${msg.role.toUpperCase()}:`);
        msg.content.forEach(content => {
          if (content.type === 'text') {
            console.log(content.text.value);
          }
        });
      });
      
      console.log('\n' + '='.repeat(60));
      console.log('\n🎉 Test complete!');
    });
  });
  
  req.on('error', err => {
    console.error('❌ Error getting messages:', err.message);
  });
  
  req.end();
}
