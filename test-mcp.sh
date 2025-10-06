#!/bin/bash
set -e

MCP_URL="http://localhost:3000"

# 1️⃣ Create a new session
echo "Creating new session..."
SESSION_ID=$(curl -s -X POST "$MCP_URL/session" | jq -r '.sessionId')
echo "Session ID: $SESSION_ID"

# 2️⃣ Upload a document
echo "Uploading document..."
DOC_TEXT="This is a test document for the MCP server. It contains some example text that GPT-4o-mini can summarize."
DOC_TITLE="Test Document"

DOC_ID=$(curl -s -X POST "$MCP_URL/session/$SESSION_ID/upload" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"$DOC_TEXT\",\"title\":\"$DOC_TITLE\"}" | jq -r '.docId')
echo "Document ID: $DOC_ID"

# 3️⃣ Query the document for summary
echo "Querying document for summary..."
QUERY="Summarize the doc"
MODE="summary"

RESPONSE=$(curl -s -X POST "$MCP_URL/session/$SESSION_ID/query" \
  -H "Content-Type: application/json" \
  -d "{\"docId\":\"$DOC_ID\",\"query\":\"$QUERY\",\"mode\":\"$MODE\"}")

echo "Response from MCP:"
echo $RESPONSE | jq

