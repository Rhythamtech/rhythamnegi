--- 
title: "MCP Agentic AI Crash Course with Python"
description: "Learn how to connect a Python agent to MCP servers, discover tools, and build an autonomous tool-calling loop."
pubDate: "2026-09-03"
tags:
  - mcp
  - python
  - agents
coverImage: "../../../assets/thumbnails/mcp-agentic-ai-crash-course-with-python.svg"
---

Agentic AI refers to artificial intelligence systems that can reason, plan, and execute multiple actions across external tools to accomplish a goal. While basic chatbots simply return text, an agent can observe a problem, decide which tool to call, evaluate the result, and take follow-up steps.

To build reliable agents in Python, you need a structured way to handle tool interactions. This is where the official Python MCP SDK comes in.

## The Client-Server Pattern in Python

An MCP architecture separates the agent into two clean sides:

- **The server:** A standalone program that provides functions (tools) or data (resources).
- **The client:** The agent runtime that reads user input, coordinates with the LLM, and calls tools on the server via standard JSON-RPC messages.

## Setting Up the Official MCP Library

To get started with the official Model Context Protocol implementation in Python, install the SDK:

```bash
pip install mcp
```

## Creating a Client Session

In Python, MCP interactions typically run asynchronously. The client establishes a session with an MCP server through a standard transport layer, such as `StdioServerParameters`, which launches a local command-line server.

Here is a practical Python example showing how an agent connects to an MCP server, inspects its available tools, and runs one:

```python
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def run_mcp_agent():
    server_params = StdioServerParameters(
        command="python",
        args=["my_tools_server.py"]
    )

    async with stdio_client(server_params) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            print("Connected to MCP Server successfully.")

            tools_list = await session.list_tools()
            print("\nAvailable Tools on Server:")
            for tool in tools_list.tools:
                print(f"- {tool.name}: {tool.description}")

            tool_name = "add_numbers"
            tool_arguments = {"a": 25, "b": 75}

            print(f"\nCalling tool: {tool_name} with args {tool_arguments}")
            result = await session.call_tool(tool_name, arguments=tool_arguments)

            print("\nTool Output:")
            for content in result.content:
                if content.type == "text":
                    print(content.text)

if __name__ == "__main__":
    asyncio.run(run_mcp_agent())
```

## Building an Autonomous Agent Loop

To turn this into a fully autonomous agent:

1. **Fetch tools:** Call `session.list_tools()` and pass the definitions to your LLM as function tools.
2. **Prompt the LLM:** Send the user query to the LLM.
3. **Handle tool calls:** If the LLM generates a tool call, invoke `session.call_tool(name, args)`.
4. **Send results back:** Pass the tool output back into the conversation history so the model can inspect it.
5. **Repeat:** Continue the loop until the LLM decides the task is finished and generates a final user-facing response.

Separating your agent logic from your tool logic ensures that your agent code remains clean, testable, and maintainable.
