#!/bin/bash
# Get Azure AI Foundry project endpoint in the correct format

echo "Looking up AI Foundry project: $AI_PROJECT_NAME"
echo "Resource Group: $AI_PROJECT_RESOURCE_GROUP"

# First, try to find as an AI Foundry project (MachineLearningServices workspace)
echo ""
echo "Searching for AI Foundry project (ML workspace)..."
ML_PROJECT_JSON=$(az ml workspace show \
  --name "$AI_PROJECT_NAME" \
  --resource-group "$AI_PROJECT_RESOURCE_GROUP" \
  --output json 2>/dev/null || echo "{}")

ML_DISCOVERY_URL=$(echo "$ML_PROJECT_JSON" | jq -r '.discovery_url // empty')

if [ -n "$ML_DISCOVERY_URL" ]; then
  echo "✅ Found AI Foundry Project!"
  echo "  Discovery URL: $ML_DISCOVERY_URL"
  PROJECT_ENDPOINT="$ML_DISCOVERY_URL"
  echo "project_endpoint=$PROJECT_ENDPOINT" >> $GITHUB_OUTPUT
  exit 0
fi

echo "❌ Not found as AI Foundry project, trying Cognitive Services..."
echo ""

# Fallback: Get the Cognitive Services resource
PROJECT_JSON=$(az resource show \
  --name "$AI_PROJECT_NAME" \
  --resource-group "$AI_PROJECT_RESOURCE_GROUP" \
  --resource-type "Microsoft.CognitiveServices/accounts" \
  --output json 2>/dev/null || echo "{}")

# Extract properties
RESOURCE_ID=$(echo "$PROJECT_JSON" | jq -r '.id // empty')
LOCATION=$(echo "$PROJECT_JSON" | jq -r '.location // "eastus"')
KIND=$(echo "$PROJECT_JSON" | jq -r '.kind // empty')

if [ -n "$RESOURCE_ID" ]; then
  echo "Found Cognitive Services resource:"
  echo "  Resource ID: $RESOURCE_ID"
  echo "  Location: $LOCATION"
  echo "  Kind: $KIND"
  
  # Try multiple methods to get the correct endpoint
  
  # Method 1: Try discoveryUrl from properties.endpoints
  DISCOVERY_URL=$(echo "$PROJECT_JSON" | jq -r '.properties.endpoints.discoveryUrl // empty')
  
  # Method 2: Try endpoint from properties
  PROPERTIES_ENDPOINT=$(echo "$PROJECT_JSON" | jq -r '.properties.endpoint // empty')
  
  # Method 3: Check if this resource has an associated AI Foundry project
  # Look for projects in the same resource group
  echo ""
  echo "Searching for associated AI Foundry projects in resource group..."
  PROJECTS_LIST=$(az ml workspace list --resource-group "$AI_PROJECT_RESOURCE_GROUP" --output json 2>/dev/null || echo "[]")
  PROJECT_COUNT=$(echo "$PROJECTS_LIST" | jq '. | length')
  
  if [ "$PROJECT_COUNT" -gt 0 ]; then
    echo "Found $PROJECT_COUNT AI Foundry project(s) in resource group:"
    echo "$PROJECTS_LIST" | jq -r '.[] | "  - \(.name): \(.discovery_url)"'
    
    # Use the first project's discovery URL
    FIRST_PROJECT_URL=$(echo "$PROJECTS_LIST" | jq -r '.[0].discovery_url // empty')
    if [ -n "$FIRST_PROJECT_URL" ]; then
      echo ""
      echo "✅ Using first AI Foundry project endpoint: $FIRST_PROJECT_URL"
      PROJECT_ENDPOINT="$FIRST_PROJECT_URL"
      echo "project_endpoint=$PROJECT_ENDPOINT" >> $GITHUB_OUTPUT
      exit 0
    fi
  fi
  
  echo ""
  echo "Discovery URL: ${DISCOVERY_URL:-'not found'}"
  echo "Properties Endpoint: ${PROPERTIES_ENDPOINT:-'not found'}"
  
  if [ -n "$DISCOVERY_URL" ]; then
    PROJECT_ENDPOINT="$DISCOVERY_URL"
    echo "✅ Using discoveryUrl: $PROJECT_ENDPOINT"
  elif [ -n "$PROPERTIES_ENDPOINT" ]; then
    PROJECT_ENDPOINT="$PROPERTIES_ENDPOINT"
    echo "✅ Using properties.endpoint: $PROJECT_ENDPOINT"
  else
    # Last resort: use Cognitive Services endpoint
    PROJECT_ENDPOINT="https://${AI_PROJECT_NAME}.cognitiveservices.azure.com"
    echo "⚠️  Using Cognitive Services endpoint as fallback: $PROJECT_ENDPOINT"
    echo "   This may not support Agents API"
  fi
  
  echo "project_endpoint=$PROJECT_ENDPOINT" >> $GITHUB_OUTPUT
else
  echo "ERROR: Could not find resource $AI_PROJECT_NAME in resource group $AI_PROJECT_RESOURCE_GROUP"
  exit 1
fi
