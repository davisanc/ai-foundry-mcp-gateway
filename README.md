# Azure AI Foundry + MCP + APIM Demo

This repo contains:
- A minimal **MCP server** (Node.js + Express) with Model Context Protocol support.
- A **GitHub Actions pipeline** to deploy MCP to Azure App Service.
- **Automated AI Agent deployment** that connects to your MCP server.
- APIM integration to expose MCP securely.
- Example OpenAPI spec for APIM import.

## Features

✅ **Document Upload & Analysis** - Upload TXT/CSV files or paste text  
✅ **MCP Protocol Support** - Full Model Context Protocol implementation  
✅ **Azure AI Agent Integration** - Automated agent creation with MCP tools  
✅ **APIM Gateway** - Secure API management  
✅ **CI/CD Pipeline** - Automated deployment via GitHub Actions  

## Quick Start

### Prerequisites

1. **Azure AI Foundry Project** - Create one at https://ai.azure.com
2. **Azure Subscription** - Active Azure subscription
3. **GitHub Repository** - Fork or clone this repo

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/davisanc/ai-foundry-mcp-gateway.git
   cd ai-foundry-mcp-gateway
   ```

2. **Configure GitHub Secrets**

   Go to **Settings** → **Secrets and variables** → **Actions** and add:

   | Secret Name | Description | Required |
   |-------------|-------------|----------|
   | `AZURE_CREDENTIALS` | Service principal JSON | ✅ Yes |
   | `AZURE_SUBSCRIPTION_ID` | Your Azure subscription ID | ✅ Yes |
   | `FOUNDRY_ENDPOINT` | Azure AI Foundry model endpoint | ✅ Yes |
   | `FOUNDRY_API_KEY` | Azure AI Foundry API key | ✅ Yes |
   | `AI_PROJECT_NAME` | Your AI Foundry project name | ⚠️ Optional* |

   *If not set, defaults to `davidsr-ai-project-resourcev2`

3. **Get Your AI Project Name**
   
   ```bash
   # Option 1: Azure Portal
   # Go to https://ai.azure.com and copy your project name
   
   # Option 2: Azure CLI
   az ml workspace list --resource-group <your-rg> --query "[?kind=='project'].name" -o tsv
   ```

4. **Push to main branch**
   ```bash
   git push origin main
   ```

   The GitHub Actions pipeline will automatically:
   - Deploy the MCP server to Azure App Service
   - Configure APIM gateway
   - Create an AI Agent connected to your MCP server

## Configuration for Your Own Project

If you want to use this with your own Azure AI Foundry project:

1. **Set the `AI_PROJECT_NAME` secret** in GitHub with your project name
2. **Update environment variables** in `.github/workflows/deploy.yml`:
   - `AZURE_RESOURCE_GROUP` - Your resource group name
   - `LOCATION` - Your Azure region
   - `WEBAPP_NAME` - Unique name for your web app
   - `APIM_NAME` - Unique name for your APIM instance

## Endpoints

- `/session` → Create new session.
- `/session/{sid}/upload` → Upload text doc.
- `/session/{sid}/query` → Ask question or summarize.

