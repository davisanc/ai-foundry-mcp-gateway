const { EventSource } = require('eventsource');

const INVALID_SESSION_ID = '9da9c4ad-13b1-4a42-88b9-b8c31d9f722c'; // This session doesn't exist

console.log('🔗 Connecting to MCP server...');
const eventSource = new EventSource(`https://mcp-server-app-davisanc.azurewebsites.net/mcp/sse`);

let connectionId = null;

eventSource.onopen = () => {
  console.log('✅ Connected to SSE endpoint');
};

eventSource.addEventListener('endpoint', (event) => {
  const match = event.data.match(/sessionId=([^&\s]+)/);
  if (match) {
    connectionId = match[1];
    console.log(`🔑 Got connection ID: ${connectionId}`);
    
    // Try to use invalid session
    testInvalidSession();
  }
});

eventSource.addEventListener('message', (event) => {
  console.log('📨 Received message:', event.data);
  try {
    const response = JSON.parse(event.data);
    
    if (response.error) {
      console.log('\n✅ MCP server properly returned error:');
      console.log('  Code:', response.error.code);
      console.log('  Message:', response.error.message);
      console.log('\n🔍 This proves the MCP server handles errors correctly.');
      console.log('❌ The issue is that Azure AI Agent gets stuck when receiving this error.');
      eventSource.close();
      process.exit(0);
    }
    
    if (response.result) {
      console.log('\n❌ Unexpectedly got a result instead of an error!');
      eventSource.close();
      process.exit(1);
    }
  } catch (error) {
    console.error('Error parsing message:', error.message);
  }
});

eventSource.onerror = (error) => {
  console.error('❌ SSE Error:', error);
  eventSource.close();
  process.exit(1);
};

function testInvalidSession() {
  console.log(`\n🔍 Testing with invalid session ID: ${INVALID_SESSION_ID}`);
  
  fetch(`https://mcp-server-app-davisanc.azurewebsites.net/mcp/message?sessionId=${connectionId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'get_document',
        arguments: {
          sessionId: INVALID_SESSION_ID,
          docId: 'any-doc-id'
        }
      },
      id: 1
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    console.log('Request sent, waiting for response...');
  })
  .catch(error => {
    console.error('Error sending request:', error);
    eventSource.close();
    process.exit(1);
  });
}

// Timeout after 10 seconds
setTimeout(() => {
  console.error('\n⏱️ Test timed out - no response received');
  console.error('❌ This suggests the MCP server might not be sending error responses via SSE');
  eventSource.close();
  process.exit(1);
}, 10000);
