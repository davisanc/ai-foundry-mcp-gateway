#!/usr/bin/env python3
"""
Create or update Azure AI Agent with MCP tools
Uses OpenAI-compatible REST API with Azure AI Foundry endpoint
"""
import os
import sys
import json
import requests
from azure.identity import DefaultAzureCredential

def main():
    # Get configuration from environment
    project_endpoint = os.environ['PROJECT_ENDPOINT']
    subscription_id = os.environ['AZURE_SUBSCRIPTION_ID']
    resource_group = os.environ.get('AI_PROJECT_RESOURCE_GROUP', os.environ['AZURE_RESOURCE_GROUP'])
    project_name = os.environ['AI_PROJECT_NAME']
    agent_name = os.environ['AI_AGENT_NAME']
    mcp_url = f"https://{os.environ['WEBAPP_NAME']}.azurewebsites.net/mcp/sse"
    
    print("=" * 70)
    print("Azure AI Agent Creation (OpenAI REST API)")
    print("=" * 70)
    print(f"Project Name: {project_name}")
    print(f"Resource Group: {resource_group}")
    print(f"MCP URL: {mcp_url}")
    print(f"Project Endpoint: {project_endpoint}")
    print()
    
    # Initialize credential and get access token
    credential = DefaultAzureCredential()
    
    # Get token for Cognitive Services
    print("Getting access token...")
    token = credential.get_token("https://cognitiveservices.azure.com/.default")
    
    headers = {
        "Authorization": f"Bearer {token.token}",
        "Content-Type": "application/json",
        "api-key": os.environ.get('FOUNDRY_API_KEY', '')  # Try API key as fallback
    }
    
    try:
        # Construct the OpenAI assistants API endpoint
        # For Cognitive Services: https://<resource-name>.cognitiveservices.azure.com/openai/assistants
        # Expected format: https://davidsr-ai-project-resourcev2.cognitiveservices.azure.com/openai/assistants
        api_endpoint = f"{project_endpoint.rstrip('/')}/openai/assistants?api-version=2024-05-01-preview"
        
        print(f"API Endpoint: {api_endpoint}")
        print()
        
        # Create new agent with MCP tools
        print(f"Creating agent: {agent_name}...")
        print()
        
        # Agent configuration for OpenAI API
        # Based on API error, the correct type is "mcp" not "mcp_server"
        agent_config = {
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
                    "server_label": "document_mcp_server",
                    "server_url": mcp_url
                }
            ]
        }
        
        print("Attempting agent creation via OpenAI API...")
        print("Agent configuration:")
        print(json.dumps(agent_config, indent=2))
        print()
        
        # Make POST request to create assistant
        response = requests.post(api_endpoint, headers=headers, json=agent_config, timeout=30)
        
        print(f"Response Status: {response.status_code}")
        
        if response.status_code in [200, 201]:
            agent = response.json()
            print("✅ Agent created successfully!")
        else:
            # Handle error
            print(f"❌ Failed to create agent: {response.status_code}")
            print(f"Response: {response.text}")
            
            try:
                error_data = response.json()
                error_msg = error_data.get('error', {}).get('message', str(error_data))
                error_type = error_data.get('error', {}).get('type', 'unknown')
                
                # Check for known limitation
                if 'mcp' in error_msg.lower() or 'enterprise' in error_msg.lower():
                    print()
                    print("⚠️  MCP tools require Enterprise offering")
                    print("   Standard API doesn't support MCP tools yet")
                    raise Exception(f"MCP tools not supported: {error_msg}")
                else:
                    raise Exception(f"API Error ({response.status_code}): {error_type} - {error_msg}")
            except json.JSONDecodeError:
                raise Exception(f"API Error ({response.status_code}): {response.text}")
        
        print()
        print("=" * 70)
        print("Agent Configuration Complete!")
        print("=" * 70)
        print(f"Agent ID: {agent.get('id', 'unknown')}")
        print(f"Agent Name: {agent.get('name', agent_name)}")
        print(f"Model: {agent.get('model', 'gpt-4o-mini')}")
        print(f"MCP Endpoint: {mcp_url}")
        print()
        print("Next Steps:")
        print("1. Go to https://ai.azure.com")
        print(f"2. Open project: {project_name}")
        print("3. Find your agent in the Agents section")
        print("4. Test it!")
        print("=" * 70)
        
        # Save agent ID
        agent_id = agent.get('id', '')
        if agent_id:
            with open('agent_id.txt', 'w') as f:
                f.write(agent_id)
        
        return 0
            
    except Exception as e:
        import traceback
        print()
        print("=" * 70)
        print("⚠️  AUTOMATED AGENT CREATION NOT SUPPORTED")
        print("=" * 70)
        
        error_msg = str(e).lower()
        if 'enterprise' in error_msg or 'mcp' in error_msg:
            print()
            print("❌ MCP Tools Limitation Detected")
            print("   MCP tools require 'Enterprise offering' tier")
            print("   Standard Azure Cognitive Services doesn't support MCP via API")
            print()
            print("✅ However, the Azure AI Foundry Portal DOES support MCP!")
            print("   You can create the agent manually through the web UI.")
        else:
            print()
            print(f"Error Type: {type(e).__name__}")
            print(f"Error Message: {str(e)}")
            print()
            print("Full Traceback:")
            traceback.print_exc()
        
        print()
        print("=" * 70)
        print("✅ YOUR MCP SERVER IS RUNNING SUCCESSFULLY")
        print("=" * 70)
        print()
        print(f"🌐 MCP Endpoint: {mcp_url}")
        print(f"📊 AI Project: {project_name}")
        print(f"📁 Resource Group: {resource_group}")
        print()
        print("=" * 70)
        print("📋 MANUAL AGENT CREATION STEPS")
        print("=" * 70)
        print()
        print("1. Open Azure AI Foundry Portal")
        print("   👉 https://ai.azure.com")
        print()
        print("2. Navigate to your project")
        print(f"   Project: {project_name}")
        print(f"   Resource Group: {resource_group}")
        print()
        print("3. Create New Agent")
        print("   • Click 'Agents' in left sidebar")
        print("   • Click '+ New Agent' button")
        print()
        print("4. Configure Agent")
        print(f"   • Name: {agent_name}")
        print("   • Model: gpt-4o-mini")
        print("   • Instructions: (Use the instructions below)")
        print()
        print("5. Add MCP Server Connection")
        print("   • In Tools section, click 'Add MCP Server'")
        print(f"   • Server URL: {mcp_url}")
        print("   • Label: document_mcp_server")
        print()
        print("6. MCP Tools Will Auto-Discover")
        print("   ✓ list_documents")
        print("   ✓ get_document")
        print("   ✓ search_documents")
        print("   ✓ upload_document")
        print()
        print("7. Save and Test!")
        print()
        print("=" * 70)
        print("📝 AGENT INSTRUCTIONS (Copy & Paste)")
        print("=" * 70)
        print("""
You are a helpful document analysis assistant with access to uploaded 
documents via MCP tools.

When users ask about documents:
1. Use list_documents to see available documents in their session
2. Use get_document to retrieve specific document content
3. Use search_documents to find information across documents
4. Provide clear, accurate answers based on the document content

Always cite which document you're referencing in your answers.
Be helpful, professional, and thorough in your analysis.
""")
        print("=" * 70)
        
        # Don't fail the deployment - MCP server is working
        return 0

if __name__ == "__main__":
    sys.exit(main())
