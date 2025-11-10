// Test the NEW SSE response pattern for tools/call (per MCP spec)
const { EventSource } = require('eventsource');

const BASE_URL = 'http://localhost:3000'; // Test locally first
const SESSION_ID = 'test-session-' + Date.now();

console.log('🔗 Testing new SSE response pattern...');
console.log('📋 Step 1: Establish SSE connection');

const eventSource = new EventSource(`${BASE_URL}/mcp/sse`);
let connectionId = null;

eventSource.onopen = () => {
  console.log('✅ Connected to SSE endpoint');
};

eventSource.addEventListener('endpoint', (event) => {
  const match = event.data.match(/sessionId=([^&\s]+)/);
  if (match) {
    connectionId = match[1];
    console.log(`🔑 Got connection ID: ${connectionId}`);
    console.log('\n📋 Step 2: Test create_session with new response pattern');
    
    testNewResponsePattern();
  } else {
    console.error('Could not extract connection ID');
    eventSource.close();
    process.exit(1);
  }
});

eventSource.addEventListener('message', (event) => {
  console.log('📨 Received on long-lived SSE:', event.data);
});

eventSource.onerror = (error) => {
  console.error('❌ SSE Error:', error);
  eventSource.close();
  process.exit(1);
};

async function testNewResponsePattern() {
  try {
    console.log('\n🔧 Sending tools/call with Accept: text/event-stream header...');
    
    const response = await fetch(`${BASE_URL}/mcp/message?sessionId=${connectionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream, application/json' // Signal we want SSE response
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'create_session',
          arguments: {}
        },
        id: 1
      })
    });
    
    console.log(`📥 Response status: ${response.status}`);
    console.log(`📥 Response Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      console.log('✅ Server returned SSE stream (new pattern!)');
      
      // Read the SSE stream
      const reader = response.body;
      let buffer = '';
      
      for await (const chunk of reader) {
        buffer += chunk.toString();
        
        // Parse SSE messages
        const lines = buffer.split('\n');
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            console.log('\n📦 Received in NEW SSE stream:', data);
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.result) {
                console.log('✅ SUCCESS! Got result via new SSE response pattern');
                console.log('   Result:', JSON.stringify(parsed.result, null, 2));
                
                // Test with agent now
                console.log('\n🎉 NEW PATTERN WORKS! Now try with Azure AI Agent:');
                console.log('   Make sure agent sends Accept: text/event-stream header');
                
                eventSource.close();
                process.exit(0);
              }
            } catch (e) {
              // Not JSON
            }
          }
        }
      }
    } else {
      console.log('⚠️  Server returned JSON (old pattern)');
      const json = await response.json();
      console.log('Response:', json);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    eventSource.close();
    process.exit(1);
  }
}

// Timeout
setTimeout(() => {
  console.error('\n⏱️ Test timed out');
  eventSource.close();
  process.exit(1);
}, 10000);
