--- 
title: "All You Need to Know About Model Context Protocol (MCP)"
description: "An introduction to the Model Context Protocol, its architecture, core primitives, and why it matters for modular AI agents."
pubDate: "2026-09-01"
tags:
  - mcp
  - ai
  - agents
coverImage: "../../../assets/thumbnails/all-you-need-to-know-about-model-context-protocol.svg"
---

Large language models like Claude, GPT-4, and open source LLMs have changed how we write code, analyze data, and search for information. However, they come with a serious drawback: they live in isolation. When you interact with a standard language model, it only knows what was present in its training dataset or what you copy and paste into the conversation. It cannot independently read your local hard drive, query your company SQL database, or check your task manager.

To solve this, developers used to write custom integration code for every single data source and every individual AI model. If you wanted an AI to search Google Drive, you wrote a custom script. If you later wanted it to query GitHub issues or a Postgres database, you wrote completely separate integration logic. When a new AI model arrived, you often had to rework everything. This pattern created messy code, duplicated effort, and high maintenance costs.

The Model Context Protocol (MCP) was introduced to solve this exact problem.

## What is MCP?

Think of MCP as the USB-C standard for artificial intelligence. Before USB-C became common, every electronic gadget had its own charging port and cable. Digital cameras used mini-USB, phones used micro-USB, and laptops used proprietary barrel plugs. USB-C unified everything under one simple standard.

MCP does the same thing for AI tools and data sources. Instead of writing custom connectors between every client and every tool, MCP provides a standard open specification.

The architecture consists of three core components:

1. **MCP Host or Client:** This is the application that drives the user experience. It could be Claude Desktop, a terminal agent, or a custom Python script built with frameworks like LangChain or LangGraph.
2. **MCP Server:** This is a lightweight program designed to expose specific capabilities or data sources. A server can connect to local files, external APIs, databases, or terminal commands.
3. **The Protocol:** The standardized communication layer, typically running over standard input and output or Server-Sent Events, allows any client to talk to any server seamlessly.

## Three Core Primitives of MCP

An MCP server can expose three primary capabilities to an AI client:

1. **Tools:** These are executable functions that an LLM can invoke to perform real-world actions, such as running a calculation, executing a query, or making an API call.
2. **Resources:** Read-only data sources that provide context to the model, such as log files, code files, or database records.
3. **Prompts:** Pre-defined prompt templates that help users and models perform specific, repeatable tasks effectively.

## Why is MCP Important?

First, MCP eliminates vendor lock-in. Because the protocol is open source and universal, a tool written for Claude Desktop can immediately be used by an agent built with LangChain, LangGraph, or any other framework.

Second, it enhances local privacy and security. MCP servers can run entirely on your local machine. You choose which directories or credentials to expose. The AI assistant asks permission before calling a tool, ensuring that sensitive data is not leaked without your consent.

Finally, MCP makes AI agent development modular. Rather than maintaining massive monolithic applications, teams can maintain small, focused MCP servers that any AI application inside the company can plug into.
