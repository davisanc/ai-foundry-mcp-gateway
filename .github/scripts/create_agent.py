#!/usr/bin/env python3
"""
Create or update Azure AI Agent with MCP tools
"""
import os
import sys
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential

def main():
    # Get configuration from environment
    project_endpoint = os.environ['PROJECT_ENDPOINT']
    subscription_id = os.environ['AZURE_SUBSCRIPTION_ID']
    resource_group = os.environ['AZURE_RESOURCE_GROUP']
    project_name = os.environ['AI_PROJECT_NAME']
    agent_name = os.environ['AI_AGENT_NAME']
    mcp_url = f"https://{os.environ['WEBAPP_NAME']}.azurewebsites.net/mcp/sse"
    
    print("=" * 70)
    print("🔧 Azure AI Agent Creation")
    print("=" * 70)
    print(f"Project Name: {project_name}")
    print(f"Project Endpoint: {project_endpoint}")
    print(f"Resource Group: {resource_group}")
    print(f"MCP URL: {mcp_url}")
    print(f"SDK Version: ", end="")
    
    import azure.ai.projects
    print(azure.ai.projects.__version__)
    print()
    
    # Initialize credential
    credential = DefaultAzureCredential()
    
    try:
        print("📡 Connecting to Azure AI Project...")
        print(f"   Using endpoint: {project_endpoint}")
        print()
        
        # Initialize the client with the project endpoint
        # The new SDK uses project_endpoint instead of individual parameters
        client = AIProjectClient(
            endpoint=project_endpoint,
            credential=credential,
            subscription_id=subscription_id,
            resource_group_name=resource_group,
            project_name=project_name
        )
        
        print("✅ Successfully connected to AI Project!")
        print()
        
        # Check if agents API is available
        print("🔍 Checking for existing agents...")
        try:
            existing_agents = list(client.agents.list_agents())
            print(f"✅ Agent API is available")
            print(f"   Found {len(existing_agents)} existing agent(s)")
            
            # Check if our agent already exists
            existing_agent = None
            for agent in existing_agents:
                if hasattr(agent, 'name') and agent.name == agent_name:
                    existing_agent = agent
                    print(f"   ⚠️  Agent '{agent_name}' already exists (ID: {agent.id})")
                    break
            
            print()
            
        except Exception as list_error:
            print(f"⚠️  Could not list agents: {list_error}")
            print(f"   Continuing with creation attempt...")
            print()
            existing_agent = None
        
        if existing_agent:
            print(f"ℹ️  Using existing agent: {existing_agent.id}")
            agent = existing_agent
        else:
            # Create new agent with MCP tools
            print(f"🤖 Creating new agent: {agent_name}...")
            
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
                        "mcp": {
                            "url": mcp_url,
                            "transport": "sse"
                        }
                    }
                ]
            }
            
            agent = client.agents.create_agent(**agent_config)
            print(f"✅ Agent created successfully!")
        
        print()
        print("=" * 70)
        print("🎉 Agent Configuration Complete!")
        print("=" * 70)
        print(f"Agent ID: {agent.id}")
        print(f"Agent Name: {agent.name if hasattr(agent, 'name') else 'N/A'}")
        print(f"MCP Endpoint: {mcp_url}")
        print()
        print("Next Steps:")
        print("1. Go to https://ai.azure.com")
        print(f"2. Open project: {project_name}")
        print("3. Find your agent in the Agents section")
        print("4. Test it by uploading a document and asking questions!")
        print("=" * 70)
        
        # Save agent ID for later use
        with open('agent_id.txt', 'w') as f:
            f.write(agent.id)
        
        return 0
            
    except Exception as e:
        import traceback
        print()
        print("=" * 70)
        print("⚠️  Agent Creation Failed")
        print("=" * 70)
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Message: {str(e)}")
        print()
        print("Full Traceback:")
        traceback.print_exc()
        print()
        print("=" * 70)
        print("📋 Troubleshooting")
        print("=" * 70)
        print("Possible causes:")
        print("1. Project type might be hub-based (not supported)")
        print(f"   - Check: az resource show --name {project_name} --resource-group {resource_group}")
        print("2. Incorrect endpoint format")
        print(f"   - Current endpoint: {project_endpoint}")
        print("   - Try finding correct endpoint at: https://ai.azure.com")
        print("     → Go to your project → Settings → Project properties")
        print("3. Missing role assignments")
        print("   - Need 'Azure AI Developer' or 'Azure AI User' role")
        print(f"   - Run: az role assignment create --assignee <your-email> \\")
        print(f"     --role 'Azure AI Developer' \\")
        print(f"     --scope /subscriptions/{subscription_id}/resourceGroups/{resource_group}")
        print("4. SDK version incompatibility")
        print("   - Need azure-ai-projects >= 1.0.0")
        print("   - Current SDK supports preview API version 2025-05-15-preview")
        print()
        print("Your MCP server is still deployed successfully at:")
        print(f"  {mcp_url}")
        print()
        print("To create the agent manually:")
        print("1. Go to https://ai.azure.com")
        print(f"2. Navigate to project: {project_name}")
        print("3. Create a new agent with MCP connection")
        print(f"4. Use MCP URL: {mcp_url}")
        print("5. Add these tools: list_documents, get_document, search_documents")
        print("=" * 70)
        
        # Don't fail the deployment - MCP server is deployed successfully
        return 0

if __name__ == "__main__":
    sys.exit(main())
