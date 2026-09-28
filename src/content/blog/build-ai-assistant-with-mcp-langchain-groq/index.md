--- 
title: "Build an AI Assistant with MCP Servers and Tools Using LangChain and Groq"
description: "A practical guide to building a fast AI assistant with LangChain, Groq, and the mcp-use library."
pubDate: "2026-09-02"
tags:
  - mcp
  - langchain
  - groq
  - python
coverImage: "../../../assets/thumbnails/build-ai-assistant-with-mcp-langchain-groq.svg"
---

Building an AI assistant with access to real-time tools used to mean writing custom tool wrappers, formatting schemas manually, and wiring them into your model runner. With the Model Context Protocol (MCP), you can connect fast language models to existing MCP servers with minimal code.

In this tutorial, we will look at how to build an AI assistant in Python using LangChain, Groq for ultra-fast model inference, and the mcp-use library to connect to external MCP servers.

## Prerequisites and Installation

Before writing code, make sure you have Python installed and grab an API key from the Groq console. Then install the necessary dependencies:

```bash
pip install langchain-groq mcp-use python-dotenv
```

You can set your Groq API key in your terminal or inside a `.env` file:

```bash
export GROQ_API_KEY="your-groq-api-key"
```

## How the Setup Works

The setup connects three parts:

1. Groq provides the LLM, such as `llama-3.3-70b-versatile` or `llama-3.1-8b-instant`, which runs with high speed.
2. An MCP server exposes tools, such as web searching or file management.
3. LangChain and the MCP client orchestrate tool discovery and function execution.

## Building the Assistant

Here is the complete Python script to initialize the MCP client, connect to a server, and run a query through Groq:

```python
import os
from langchain_groq import ChatGroq
from mcp_use import MCPAgent

llm = ChatGroq(
    model_name="llama-3.3-70b-versatile",
    groq_api_key=os.environ.get("GROQ_API_KEY")
)

agent = MCPAgent(
    llm=llm,
    mcp_servers={
        "fetch": {
            "command": "uvx",
            "args": ["mcp-server-fetch"]
        }
    }
)

def main():
    query = "Fetch the text from https://example.com and summarize what it says."
    print(f"User Query: {query}\n")

    response = agent.run(query)
    print("Assistant Response:")
    print(response)

if __name__ == "__main__":
    main()
```

## What Happens Under the Hood

When you run this script:

1. The `MCPAgent` process launches the specified MCP server as a subprocess using standard input and output.
2. The agent queries the server to list all available tools and their parameter schemas.
3. When the user asks a question, the agent sends the prompt and tool definitions to Groq.
4. If the Groq model determines that it needs external data, it returns a tool call request.
5. The MCP client executes the request on the server, takes the output, and returns it to the model to produce the final answer.

This modular structure allows you to swap out tools or add new MCP servers without changing the model connection logic.
