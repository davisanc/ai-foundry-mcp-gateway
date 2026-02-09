#!/bin/bash
# Manual script to assign RBAC roles to web app managed identity
# Run this locally if the GitHub workflow role assignment fails
# Requires: Azure CLI and appropriate permissions (Owner or User Access Administrator)

set -e

# Configuration
RESOURCE_GROUP="ai-mcp-rg"
WEBAPP_NAME="mcp-server-app-davisanc"
FOUNDRY_RESOURCE_GROUP="AI-RG"
FOUNDRY_NAME="davidsr-ai-project-resourcev2"

echo "================================================"
echo "Assigning RBAC Roles to Web App Managed Identity"
echo "================================================"
echo ""

# Get web app managed identity principal ID
echo "🔍 Getting web app managed identity..."
PRINCIPAL_ID=$(az webapp identity show \
  -g $RESOURCE_GROUP \
  -n $WEBAPP_NAME \
  --query principalId \
  --output tsv)

if [ -z "$PRINCIPAL_ID" ]; then
  echo "❌ Could not find managed identity for web app: $WEBAPP_NAME"
  exit 1
fi

echo "✅ Principal ID: $PRINCIPAL_ID"
echo ""

# Get Foundry resource ID
echo "🔍 Getting Foundry resource..."
RESOURCE_ID=$(az resource show \
  -g $FOUNDRY_RESOURCE_GROUP \
  -n $FOUNDRY_NAME \
  --resource-type "Microsoft.CognitiveServices/accounts" \
  --query id \
  --output tsv)

if [ -z "$RESOURCE_ID" ]; then
  echo "❌ Could not find Foundry resource: $FOUNDRY_NAME"
  exit 1
fi

echo "✅ Resource ID: $RESOURCE_ID"
echo ""

# Assign roles
echo "📋 Assigning roles to managed identity..."
echo ""

ROLES=(
  "Azure AI User"
  "Cognitive Services User"
  "Cognitive Services OpenAI Contributor"
)

for ROLE in "${ROLES[@]}"; do
  echo "🔄 Processing role: $ROLE"
  
  # Check if already assigned
  EXISTING=$(az role assignment list \
    --assignee-object-id "$PRINCIPAL_ID" \
    --scope "$RESOURCE_ID" \
    --role "$ROLE" \
    --query "[0].id" \
    --output tsv 2>/dev/null || echo "")
  
  if [ -n "$EXISTING" ]; then
    echo "   ✅ Already assigned (ID: ${EXISTING:0:8}...)"
  else
    echo "   ⏳ Assigning..."
    az role assignment create \
      --assignee-object-id "$PRINCIPAL_ID" \
      --role "$ROLE" \
      --scope "$RESOURCE_ID" \
      --output none
    echo "   ✅ Assigned"
  fi
  echo ""
done

# Verify assignments
echo "✅ Verification - Current role assignments:"
echo ""
az role assignment list \
  --assignee-object-id "$PRINCIPAL_ID" \
  --scope "$RESOURCE_ID" \
  --query "[].{Role:roleDefinitionName, Scope:scope}" \
  -o table

echo ""
echo "================================================"
echo "✅ Role assignment complete!"
echo "================================================"
echo ""
echo "The web app managed identity can now access the Foundry resource."
echo "You can now run the GitHub deployment workflow."
