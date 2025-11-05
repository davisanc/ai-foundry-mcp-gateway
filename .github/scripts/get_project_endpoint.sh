#!/bin/bash
# Get Azure AI Foundry project endpoint in the correct format

echo "Looking up AI Foundry project: $AI_PROJECT_NAME"
echo "Resource Group: $AI_PROJECT_RESOURCE_GROUP"

# Get the project resource to find discovery URL
PROJECT_JSON=$(az resource show \
  --name "$AI_PROJECT_NAME" \
  --resource-group "$AI_PROJECT_RESOURCE_GROUP" \
  --resource-type "Microsoft.CognitiveServices/accounts" \
  --output json 2>/dev/null || echo "{}")

# Extract properties
RESOURCE_ID=$(echo "$PROJECT_JSON" | jq -r '.id // empty')
LOCATION=$(echo "$PROJECT_JSON" | jq -r '.location // "eastus"')

if [ -n "$RESOURCE_ID" ]; then
  echo "Found project:"
  echo "  Resource ID: $RESOURCE_ID"
  echo "  Location: $LOCATION"
  
  # Try to get discovery URL from properties
  DISCOVERY_URL=$(echo "$PROJECT_JSON" | jq -r '.properties.endpoint // empty')
  
  if [ -n "$DISCOVERY_URL" ]; then
    # Use the discovery URL from the resource
    PROJECT_ENDPOINT="$DISCOVERY_URL"
    echo "Using discovery endpoint: $PROJECT_ENDPOINT"
  else
    # Fallback: construct Azure AI Foundry endpoint
    # Format: https://<project-name>.services.ai.azure.com
    PROJECT_ENDPOINT="https://${AI_PROJECT_NAME}.services.ai.azure.com"
    echo "Using constructed endpoint: $PROJECT_ENDPOINT"
  fi
  
  echo "project_endpoint=$PROJECT_ENDPOINT" >> $GITHUB_OUTPUT
else
  echo "ERROR: Could not find project $AI_PROJECT_NAME in resource group $AI_PROJECT_RESOURCE_GROUP"
  exit 1
fi
