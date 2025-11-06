#!/bin/bash
# Get Azure AI Foundry project endpoint in the correct format

echo "Looking up AI Foundry project: $AI_PROJECT_NAME"
echo "Resource Group: $AI_PROJECT_RESOURCE_GROUP"

# Get the project resource
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
  echo "Found resource:"
  echo "  Resource ID: $RESOURCE_ID"
  echo "  Location: $LOCATION"
  echo "  Kind: $KIND"
  
  # Try multiple methods to get the correct endpoint
  
  # Method 1: Try discoveryUrl from properties.endpoints
  DISCOVERY_URL=$(echo "$PROJECT_JSON" | jq -r '.properties.endpoints.discoveryUrl // empty')
  
  # Method 2: Try endpoint from properties
  PROPERTIES_ENDPOINT=$(echo "$PROJECT_JSON" | jq -r '.properties.endpoint // empty')
  
  # Method 3: Try to find project scope/workspace ID
  PROJECT_SCOPE=$(echo "$PROJECT_JSON" | jq -r '.properties.projectScope // .properties.workspaceId // empty')
  
  echo "Discovery URL: ${DISCOVERY_URL:-'not found'}"
  echo "Properties Endpoint: ${PROPERTIES_ENDPOINT:-'not found'}"
  echo "Project Scope: ${PROJECT_SCOPE:-'not found'}"
  
  if [ -n "$DISCOVERY_URL" ]; then
    PROJECT_ENDPOINT="$DISCOVERY_URL"
    echo "✅ Using discoveryUrl: $PROJECT_ENDPOINT"
  elif [ -n "$PROPERTIES_ENDPOINT" ]; then
    # The properties.endpoint might be the base, we may need to append /api/projects/<name>
    PROJECT_ENDPOINT="$PROPERTIES_ENDPOINT"
    echo "✅ Using properties.endpoint: $PROJECT_ENDPOINT"
  else
    # For Cognitive Services AIServices kind, try the base endpoint without /api/projects
    # The SDK might handle the path internally
    PROJECT_ENDPOINT="https://${AI_PROJECT_NAME}.services.ai.azure.com"
    echo "✅ Using constructed base endpoint: $PROJECT_ENDPOINT"
  fi
  
  echo "project_endpoint=$PROJECT_ENDPOINT" >> $GITHUB_OUTPUT
else
  echo "ERROR: Could not find project $AI_PROJECT_NAME in resource group $AI_PROJECT_RESOURCE_GROUP"
  exit 1
fi
