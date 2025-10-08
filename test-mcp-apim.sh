#!/bin/bash
set -e

# --- LOAD ENVIRONMENT VARIABLES ---
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# --- CONFIG ---
APIM_URL="https://mcp-apim-davisanc.azure-api.net/mcp"

HEADERS=(-H "Content-Type: application/json")

# Add APIM key from .env if present
if [ -n "$APIM_KEY" ]; then
  HEADERS+=(-H "Ocp-Apim-Subscription-Key: $APIM_KEY")
fi

# --- CREATE SESSION ---
echo "Creating new session..."
SESSION_RESPONSE=$(curl -s -w "\n%{http_code}" "${HEADERS[@]}" -X POST "$APIM_URL/session" -d '{}')
HTTP_BODY=$(echo "$SESSION_RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$SESSION_RESPONSE" | tail -n 1)

echo "HTTP status: $HTTP_CODE"
echo "Raw response:"
echo "$HTTP_BODY"

if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ Request failed with HTTP $HTTP_CODE"
  exit 1
fi

SESSION_ID=$(echo "$HTTP_BODY" | jq -r '.sessionId')
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

