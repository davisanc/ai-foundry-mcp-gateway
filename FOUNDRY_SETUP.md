# Azure AI Foundry Configuration Guide

## Problem: Web App Cannot Access Foundry Resource

If your web app shows errors like:
- `FOUNDRY_API_KEY not configured`
- `401 Unauthorized` from Foundry
- `Cannot access Foundry resource`

Follow this guide to diagnose and fix the issue.

---

## Architecture: API Key vs Managed Identity

### Current Approach: API Key Authentication (RECOMMENDED)

**Pros:**
- ✅ Simple and immediate
- ✅ Works without RBAC setup
- ✅ No service principal complexity

**What needs to be set:**
1. `FOUNDRY_ENDPOINT` - Your Foundry deployment endpoint
2. `FOUNDRY_API_KEY` - Your Foundry API key

### Alternative: Managed Identity Authentication

**Pros:**
- ✅ More secure (no secrets in code)
- ✅ Automatic credential rotation
- ✅ RBAC-based access control

**What needs to be set:**
1. Web app system-assigned managed identity
2. RBAC role assignments on Foundry resource

---

## Troubleshooting Checklist

### 1. Check Configuration Variables

**Step 1:** Verify secrets are set in GitHub

```bash
# In your GitHub repository:
# Settings → Secrets and variables → Actions
```

Required secrets:
- [ ] `FOUNDRY_ENDPOINT` - Full endpoint URL including deployment path
- [ ] `FOUNDRY_API_KEY` - Your API key (not shared!)

**Step 2:** Check Web App Application Settings

```bash
az webapp config appsettings list \
  -g ai-mcp-rg \
  -n mcp-server-app-davisanc
```

Should show:
```
FOUNDRY_ENDPOINT=https://...
FOUNDRY_API_KEY=***
```

### 2. Validate Foundry Endpoint Format

Your `FOUNDRY_ENDPOINT` should look like:

```
https://{your-project}.openai.azure.com/openai/deployments/{model}/chat/completions?api-version=2024-08-01-preview
```

**Get the correct endpoint:**

```bash
# List your AI Foundry resources
az resource list \
  -g AI-RG \
  --resource-type "Microsoft.CognitiveServices/accounts"

# Get deployment details
az cognitiveservices account show \
  -g AI-RG \
  -n davidsr-ai-project-resourcev2 \
  --query "properties.endpoints"
```

### 3. Test API Key Connectivity

Run this curl command to test your Foundry connection:

```bash
curl -X POST \
  -H "api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Say hello"}],
    "max_tokens": 100
  }' \
  YOUR_FOUNDRY_ENDPOINT
```

**Expected response:**
- 200 OK with JSON response containing `choices[0].message.content`

**Common errors:**
- 401 Unauthorized → Invalid API key
- 404 Not Found → Invalid endpoint URL
- 403 Forbidden → Insufficient permissions

### 4. Check Managed Identity (if using RBAC)

**Verify web app has managed identity:**

```bash
az webapp identity show \
  -g ai-mcp-rg \
  -n mcp-server-app-davisanc
```

Should output:
```json
{
  "principalId": "...",
  "tenantId": "...",
  "type": "SystemAssigned"
}
```

**Verify role assignments:**

```bash
PRINCIPAL_ID=$(az webapp identity show \
  -g ai-mcp-rg \
  -n mcp-server-app-davisanc \
  --query principalId -o tsv)

RESOURCE_ID=$(az resource show \
  -g AI-RG \
  -n davidsr-ai-project-resourcev2 \
  --resource-type "Microsoft.CognitiveServices/accounts" \
  --query id -o tsv)

az role assignment list \
  --assignee-object-id "$PRINCIPAL_ID" \
  --scope "$RESOURCE_ID" \
  -o table
```

Should show:
- `Cognitive Services OpenAI Contributor`
- `Azure AI User` (optional but recommended)

---

## Manual Setup Steps

### Option A: API Key Authentication (Recommended)

1. **Get your Foundry API Key:**
   ```bash
   az cognitiveservices account keys list \
     -g AI-RG \
     -n davidsr-ai-project-resourcev2 \
     --query "key1" -o tsv
   ```

2. **Add to GitHub Secrets:**
   - Go to `Settings → Secrets and variables → Actions`
   - Click `New repository secret`
   - Name: `FOUNDRY_API_KEY`
   - Value: Your API key from step 1

3. **Verify deployment:**
   ```bash
   az webapp config appsettings list \
     -g ai-mcp-rg \
     -n mcp-server-app-davisanc | grep FOUNDRY
   ```

### Option B: Managed Identity Setup

1. **Enable managed identity on web app:**
   ```bash
   az webapp identity assign \
     -g ai-mcp-rg \
     -n mcp-server-app-davisanc \
     --identities [system]
   ```

2. **Get the principal ID:**
   ```bash
   PRINCIPAL_ID=$(az webapp identity show \
     -g ai-mcp-rg \
     -n mcp-server-app-davisanc \
     --query principalId -o tsv)
   echo $PRINCIPAL_ID
   ```

3. **Assign RBAC roles:**
   ```bash
   RESOURCE_ID=$(az resource show \
     -g AI-RG \
     -n davidsr-ai-project-resourcev2 \
     --resource-type "Microsoft.CognitiveServices/accounts" \
     --query id -o tsv)

   # Assign Cognitive Services OpenAI Contributor
   az role assignment create \
     --assignee-object-id "$PRINCIPAL_ID" \
     --role "Cognitive Services OpenAI Contributor" \
     --scope "$RESOURCE_ID"

   # Assign Azure AI User (optional)
   az role assignment create \
     --assignee-object-id "$PRINCIPAL_ID" \
     --role "Azure AI User" \
     --scope "$RESOURCE_ID"
   ```

4. **Wait 5-10 minutes** for Azure to propagate the role assignments

---

## Common Issues and Fixes

### Issue: "FOUNDRY_API_KEY not configured"

**Cause:** The app setting is not set or not deployed

**Fix:**
```bash
# Manually set it
az webapp config appsettings set \
  -g ai-mcp-rg \
  -n mcp-server-app-davisanc \
  --settings FOUNDRY_API_KEY="your-key-here"

# Restart the app
az webapp restart \
  -g ai-mcp-rg \
  -n mcp-server-app-davisanc
```

### Issue: "401 Unauthorized"

**Cause:** Invalid or expired API key

**Fix:**
1. Get a fresh API key:
   ```bash
   az cognitiveservices account keys regenerate \
     -g AI-RG \
     -n davidsr-ai-project-resourcev2 \
     --key-name key1
   ```

2. Update the app setting with the new key
3. Restart the app

### Issue: "404 Not Found" from Foundry

**Cause:** Wrong endpoint URL or deployment name

**Fix:**
1. Verify the correct endpoint:
   ```bash
   az cognitiveservices account show \
     -g AI-RG \
     -n davidsr-ai-project-resourcev2 \
     --query properties.endpoints
   ```

2. Update `FOUNDRY_ENDPOINT` in GitHub Secrets
3. Re-run the deployment workflow

### Issue: Role Assignment Failed

**Cause:** Insufficient permissions or wrong resource ID

**Fix:**
1. Check your Azure permissions (need Owner or User Access Administrator on the resource)
2. Verify the resource exists:
   ```bash
   az resource show \
     -g AI-RG \
     -n davidsr-ai-project-resourcev2 \
     --resource-type "Microsoft.CognitiveServices/accounts"
   ```

3. Manually assign roles through Azure Portal:
   - Go to Resource → Access Control (IAM)
   - Click "Add role assignment"
   - Select "Cognitive Services OpenAI Contributor"
   - Select your web app from the list

---

## Testing the Connection

### Test from Web App Shell

```bash
# SSH into the web app
az webapp create-remote-connection \
  -g ai-mcp-rg \
  -n mcp-server-app-davisanc

# Test the endpoint (inside SSH)
curl -X POST \
  -H "api-key: $FOUNDRY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hello"}],"max_tokens":10}' \
  "$FOUNDRY_ENDPOINT"
```

### Check App Logs

```bash
az webapp log tail \
  -g ai-mcp-rg \
  -n mcp-server-app-davisanc
```

Look for:
- ✅ "🔹 Sending request to Azure GPT-4o-mini..."
- ✅ "Has API Key: true"
- ❌ "FOUNDRY_API_KEY not configured"
- ❌ "❌ Foundry API error"

---

## Deployment Variables

**In `.github/workflows/deploy.yml`:**

```yaml
env:
  AI_PROJECT_NAME: davidsr-ai-project-resourcev2
  AI_PROJECT_RESOURCE_GROUP: AI-RG
```

**In GitHub Secrets:**
- `FOUNDRY_ENDPOINT` - Your deployment endpoint
- `FOUNDRY_API_KEY` - Your API key (for API key auth)
- `AZURE_CREDENTIALS` - Your Azure service principal credentials

---

## Monitoring

**Check app health:**
```bash
curl https://mcp-server-app-davisanc.azurewebsites.net/healthz
```

**View recent logs:**
```bash
az webapp log tail \
  -g ai-mcp-rg \
  -n mcp-server-app-davisanc \
  --provider Application
```

**Monitor from portal:**
1. Go to Azure Portal → Web App → Monitoring
2. Check Application Insights metrics
3. View live metrics and traces

---

## Support

If you still have issues:

1. **Check the logs** (see above)
2. **Verify all configuration** (see checklist)
3. **Test connectivity** (see testing section)
4. **Check GitHub Actions** workflow run logs for deployment errors

For Azure Foundry support, see: https://learn.microsoft.com/en-us/azure/ai-services/

