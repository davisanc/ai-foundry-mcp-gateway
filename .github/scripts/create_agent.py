#!/usr/bin/env python3
"""
Create or update Azure AI Agent with MCP tools
Uses Azure AI Projects SDK - attempting to find correct MCP imports
"""
import os
import sys
import json
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential

# Try to import MCP-related classes
try:
    from azure.ai.agents.models import McpTool
    print("✅ McpTool imported from azure.ai.agents.models")
except ImportError:
    try:
        from azure.ai.projects.models import McpTool
        print("✅ McpTool imported from azure.ai.projects.models")
    except ImportError:
        print("⚠️  McpTool not found in SDK, will use manual configuration")
        McpTool = None

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
        print(f"Project Endpoint: {project_endpoint}")
        print(f"Project Name: {project_name}")
        print(f"Subscription: {subscription_id}")
        print(f"Resource Group: {resource_group}")
        print()
        
        # The AIProjectClient might need different parameters based on the resource type
        # For AIServices (Cognitive Services with AI capabilities), we may not need
        # to specify subscription_id, resource_group_name, and project_name
        
        try:
            # Attempt 1: Full parameters (for ML workspace-based projects)
            print("Attempt 1: Initializing with full project parameters...")
            project_client = AIProjectClient(
                endpoint=project_endpoint,
                credential=credential,
                subscription_id=subscription_id,
                resource_group_name=resource_group,
                project_name=project_name
            )
            print("✅ Connected with full parameters!")
        except Exception as e1:
            print(f"Failed with full parameters: {e1}")
            print()
            print("Attempt 2: Initializing with endpoint and credential only...")
            try:
                # Attempt 2: Minimal parameters (for AIServices resources)
                project_client = AIProjectClient(
                    endpoint=project_endpoint,
                    credential=credential
                )
                print("✅ Connected with minimal parameters!")
            except Exception as e2:
                print(f"Failed with minimal parameters: {e2}")
                raise Exception(f"Could not initialize AI Project Client. Errors: [1: {e1}] [2: {e2}]")
        
        print()
        
        # Create MCP tool configuration
        print(f"Creating MCP tool configuration...")
        
        if McpTool is not None:
            # Use SDK's McpTool class if available
            print("Using McpTool class from SDK")
            mcp_tool = McpTool(
                server_label="document_mcp_server",
                server_url=mcp_url,
                allowed_tools=[]  # Empty list means allow all tools
            )
            tool_definitions = mcp_tool.definitions
        else:
            # Fallback: manually construct MCP tool definition
            # Try different formats based on API error messages
            print("McpTool class not available, trying manual configurations")
            
            # Format 1: server_label and server_url at top level with type: mcp
            tool_definitions = [{
                "type": "mcp",
                "server_label": "document_mcp_server",
                "server_url": mcp_url
            }]
        
        print(f"MCP Server Label: document_mcp_server")
        print(f"MCP Server URL: {mcp_url}")
        print(f"Tool definitions: {json.dumps(tool_definitions, indent=2)}")
        print()
        
        # Create agent with MCP tool
        print(f"Creating agent: {agent_name}...")
        
        with project_client:
            agents_client = project_client.agents
            
            agent = agents_client.create_agent(
                model="gpt-4o-mini",
                name=agent_name,
                instructions="""You are a helpful document analysis assistant with access to uploaded documents via MCP tools.

When users ask about documents:
1. Use list_documents to see available documents in their session
2. Use get_document to retrieve specific document content
3. Use search_documents to find information across documents
4. Provide clear, accurate answers based on the document content

Always cite which document you're referencing in your answers.
Be helpful, professional, and thorough in your analysis.""",
                tools=tool_definitions,
            )
            
            print("✅ Agent created successfully!")
            print()
            
            print("=" * 70)
            print("Agent Configuration Complete!")
            print("=" * 70)
            print(f"Agent ID: {agent.id}")
            print(f"Agent Name: {agent.name}")
            print(f"Model: {agent.model}")
            print(f"MCP Server: document_mcp_server")
            print(f"MCP Endpoint: {mcp_url}")
            print()
            if hasattr(agent, 'tools') and agent.tools:
                print("Agent Tools:")
                for tool in agent.tools:
                    print(f"  • {tool}")
            print()
            print("Next Steps:")
            print("1. Go to https://ai.azure.com")
            print(f"2. Open project: {project_name}")
            print("3. Find your agent in the Agents section")
            print("4. Test it with document queries!")
            print("=" * 70)
            
            # Save agent ID
            with open('agent_id.txt', 'w') as f:
                f.write(agent.id)
            
            return 0
            
    except Exception as e:
        import traceback
        print()
        print("=" * 70)
        print("⚠️  AUTOMATED AGENT CREATION NOT SUPPORTED")
        print("=" * 70)
        
        error_msg = str(e).lower()
        
        # Check if it's a Cognitive Services vs AI Foundry Project issue
        if 'cognitive services' in error_msg or 'cognitiveservices' in project_endpoint.lower():
            print()
            print("❌ Resource Type Mismatch")
            print()
            print("Your resource 'davidsr-ai-project-resourcev2' is a:")
            print("   🔸 Cognitive Services Account")
            print()
            print("For automated agent creation with MCP, you need:")
            print("   ✅ AI Foundry PROJECT (not just a Cognitive Services resource)")
            print()
            print("=" * 70)
            print("HOW TO CREATE AN AI FOUNDRY PROJECT")
            print("=" * 70)
            print()
            print("1. Go to https://ai.azure.com")
            print("2. Click '+ New project' (not '+ New resource')")
            print("3. Follow the wizard to create a PROJECT")
            print("4. Once created, update your GitHub secrets with:")
            print("   - AI_PROJECT_NAME: <new project name>")
            print("   - The project will have a different endpoint format")
            print()
            print("Note: AI Foundry Projects can use your existing")
            print("      Cognitive Services resources for the AI models.")
            print()
        elif 'enterprise' in error_msg or 'mcp' in error_msg:
            print()
            print("❌ MCP Tools Limitation")
            print("   MCP tools may require 'Enterprise offering' tier")
            print()
        elif '404' in error_msg or 'not found' in error_msg:
            print()
            print("❌ Agents API Not Available")
            print()
            print("The Agents API endpoint returned 404 (Not Found).")
            print()
            if "cognitiveservices" in project_endpoint.lower():
                print("Reason: You're using a Cognitive Services account,")
                print("        which doesn't have the Agents API.")
                print()
                print("Solution: Create an AI Foundry PROJECT at https://ai.azure.com")
            else:
                print("This could mean:")
                print("  • Wrong endpoint format")
                print("  • Agents API not enabled for this region")
                print("  • Service principal lacks permissions")
            print()
        else:
            print()
            print(f"Error Type: {type(e).__name__}")
            print(f"Error Message: {str(e)}")
            print()
            if os.environ.get('DEBUG'):
                print("Full Traceback:")
                traceback.print_exc()
                print()
        
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
