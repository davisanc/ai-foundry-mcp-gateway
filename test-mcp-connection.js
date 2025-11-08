// Test script to verify MCP server is working
const fetch = require('node-fetch');
const EventSource = require('eventsource').EventSource || require('eventsource');

const MCP_URL = 'https://mcp-server-app-davisanc.azurewebsites.net/mcp/sse';

console.log('🧪 Testing MCP SSE Connection...\n');

// Step 1: Connect to SSE endpoint
console.log('Step 1: Connecting to SSE endpoint...');
const es = new EventSource(MCP_URL);

es.onopen = () => {
  console.log('✅ SSE connection established');
};

es.addEventListener('endpoint', (event) => {
  console.log('✅ Received endpoint event:', event.data);
  const messageEndpoint = event.data;
  
  // Step 2: Send tools/list request
  console.log('\nStep 2: Sending tools/list request...');
  
  const messageUrl = `https://mcp-server-app-davisanc.azurewebsites.net${messageEndpoint}`;
  console.log('Message URL:', messageUrl);
  
  // Listen for the tool list response via SSE
  let responseReceived = false;
  
  fetch(messageUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    }),
  })
    .then(res => res.json())
    .then(data => {
      console.log('✅ POST acknowledged:', JSON.stringify(data, null, 2));
    })
    .catch(err => {
      console.error('❌ Error sending message:', err.message);
    });
  
  // Wait for SSE response
  setTimeout(() => {
    if (!responseReceived) {
      console.log('\n⏱️  Timeout: No SSE response received after 5 seconds');
      es.close();
      process.exit(1);
    }
  }, 5000);
});

es.addEventListener('message', (event) => {
  console.log('\n✅ SSE message received!');
  console.log('Response:', event.data);
  
  try {
    const parsed = JSON.parse(event.data);
    console.log('\nParsed response:', JSON.stringify(parsed, null, 2));
    
    if (parsed.result && parsed.result.tools) {
      console.log(`\n🎉 SUCCESS! Received ${parsed.result.tools.length} tools:`);
      parsed.result.tools.forEach(tool => {
        console.log(`  • ${tool.name}: ${tool.description}`);
      });
    }
  } catch (e) {
    console.error('Failed to parse response:', e.message);
  }
  
  setTimeout(() => {
    es.close();
    process.exit(0);
  }, 1000);
});

es.onerror = (error) => {
  console.error('❌ SSE error:', error);
  es.close();
  process.exit(1);
};

// Timeout after 10 seconds
setTimeout(() => {
  console.error('\n⏱️  Timeout: No response after 10 seconds');
  es.close();
  process.exit(1);
}, 10000);
