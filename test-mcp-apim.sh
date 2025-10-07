#!/bin/bash
set -e

# --- CONFIG ---
APIM_URL="https://mcp-apim-davisanc.azure-api.net/mcp"
# If your APIM requires a subscription key, set it here:
# APIM_KEY="your-subscription-key"
HEADERS=(-H "Content-Type: application/json")
# Uncomment the next line if APIM_KEY is set
# HEADERS+=(-H "Ocp-Apim-Subscription-Key: $APIM_KEY")

# --- CREATE SESSION ---
echo "Creating new session..."
SESSION_ID=$(curl -s "${HEADERS[@]}" -X POST "$APIM_URL/session" | jq -r '.sessionId')
echo "Session ID: $SESSION_ID"

# --- UPLOAD DOCUMENT ---
echo "Uploading document..."
DOC_ID=$(curl -s "${HEADERS[@]}" -X POST "$APIM_URL/session/$SESSION_ID/upload" \
  -d '{
        "text": "This is a test document for the MCP server. It contains some example text to test summarization.",
        "title": "Test Document"
      }' | jq -r '.docId')
echo "Document ID: $DOC_ID"

# --- QUERY DOCUMENT ---
echo "Querying document for summary..."
RESPONSE=$(curl -s "${HEADERS[@]}" -X POST "$APIM_URL/session/$SESSION_ID/query" \
  -d "{
        \"docId\": \"$DOC_ID\",
        \"query\": \"Summarize the doc\",
        \"mode\": \"summary\"
      }")

echo "Response from MCP through APIM:"
echo "$RESPONSE" | jq

