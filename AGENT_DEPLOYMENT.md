# Azure AI Agent Automated Deployment

## What Was Added

The GitHub Actions workflow now **automatically creates an Azure AI Agent** that connects to your MCP server during deployment.

## New Deployment Steps

The pipeline now includes:

1. ✅ Deploy MCP server (existing)
2. ✅ Create/configure APIM (existing)
3. ✅ **NEW:** Create AI Foundry Project (if needed)
4. ✅ **NEW:** Create AI Agent with MCP connection
5. ✅ **NEW:** Display agent information

## Required GitHub Secrets

You need to add one new secret to your GitHub repository:

### New Secret Required:

| Secret Name | Description | How to Get It |
|-------------|-------------|---------------|
| `AZURE_SUBSCRIPTION_ID` | Your Azure Subscription ID | Azure Portal → Subscriptions → Copy ID |

### Existing Secrets (already configured):

| Secret Name | Description |
|-------------|-------------|
| `AZURE_CREDENTIALS` | Service principal credentials |
| `FOUNDRY_ENDPOINT` | Azure AI Foundry GPT-4o-mini endpoint |
| `FOUNDRY_API_KEY` | Azure AI Foundry API key |

## How to Add AZURE_SUBSCRIPTION_ID Secret

### Step 1: Get Your Subscription ID

**Option A: Azure Portal**
1. Go to https://portal.azure.com
2. Search for "Subscriptions" in the top search bar
3. Click on your subscription
4. Copy the **Subscription ID** (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

**Option B: Azure CLI**
```bash
az account show --query id -o tsv
```

### Step 2: Add to GitHub Secrets

1. Go to your GitHub repository: https://github.com/davisanc/ai-foundry-mcp-gateway
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Name: `AZURE_SUBSCRIPTION_ID`
6. Value: Paste your subscription ID
7. Click **Add secret**

## What the Pipeline Does

### 1. Create AI Foundry Project

```bash
az ml workspace create \
  --name ai-foundry-mcp-project \
  --resource-group ai-mcp-rg \
  --location westeurope \
  --kind project
```

This creates the workspace where your agent will live.

### 2. Create AI Agent with MCP

The pipeline runs a Python script that:

```python
from azure.ai.projects import AIProjectClient

# Create agent with MCP connection
agent = client.agents.create_agent(
    model="gpt-4o-mini",
    name="document-analysis-agent",
    instructions="You are a document analyst...",
    tools=[
        {
            "type": "mcp",
            "mcp": {
                "url": "https://mcp-server-app-davisanc.azurewebsites.net/mcp/sse",
                "transport": "sse"
            }
        }
    ]
)
```

### 3. Save Agent ID

The agent ID is saved and displayed in the deployment logs so you can reference it later.

## After Deployment

Once the pipeline completes, you'll see output like:

```
================================================
🎉 Deployment Complete!
================================================

🌐 Web App: https://mcp-server-app-davisanc.azurewebsites.net
🔌 MCP Endpoint: https://mcp-server-app-davisanc.azurewebsites.net/mcp/sse
🤖 AI Agent: document-analysis-agent
📊 AI Project: ai-foundry-mcp-project
🆔 Agent ID: asst_abc123xyz789

Next steps:
1. Visit the web app to upload documents
2. Use Azure AI Foundry to chat with the agent
3. Agent will use MCP to access your documents
================================================
```

## Testing the Agent

### Step 1: Upload a Document

1. Go to: https://mcp-server-app-davisanc.azurewebsites.net
2. Note the session ID displayed
3. Upload a test document (TXT or CSV)
4. Note the document ID

### Step 2: Chat with the Agent

**Option A: Azure AI Foundry Portal**
1. Go to https://ai.azure.com
2. Navigate to your project: **ai-foundry-mcp-project**
3. Go to **Agents** → Find **document-analysis-agent**
4. Click **Test** or **Playground**
5. Ask: "List all documents in session {your-session-id}"
6. Watch the agent use MCP tools! 🎉

**Option B: Via API (future enhancement)**
- We can add an endpoint to your web app to chat with the agent
- This would enable the unified UI experience we discussed

## Customizing the Agent

You can customize the agent by editing the workflow file:

### Agent Name
```yaml
env:
  AI_AGENT_NAME: your-custom-agent-name
```

### Agent Instructions
Edit the `instructions` section in the Python script:
```python
"instructions": """Your custom instructions here..."""
```

### Model
Change the model:
```python
"model": "gpt-4"  # or gpt-4o, gpt-4-turbo, etc.
```

## Troubleshooting

### Error: "Project not found"

**Solution:** Ensure you have an Azure AI Foundry project created.

The pipeline tries to create it automatically, but if it fails:
```bash
az ml workspace create \
  --name ai-foundry-mcp-project \
  --resource-group ai-mcp-rg \
  --location westeurope \
  --kind project
```

### Error: "Agent already exists"

**Solution:** This is normal on subsequent deployments. The existing agent will continue to work with the updated MCP server.

To update the agent, you can delete it first:
1. Go to Azure AI Foundry portal
2. Delete the existing agent
3. Re-run the deployment

### Error: "MCP connection failed"

**Solution:**
1. Check that the MCP endpoint is accessible: `https://mcp-server-app-davisanc.azurewebsites.net/mcp/sse`
2. Verify the agent has network access to your Web App
3. Check Azure Web App logs for MCP connection attempts

## Architecture After Deployment

```
┌─────────────────────────────────────────────────┐
│  GitHub Actions Workflow                       │
│                                                 │
│  Deploys:                                       │
│  1. MCP Server (Azure Web App) ✓                │
│  2. APIM Gateway ✓                              │
│  3. AI Foundry Project ✓ (NEW)                  │
│  4. AI Agent with MCP ✓ (NEW)                   │
└──────────────────┬──────────────────────────────┘
                   │
                   ↓ Creates
┌──────────────────────────────────────────────────┐
│  Azure Resources                                 │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  AI Agent (in Azure AI Agent Service)     │ │
│  │  - Hosted and managed by Azure            │ │
│  │  - Connected to MCP server                │ │
│  └────────────┬───────────────────────────────┘ │
│               │                                  │
│               ↓ MCP/SSE                          │
│  ┌────────────────────────────────────────────┐ │
│  │  MCP Server (Azure Web App)               │ │
│  │  - Provides document tools                │ │
│  │  - Stores sessions in memory              │ │
│  └────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

## Next Steps

1. ✅ **Add AZURE_SUBSCRIPTION_ID secret** to GitHub
2. ✅ **Push to main branch** to trigger deployment
3. ✅ **Monitor deployment** in GitHub Actions
4. ✅ **Test agent** in Azure AI Foundry
5. ⏭️ **Add web UI integration** (future: chat with agent from your web page)

## Environment Variables

The deployment uses these environment variables:

```yaml
AI_PROJECT_NAME: ai-foundry-mcp-project  # Can be customized
AI_AGENT_NAME: document-analysis-agent   # Can be customized
WEBAPP_NAME: mcp-server-app-davisanc     # Your web app
AZURE_RESOURCE_GROUP: ai-mcp-rg          # Resource group
LOCATION: westeurope                      # Azure region
```

All resources are created in the same resource group for easy management.

## Cost Considerations

**New Resources Created:**
- ✅ Azure AI Foundry Project (workspace) - ~$0 (storage costs only)
- ✅ Azure AI Agent - Charged per API call when used
- ✅ No additional compute costs (agent runtime is serverless)

**Tip:** The agent only incurs costs when it's actively processing requests.

## Support

If you encounter issues:
1. Check GitHub Actions logs for deployment errors
2. Check Azure Portal → Resource Group → ai-mcp-rg for all resources
3. Review Azure Web App logs for MCP server issues
4. Check Azure AI Foundry portal for agent status

---

**Ready to deploy?** Just add the `AZURE_SUBSCRIPTION_ID` secret and push to main! 🚀
