const { EventSource } = require('eventsource');

const SESSION_ID = 'b3d6bb63-94d9-4e02-9850-513f11ee8209'; // Existing session
const SMALL_TEXT = 'OrderID,Customer,Amount\nORD001,Alice,10.50\nORD002,Bob,20.75\nORD003,Charlie,15.25';

console.log('🔗 Connecting to MCP server...');
const eventSource = new EventSource(`https://mcp-server-app-davisanc.azurewebsites.net/mcp/sse`);

let connectionId = null;
let smallDocId = null;

eventSource.onopen = () => {
  console.log('✅ Connected to SSE endpoint');
};

eventSource.addEventListener('endpoint', (event) => {
  // event.data is like "/mcp/message?sessionId=xyz"
  const match = event.data.match(/sessionId=([^&\s]+)/);
  if (match) {
    connectionId = match[1];
    console.log(`🔑 Got connection ID: ${connectionId}`);
    
    // Upload small document directly (session already exists)
    uploadSmallDocument();
  } else {
    console.error('Could not extract connection ID from:', event.data);
    eventSource.close();
    process.exit(1);
  }
});

eventSource.addEventListener('message', (event) => {
  console.log('📨 Received message:', event.data);
  try {
    const response = JSON.parse(event.data);
    
    if (response.result && response.result.content) {
      const content = response.result.content[0];
      if (content.type === 'text') {
        const text = content.text;
        
        // Try to parse as JSON first (for upload_document response)
        try {
          const jsonData = JSON.parse(text);
          if (jsonData.success && jsonData.docId) {
            smallDocId = jsonData.docId;
            console.log(`\n✅ Small document uploaded with ID: ${smallDocId}`);
            
            // Now test retrieving it
            setTimeout(() => {
              getSmallDocument();
            }, 500);
            return;
          }
          
          // Check if this is get_document response
          if (jsonData.id && jsonData.title && jsonData.text) {
            console.log('\n🎉 Successfully retrieved small document:');
            console.log('  ID:', jsonData.id);
            console.log('  Title:', jsonData.title);
            console.log('  Content:', jsonData.text);
            console.log('\n✅ TEST PASSED: Small document retrieval works!');
            console.log('\n📋 Now test with the Azure AI Agent:');
            console.log(`   Session ID: ${SESSION_ID}`);
            console.log(`   Document ID: ${smallDocId}`);
            console.log('\n💬 Ask the agent:');
            console.log(`   "Can you get document ${smallDocId} from session ${SESSION_ID}?"`);
            eventSource.close();
            process.exit(0);
          }
        } catch (e) {
          // Not JSON, ignore
        }
      }
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

function createSession() {
  console.log('\n🆕 Creating new session...');
  
  fetch(`https://mcp-server-app-davisanc.azurewebsites.net/mcp/message?sessionId=${connectionId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
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
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    console.log('Create session request sent successfully');
  })
  .catch(error => {
    console.error('Error creating session:', error);
    eventSource.close();
    process.exit(1);
  });
}

function uploadSmallDocument() {
  console.log('\n📤 Uploading small document...');
  
  fetch(`https://mcp-server-app-davisanc.azurewebsites.net/mcp/message?sessionId=${connectionId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'upload_document',
        arguments: {
          sessionId: SESSION_ID,
          title: 'small_test_doc',
          text: SMALL_TEXT
        }
      },
      id: 2
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    console.log('Upload request sent successfully');
  })
  .catch(error => {
    console.error('Error uploading document:', error);
    eventSource.close();
    process.exit(1);
  });
}

function getSmallDocument() {
  console.log(`\n🔍 Retrieving small document ${smallDocId}...`);
  
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
          sessionId: SESSION_ID,
          docId: smallDocId
        }
      },
      id: 3
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    console.log('Get document request sent successfully');
  })
  .catch(error => {
    console.error('Error getting document:', error);
    eventSource.close();
    process.exit(1);
  });
}

// Timeout after 15 seconds
setTimeout(() => {
  console.error('\n⏱️ Test timed out after 15 seconds');
  eventSource.close();
  process.exit(1);
}, 15000);
