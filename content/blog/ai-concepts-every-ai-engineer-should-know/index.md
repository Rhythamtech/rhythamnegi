---
title: "AI Concepts Every AI Engineer Should Know"
description: "A comprehensive brief on core AI foundations, architectures, prompting techniques, RAG, agents, and production safety."
date: "2026-04-25"
tags:
  - ai
  - engineering
  - rag
  - agents
---

## Foundations
- **Tokens & Tokenization**: Text is split into smaller units called tokens so models can process language efficiently. Tokenization affects cost, speed, and how much text fits in context.
- **Embeddings**: Embeddings turn words, sentences, or documents into vectors that capture meaning. Similar items end up close together in vector space.
- **Vector Similarity**: Vector similarity measures how close two embeddings are, often using cosine similarity or dot product. It powers semantic search and retrieval.
- **Context Window**: The context window is the maximum amount of text a model can consider at once. Longer context allows more input, but increases cost and complexity.
- **Temperature & Sampling**: Temperature controls randomness in model output. Lower values make answers more focused, while higher values increase diversity and creativity.
- **Top-k / Top-p**: Top-k keeps only the k most likely next tokens. Top-p keeps the smallest set of tokens whose total probability reaches a threshold, balancing quality and variety.
- **System / User Roles**: Roles separate instructions by priority. System messages set behavior, while user messages contain the task or question.
- **Inference vs Training**: Training teaches a model by updating weights from data. Inference uses the trained model to produce predictions or text without changing weights.

## Models & Architectures
- **LLMs**: Large Language Models are trained on massive text data to generate and understand language. They are general-purpose and useful across many tasks.
- **SLMs (Small Models)**: Small language models use fewer parameters and run more efficiently. They are useful when cost, latency, or on-device deployment matters.
- **Multimodal Models**: Multimodal models handle more than text, such as images, audio, or video. They can combine signals from different data types in one system.
- **Reasoning Models**: Reasoning models are designed to solve harder problems by following structured steps internally. They are stronger at math, logic, and planning tasks.
- **Diffusion Models**: Diffusion models generate images or other media by gradually removing noise. They are widely used in modern image generation systems.
- **Encoder vs Decoder**: Encoders read input and build internal representations. Decoders generate outputs token by token, and many modern models use one or both.
- **Mixture of Experts**: Mixture of Experts activates only a few specialized model parts for each input. This improves efficiency while keeping high capacity.
- **Foundation Models**: Foundation models are large pretrained models that can be adapted to many downstream tasks. They form the base of modern AI applications.

## Prompting Techniques
- **Zero-shot Prompting**: Zero-shot prompting asks the model to perform a task without examples. It works best when the instruction is clear and the task is familiar.
- **Few-shot Prompting**: Few-shot prompting includes examples in the prompt to teach the model the desired pattern. It often improves consistency and format control.
- **Chain-of-Thought**: Chain-of-thought prompting encourages step-by-step reasoning. It can improve performance on complex tasks that need multiple logical steps.
- **ReAct (Reason + Act)**: ReAct combines reasoning with actions like searching or calling tools. The model alternates between thinking and taking steps toward a goal.
- **Tree of Thoughts**: Tree of Thoughts explores multiple reasoning branches instead of one linear path. It helps when problems need comparison of several possible solutions.
- **Self-Consistency**: Self-consistency samples several reasoning paths and chooses the most common answer. This can improve reliability on reasoning tasks.
- **Role Prompting**: Role prompting asks the model to behave like a specific expert or persona. It can shape tone, depth, and style of response.
- **Prompt Templates**: Prompt templates are reusable prompt structures with placeholders for changing details. They help teams create consistent, scalable prompts.

## RAG & Knowledge
- **Retrieval Pipelines**: Retrieval pipelines find relevant information before the model answers. They improve accuracy by grounding outputs in external knowledge.
- **Vector Databases**: Vector databases store embeddings and support fast similarity search. They are commonly used for semantic retrieval in RAG systems.
- **Chunking Strategies**: Chunking strategies decide how documents are split before indexing. Good chunking preserves meaning and improves retrieval quality.
- **Embedding Models**: Embedding models convert text into vectors that capture semantic meaning. Better embeddings usually lead to better search and retrieval.
- **Hybrid Search**: Hybrid search combines keyword matching and vector search. This helps catch both exact terms and conceptual matches.
- **Reranking**: Reranking reorders retrieved results using a stronger model. It often improves the relevance of the final context sent to the LLM.
- **Knowledge Graphs**: Knowledge graphs represent entities and relationships in structured form. They help systems reason over connected facts more explicitly.
- **Context Injection**: Context injection adds retrieved facts or instructions into the model prompt. It gives the model the external information needed to answer well.

## Agents & Tool Use
- **AI Agents**: AI agents are systems that can plan, decide, and act toward a goal. They often use models plus tools, memory, and feedback loops.
- **Tool / Function Calling**: Tool calling lets a model invoke external functions or APIs. It extends the model beyond text generation into real actions.
- **MCP (Model Context)**: MCP is a standard for connecting models to tools and context sources. It helps applications integrate external capabilities in a consistent way.
- **Multi-Agent Systems**: Multi-agent systems use several specialized agents working together. Each agent may focus on research, planning, execution, or review.
- **Agent Memory**: Agent memory stores useful past information for later use. It helps agents stay consistent across long tasks and repeated interactions.
- **Planning & Reasoning**: Planning and reasoning help an agent break a goal into smaller steps. They improve execution on tasks that need structure and sequencing.
- **Agent Loops**: Agent loops repeat the cycle of think, act, observe, and adjust. This allows the agent to improve results over multiple iterations.
- **Handoffs & Delegation**: Handoffs transfer a task from one agent or module to another. Delegation improves specialization and keeps workflows organized.

## Training & Fine-tuning
- **Pre-training**: Pre-training teaches a model general language and pattern recognition on large datasets. It is the expensive first stage of building a foundation model.
- **Fine-tuning**: Fine-tuning adapts a pretrained model to a specific domain or task. It usually needs less data and compute than training from scratch.
- **LoRA / QLoRA**: LoRA and QLoRA fine-tune large models efficiently by updating only small low-rank adapters. QLoRA adds quantization to reduce memory use further.
- **RLHF**: RLHF aligns model behavior using human preference feedback. It often makes responses more helpful, safe, and conversational.
- **DPO**: DPO trains models to prefer better outputs directly from preference data. It is simpler than RLHF and often easier to run.
- **Instruction Tuning**: Instruction tuning trains models on instruction-following examples. It improves the model’s ability to understand tasks and respond appropriately.
- **Distillation**: Distillation transfers knowledge from a larger teacher model to a smaller student model. The result is often cheaper and faster to run.
- **Quantization**: Quantization reduces numerical precision to shrink model size and speed up inference. It is a common way to deploy models more efficiently.

## Production, Safety & Evals
- **Prompt Caching**: Prompt caching stores repeated prompt parts so they do not need to be recomputed. It reduces latency and cost for repeated or shared context.
- **KV Cache**: KV cache stores attention keys and values during generation. It makes long outputs faster because earlier computations can be reused.
- **Streaming**: Streaming sends model output token by token instead of waiting for the full answer. It improves perceived speed and user experience.
- **Cost & Latency**: Cost and latency are key production trade-offs. Engineers optimize both by choosing smaller models, caching, batching, and efficient retrieval.
- **Observability**: Observability tracks model inputs, outputs, errors, and user behavior in production. It helps teams diagnose issues and improve quality over time.
- **Guardrails**: Guardrails are safety rules that limit harmful, invalid, or risky model behavior. They can filter outputs, enforce schemas, or block unsafe actions.
- **Prompt Injection**: Prompt injection is an attack where malicious text tries to override system instructions. Defenses include isolation, filtering, and strict tool permissions.
- **Evals & Benchmarks**: Evals and benchmarks measure model quality against tasks, datasets, or business goals. They are essential for comparing models and tracking regressions.
