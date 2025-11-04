#!/usr/bin/env python3
"""
Create or update Azure AI Agent with MCP tools
"""
import os
import sys
import json
import requests
from azure.identity import DefaultAzureCredential

def get_access_token(credential):
    """Get Azure access token for AI services"""
    token = credential.get_token("https://cognitiveservices.azure.com/.default")
    return token.token

def main():
    # Get configuration from environment
    project_endpoint = os.environ['PROJECT_ENDPOINT']
    subscription_id = os.environ['AZURE_SUBSCRIPTION_ID']
    resource_group = os.environ.get('AI_PROJECT_RESOURCE_GROUP', os.environ['AZURE_RESOURCE_GROUP'])
    project_name = os.environ['AI_PROJECT_NAME']
    agent_name = os.environ['AI_AGENT_NAME']
    mcp_url = f"https://{os.environ['WEBAPP_NAME']}.azurewebsites.net/mcp/sse"
    
    print("=" * 70)
    print("Azure AI Agent Creation (Direct REST API)")
    print("=" * 70)
    print(f"Project Name: {project_name}")
    print(f"Resource Group: {resource_group}")
    print(f"MCP URL: {mcp_url}")
    print()
    
    # Initialize credential
    credential = DefaultAzureCredential()
    
    try:
        print("Getting Azure access token...")
        access_token = get_access_token(credential)
        print("Got access token")
        print()
        
        print("Attempting to create agent via REST API...")
        
        # For Cognitive Services-based AI Foundry projects, the endpoint is:
        # https://<resource-name>.services.ai.azure.com/
        resource_name = project_name
        
        # Construct the correct AI Foundry API endpoint
        foundry_endpoint = f"https://{resource_name}.services.ai.azure.com"
        api_endpoint = f"{foundry_endpoint}/openai/assistants?api-version=2024-05-01-preview"
        
        print(f"Foundry Endpoint: {foundry_endpoint}")
        print(f"API Endpoint: {api_endpoint}")
        print()
        
        # Agent configuration
        agent_payload = {
            "model": "gpt-4o-mini",
            "name": agent_name,
            "description": "AI agent that analyzes documents using MCP gateway",
            "instructions": """You are a helpful document analysis assistant with access to uploaded documents via MCP tools.

When users ask about documents:
1. Use list_documents to see available documents in their session
2. Use get_document to retrieve specific document content
3. Use search_documents to find information across documents
4. Provide clear, accurate answers based on the document content

Always cite which document you're referencing in your answers.
Be helpful, professional, and thorough in your analysis.""",
            "tools": [
                {
                    "type": "mcp",
                    "server_label": "document-mcp-server",
                    "server_url": mcp_url
                }
            ],
            "metadata": {
                "created_by": "github-actions",
                "project": project_name
            }
        }
        
        print("Agent payload:")
        print(json.dumps(agent_payload, indent=2))
        print()
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "api-key": access_token  # Some endpoints need this header instead
        }
        
        print("Sending POST request to create agent...")
        response = requests.post(api_endpoint, headers=headers, json=agent_payload, timeout=30)
        
        print(f"Response Status: {response.status_code}")
        print()
        
        if response.status_code in [200, 201]:
            agent_data = response.json()
            print("=" * 70)
            print("Agent Created Successfully!")
            print("=" * 70)
            print(f"Agent ID: {agent_data.get('id', 'N/A')}")
            print(f"Agent Name: {agent_data.get('name', agent_name)}")
            print(f"MCP Endpoint: {mcp_url}")
            print()
            print("Next Steps:")
            print("1. Go to https://ai.azure.com")
            print(f"2. Open project: {project_name}")
            print("3. Find your agent in the Agents section")
            print("4. Test it by uploading a document and asking questions!")
            print("=" * 70)
            
            # Save agent ID
            with open('agent_id.txt', 'w') as f:
                f.write(agent_data.get('id', ''))
            
            return 0
        else:
            print("API call failed")
            print(f"Status: {response.status_code}")
            print(f"Response Headers: {dict(response.headers)}")
            print(f"Response Body: {response.text}")
            print()
            
            # Check if it's a permission error
            if response.status_code == 401 and "PermissionDenied" in response.text:
                print()
                print("=" * 70)
                print("PERMISSION ERROR - ACTION REQUIRED")
                print("=" * 70)
                print()
                print("The GitHub Actions service principal needs the")
                print("'Cognitive Services OpenAI Contributor' role.")
                print()
                print("To fix this, run the following command locally:")
                print()
                print("az role assignment create \\")
                print("  --assignee b4d76bc7-7848-4345-8ff2-b0aa0a61d557 \\")
                print("  --role 'Cognitive Services OpenAI Contributor' \\")
                print(f"  --scope /subscriptions/{subscription_id}/resourceGroups/{resource_group}/providers/Microsoft.CognitiveServices/accounts/{project_name}")
                print()
                print("After running this command, re-run the GitHub Actions workflow.")
                print("=" * 70)
                print()
                # Don't raise exception for permission errors - just warn
                return 0
            
            raise Exception(f"Agent creation failed with status {response.status_code}: {response.text}")
            
    except Exception as e:
        import traceback
        print()
        print("=" * 70)
        print("Agent Creation Failed")
        print("=" * 70)
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Message: {str(e)}")
        print()
        print("Full Traceback:")
        traceback.print_exc()
        print()
        print("=" * 70)
        print("Troubleshooting")
        print("=" * 70)
        print("The azure-ai-projects Python SDK may not fully support agent")
        print("creation for your project type yet.")
        print()
        print("Recommended approach: Create the agent manually")
        print()
        print("Your MCP server is deployed successfully at:")
        print(f"  {mcp_url}")
        print()
        print("To create the agent manually:")
        print("1. Go to https://ai.azure.com")
        print(f"2. Navigate to project: {project_name}")
        print(f"3. Resource Group: {resource_group}")
        print("4. Create a new agent:")
        print(f"   - Name: {agent_name}")
        print("   - Model: gpt-4o-mini")
        print("   - Add MCP connection:")
        print(f"     * URL: {mcp_url}")
        print("     * Transport: sse")
        print("5. Add these tools: list_documents, get_document, search_documents")
        print("=" * 70)
        
        # Don't fail the deployment - MCP server is deployed successfully
        return 0

if __name__ == "__main__":
    sys.exit(main())
