--- 
title: "Build MCP Servers with Tools from Scratch with LangChain"
description: "Create a custom MCP server with FastMCP and connect its tools to a LangGraph agent using LangChain."
pubDate: "2026-09-04"
tags:
  - mcp
  - langchain
  - langgraph
  - python
coverImage: "../../../assets/thumbnails/build-mcp-servers-with-langchain.svg"
---

While consuming existing MCP servers is useful, the real power of the Model Context Protocol comes when you build custom servers to expose your own business logic, databases, and APIs.

Using Python, FastMCP, and the `langchain-mcp-adapters` package, you can create a custom server and connect it to a LangGraph or LangChain agent in just a few lines of code.

## Project Setup

To manage your environment cleanly, you can use `uv`, the fast Python package manager:

```bash
uv init mcp-server-demo
cd mcp-server-demo
uv add mcp langchain-mcp-adapters langchain-groq langgraph
```

## Building the Custom MCP Server

We will create an MCP server that provides two specific tools: a safe math calculator and a weather lookup function. Create a file named `server.py`:

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("demo-math-weather-server")

@mcp.tool()
def add_numbers(a: float, b: float) -> float:
    """Add two numbers together and return the sum."""
    return a + b

@mcp.tool()
def get_current_weather(city: str) -> str:
    """Get current weather information for a given city."""
    city_normalized = city.strip().lower()
    if "paris" in city_normalized:
        return "The weather in Paris is 18C and partly cloudy."
    elif "new york" in city_normalized:
        return "The weather in New York is 22C and sunny."
    else:
        return f"The weather in {city} is 25C and clear."

if __name__ == "__main__":
    mcp.run()
```

FastMCP automatically generates the JSON schema, handles input validation, and exposes the functions via the Model Context Protocol.

## Building the Client with LangChain and LangGraph

Now, let us create a client script named `client.py` that starts our custom server, loads its tools, and lets an LLM call them:

```python
import asyncio
import os
from langchain_groq import ChatGroq
from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent

async def main():
    model = ChatGroq(
        model_name="llama-3.3-70b-versatile",
        groq_api_key=os.environ.get("GROQ_API_KEY")
    )

    async with MultiServerMCPClient(
        {
            "demo_server": {
                "command": "python",
                "args": ["server.py"],
                "transport": "stdio",
            }
        }
    ) as client:
        tools = client.get_tools()
        print(f"Loaded {len(tools)} tools from server.")

        agent = create_react_agent(model, tools)
        query = "What is the weather in Paris, and what is 45 plus 55?"
        print(f"\nUser: {query}\n")

        response = await agent.ainvoke({"messages": [("user", query)]})
        final_message = response["messages"][-1]
        print("Agent Response:")
        print(final_message.content)

if __name__ == "__main__":
    asyncio.run(main())
```

## Summary

With this pattern, your server code focuses solely on business logic and API integrations, while your client handles conversation flow and reasoning. Any other MCP client, including Claude Desktop, can connect to this same server without requiring any modifications.
