# Azure AI Foundry + MCP + APIM Demo

This repo contains:
- A minimal **MCP server** (Node.js + Express).
- A **GitHub Actions pipeline** to deploy MCP to Azure App Service.
- APIM integration to expose MCP securely.
- Example OpenAPI spec for APIM import.

## Setup

1. Create a GitHub repo and push this project.
2. Add GitHub secrets:
   - `AZURE_TENANT_ID`
   - `AZURE_CLIENT_ID`
   - `AZURE_CLIENT_SECRET`
   - `AZURE_SUBSCRIPTION_ID`
3. Configure your Foundry model endpoint + API key:
   - Add to Web App → Application Settings:
     - `FOUNDRY_ENDPOINT`
     - `FOUNDRY_API_KEY`
4. Push to `main` branch → GitHub Actions will deploy.

## Endpoints

- `/session` → Create new session.
- `/session/{sid}/upload` → Upload text doc.
- `/session/{sid}/query` → Ask question or summarize.

