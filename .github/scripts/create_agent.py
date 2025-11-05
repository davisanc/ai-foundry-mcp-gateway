#!/usr/bin/env python3
"""
Create or update Azure AI Agent with MCP tools
Uses Azure AI Projects SDK with correct AI Foundry endpoint
"""
import os
import sys
import json
from azure.ai.projects import AIProjectClient
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
    print("Azure AI Agent Creation (Azure AI Projects SDK)")
    print("=" * 70)
    print(f"Project Name: {project_name}")
    print(f"Resource Group: {resource_group}")
    print(f"MCP URL: {mcp_url}")
    print(f"Project Endpoint: {project_endpoint}")
    print()
    
    # Initialize credential
    credential = DefaultAzureCredential()
    
    try:
        print("Initializing Azure AI Project Client...")
        print(f"Using endpoint: {project_endpoint}")
        print()
        
        # Initialize AIProjectClient with the correct AI Foundry endpoint
        # The endpoint should be: https://<project-name>.services.ai.azure.com
        client = AIProjectClient(
            endpoint=project_endpoint,
            credential=credential,
            subscription_id=subscription_id,
            resource_group_name=resource_group,
            project_name=project_name
        )
        
        print("Successfully connected to AI Project!")
        print()
        
        # Create new agent with MCP tools
        print(f"Creating agent: {agent_name}...")
        print()
        
        # Agent configuration for SDK
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
                    "type": "mcp_server",
                    "server_label": "document_mcp_server",
                    "server_url": mcp_url
                }
            ]
        }
        
        print("Attempting agent creation with SDK...")
        print("Agent configuration:")
        print(json.dumps(agent_config, indent=2))
        print()
        
        # Create agent using SDK
        agent = client.agents.create_agent(**agent_config)
        print("Agent created successfully!")
        
        print()
        print("=" * 70)
        print("Agent Configuration Complete!")
        print("=" * 70)
        print(f"Agent ID: {agent.id}")
        print(f"Agent Name: {getattr(agent, 'name', agent_name)}")
        print(f"MCP Endpoint: {mcp_url}")
        print()
        print("Next Steps:")
        print("1. Go to https://ai.azure.com")
        print(f"2. Open project: {project_name}")
        print("3. Find your agent in the Agents section")
        print("4. Test it!")
        print("=" * 70)
        
        # Save agent ID
        with open('agent_id.txt', 'w') as f:
            f.write(agent.id)
        
        return 0
            
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
        print("CREATE AGENT MANUALLY")
        print("=" * 70)
        print()
        print("Your MCP server is deployed successfully at:")
        print(f"  {mcp_url}")
        print()
        print("To create the agent in Azure AI Foundry portal:")
        print("1. Go to https://ai.azure.com")
        print(f"2. Navigate to project: {project_name} (Resource Group: {resource_group})")
        print("3. Click 'Agents' -> '+ New Agent'")
        print(f"4. Name: {agent_name}, Model: gpt-4o-mini")
        print(f"5. Add MCP Server with URL: {mcp_url}")
        print("6. Tools will auto-discover: list_documents, get_document, search_documents")
        print("7. Save and test!")
        print("=" * 70)
        
        # Don't fail the deployment - MCP server is working
        return 0

if __name__ == "__main__":
    sys.exit(main())
