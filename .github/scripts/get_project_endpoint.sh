#!/bin/bash
# Get Azure AI Foundry project endpoint in the correct format

echo "Looking up AI Foundry project: $AI_PROJECT_NAME"
echo "Resource Group: $AI_PROJECT_RESOURCE_GROUP"

# For AI Foundry projects backed by Cognitive Services, the endpoint is often:
# https://<resource-name>.services.ai.azure.com/api/projects/<project-name>
# where <project-name> might be different from <resource-name>

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

# Get the Cognitive Services resource
PROJECT_JSON=$(az resource show \
  --name "$AI_PROJECT_NAME" \
  --resource-group "$AI_PROJECT_RESOURCE_GROUP" \
  --resource-type "Microsoft.CognitiveServices/accounts" \
  --output json 2>/dev/null || echo "{}")

RESOURCE_ID=$(echo "$PROJECT_JSON" | jq -r '.id // empty')

if [ -n "$RESOURCE_ID" ]; then
  echo "Found Cognitive Services resource: $AI_PROJECT_NAME"
  
  # Try to get discoveryUrl from properties
  DISCOVERY_URL=$(echo "$PROJECT_JSON" | jq -r '.properties.endpoints.discoveryUrl // empty')
  
  if [ -n "$DISCOVERY_URL" ]; then
    echo "✅ Found discoveryUrl in properties: $DISCOVERY_URL"
    PROJECT_ENDPOINT="$DISCOVERY_URL"
  else
    # Construct the AI Foundry project endpoint
    # The project name is often derived from the resource name by removing suffixes
    # Try: <resource-name> without -resourcev2 or similar suffixes
    BASE_PROJECT_NAME=$(echo "$AI_PROJECT_NAME" | sed 's/-resourcev[0-9]*$//' | sed 's/-resource$//')
    
    echo "Base project name (derived): $BASE_PROJECT_NAME"
    
    # Construct endpoint: https://<resource>.services.ai.azure.com/api/projects/<project>
    PROJECT_ENDPOINT="https://${AI_PROJECT_NAME}.services.ai.azure.com/api/projects/${BASE_PROJECT_NAME}"
    echo "✅ Constructed endpoint: $PROJECT_ENDPOINT"
  fi
  
  echo "project_endpoint=$PROJECT_ENDPOINT" >> $GITHUB_OUTPUT
else
  echo "ERROR: Could not find resource $AI_PROJECT_NAME in resource group $AI_PROJECT_RESOURCE_GROUP"
  exit 1
fi
