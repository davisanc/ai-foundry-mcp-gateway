// Simple test without EventSource library
const https = require('https');

console.log('🧪 Testing MCP Server...\n');

// Step 1: Make a simple GET to /mcp/sse and see what happens
console.log('Step 1: Testing SSE endpoint...');

const req = https.get('https://mcp-server-app-davisanc.azurewebsites.net/mcp/sse', (res) => {
  console.log(`✅ Status: ${res.statusCode}`);
  console.log(`✅ Headers:`, res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk.toString();
    console.log('\n📨 Received data:');
    console.log(data);
    
    // Parse the SSE endpoint event
    if (data.includes('event: endpoint')) {
      const match = data.match(/data: (.+)/);
      if (match) {
        const endpoint = match[1].trim();
        console.log(`\n✅ Got endpoint: ${endpoint}`);
        
        // Now try to send a message
        console.log('\nStep 2: Sending tools/list request...');
        
        const messageUrl = `https://mcp-server-app-davisanc.azurewebsites.net${endpoint}`;
        console.log(`Message URL: ${messageUrl}`);
        
        const postData = JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {},
        });
        
        const url = new URL(messageUrl);
        
        // Extract and send cookies back for session affinity
        const cookies = res.headers['set-cookie'];
        const cookieHeader = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';
        console.log(`\n🍪 Using cookies: ${cookieHeader}`);
        
        const postReq = https.request({
          hostname: url.hostname,
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'Cookie': cookieHeader,
          },
        }, (postRes) => {
          let postData = '';
          postRes.on('data', (chunk) => {
            postData += chunk.toString();
          });
          postRes.on('end', () => {
            console.log(`\n✅ POST Response:`, postData);
            
            // Keep listening for SSE response
            console.log('\nWaiting for SSE response...');
          });
        });
        
        postReq.on('error', (e) => {
          console.error(`❌ POST Error: ${e.message}`);
        });
        
        postReq.write(postData);
        postReq.end();
      }
    }
  });
  
  // Timeout after 10 seconds
  setTimeout(() => {
    console.log('\n⏱️  Test complete (10 second timeout)');
    req.destroy();
    process.exit(0);
  }, 10000);
});

req.on('error', (e) => {
  console.error(`❌ Error: ${e.message}`);
  process.exit(1);
});
