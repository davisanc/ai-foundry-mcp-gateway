#!/bin/bash

# 1️⃣ Create a new session
echo "Creating new session..."
SESSION_RESPONSE=$(curl -s -X POST http://localhost:3000/session -H "Content-Type: application/json")
SESSION_ID=$(echo $SESSION_RESPONSE | jq -r '.sessionId')
echo "Session ID: $SESSION_ID"

# 2️⃣ Upload a document
echo "Uploading document..."
DOC_RESPONSE=$(curl -s -X POST http://localhost:3000/session/$SESSION_ID/upload \
  -H "Content-Type: application/json" \
  -d '{
        "title": "Test Document",
        "text": "This is a test document for the MCP server. It contains some example text that GPT-4o-mini can summarize."
      }')
DOC_ID=$(echo $DOC_RESPONSE | jq -r '.docId')
echo "Document ID: $DOC_ID"

# 3️⃣ Query the document
echo "Querying document for summary..."
curl -X POST http://localhost:3000/session/$SESSION_ID/query \
  -H "Content-Type: application/json" \
  -d "{\"docId\":\"$DOC_ID\",\"query\":\"Summarize the doc\",\"mode\":\"summary\"}"
echo

