#!/bin/bash
# Get Azure AI Foundry project endpoint

echo "Looking up AI Foundry project: $AI_PROJECT_NAME"
echo "Resource Group: $AI_PROJECT_RESOURCE_GROUP"

# Try to get the project resource
PROJECT_JSON=$(az resource show \
  --name "$AI_PROJECT_NAME" \
  --resource-group "$AI_PROJECT_RESOURCE_GROUP" \
  --resource-type "Microsoft.CognitiveServices/accounts" \
  --output json 2>/dev/null || echo "{}")

# Extract resource ID and location
RESOURCE_ID=$(echo "$PROJECT_JSON" | jq -r '.id // empty')
LOCATION=$(echo "$PROJECT_JSON" | jq -r '.location // "eastus"')

if [ -n "$RESOURCE_ID" ]; then
  echo "Found project:"
  echo "  Resource ID: $RESOURCE_ID"
  echo "  Location: $LOCATION"
  
  # Construct endpoint using resource ID
  PROJECT_ENDPOINT="https://${LOCATION}.api.azureml.ms${RESOURCE_ID}"
  echo "project_endpoint=$PROJECT_ENDPOINT" >> $GITHUB_OUTPUT
  echo "Constructed endpoint: $PROJECT_ENDPOINT"
else
  echo "ERROR: Could not find project $AI_PROJECT_NAME in resource group $AI_PROJECT_RESOURCE_GROUP"
  exit 1
fi
