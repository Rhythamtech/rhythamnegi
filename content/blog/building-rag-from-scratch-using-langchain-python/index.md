---
title: "Building RAG from Scratch: A Practical Guide to Retrieval-Augmented Generation"
description: "How to combine LLMs with your own data—and actually make them useful in the real world."
date: "2026-04-26"
tags:
  - rag
  - langchain
  - python
  - ai
---

## The Problem with LLMs (and Why RAG Exists)

Large Language Models are incredibly powerful—but they have a blind spot.

They’re trained mostly on **public data**, while the most valuable data in the world is **private**: company documents, internal knowledge bases, research notes, customer data, and more.

That’s where **Retrieval-Augmented Generation (RAG)** comes in.

RAG allows you to:

* Inject private or external data into LLMs
* Ground responses in real, relevant information
* Reduce hallucinations
* Build domain-specific AI systems

At its core, RAG is simple:

> **Index → Retrieve → Generate**

But as you’ll see, the real power comes from how you *optimize each step*.



## The Core RAG Pipeline

Let’s start with the foundation.

### 1. Indexing — Making Data Searchable

Before you can retrieve anything, you need to prepare your data.

This involves:

* Loading documents
* Splitting them into chunks
* Converting them into embeddings (vectors)
* Storing them in a vector database

**Why we choose chunking instead of storing the whole document?**

Storing entire documents in a vector database is generally inefficient and impractical for several reasons. Firstly, large documents consume significantly more memory and computational resources to process and store compared to smaller chunks, leading to higher operational costs and slower query times. Secondly, most embedding models have a limited input size (context window), meaning they cannot process entire long documents at once, forcing the data to be truncated or split anyway. Thirdly, splitting documents into smaller, semantically meaningful chunks allows for more precise and relevant retrieval, as it increases the probability of matching specific user queries to the most pertinent sections rather than returning entire documents that may contain only a small relevant portion. Finally, chunking enables more flexible data management, allowing individual sections to be updated or re-indexed independently without reprocessing the entire document. Therefore, chunking is essential for maintaining efficiency, ensuring model compatibility, and optimizing retrieval accuracy in RAG systems.

**Why we choose vector database instead of Traditional SQL or NoSQL Databases?**

A vector database is chosen over a traditional database in RAG systems because it is designed to understand and search based on **semantic meaning rather than exact matches**. In a normal database (like SQL), queries rely on precise keywords or structured filters, which means you must know exactly what to search for. However, human language is often vague, varied, and context-dependent. Vector databases solve this by converting text into numerical embeddings that capture meaning, allowing the system to perform **similarity search**—finding content that is conceptually related even if it doesn’t share the same words. This is especially important for applications like question answering, where a user’s query may be phrased very differently from the stored documents. Additionally, vector databases are optimized for fast nearest-neighbor search in high-dimensional space, making them far more efficient for large-scale semantic retrieval than traditional databases. In short, while normal databases are excellent for structured, exact queries, vector databases are essential when you need **intelligent, meaning-based retrieval**, which is the foundation of modern AI systems like RAG.

### Example: Indexing Documents

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma

docs = [
    "RAG combines retrieval with generation.",
    "Embeddings convert text into vectors.",
    "Chunking helps long documents fit into model context."
]

splitter = RecursiveCharacterTextSplitter(chunk_size=200, chunk_overlap=40)
chunks = splitter.create_documents(docs)

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = Chroma.from_documents(chunks, embeddings)
```

💡 **Key Idea:**
Text is transformed into vectors so we can compare meaning—not just keywords.



### 2. Retrieval — Finding Relevant Information

Now that your data is indexed, you can search it.

When a user asks a question:

* The question is embedded into a vector
* The system finds similar vectors (documents)
* The closest matches are returned

### Example: Retrieval

```python
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

question = "What is RAG?"
relevant_docs = retriever.invoke(question)

for doc in relevant_docs:
    print(doc.page_content)
```

💡 **Key Idea:**
Similarity search happens in **embedding space**, not keyword matching.



### 3. Generation — Producing the Answer

Finally, we pass the retrieved documents into the LLM along with the question.

This ensures:

* Answers are grounded in real data
* The model doesn’t rely purely on memory

### Example: Generation

```python
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

prompt = PromptTemplate.from_template("""
Answer the question using only the context below.

Context:
{context}

Question:
{question}
""")

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

context = "\n\n".join(doc.page_content for doc in relevant_docs)
formatted_prompt = prompt.format(context=context, question=question)

response = llm.invoke(formatted_prompt)
print(response.content)
```

💡 **Key Idea:**
The LLM becomes a **reasoning engine over retrieved knowledge**, not just a generator.


## Where Basic RAG Falls Short

A simple RAG pipeline works—but not always well.

Problems you’ll encounter:

* Poorly written user queries
* Missing relevant documents
* Too much irrelevant context
* Weak reasoning across multiple documents

That’s why advanced RAG techniques exist.


## Advanced RAG Techniques (That Actually Matter)

### 1. Multi-Query Retrieval

Instead of relying on one query, generate multiple variations.

Why?
Because phrasing matters—and one version might retrieve better results.

### Example

```python
def rewrite_question(question: str):
    return [
        f"Explain {question} in simple terms",
        f"What are the key ideas behind {question}?",
        f"How does {question} work in practice?"
    ]

queries = rewrite_question("task decomposition")
all_docs = []

for q in queries:
    all_docs.extend(retriever.invoke(q))

# Deduplicate documents before generation
unique_docs = {doc.page_content: doc for doc in all_docs}.values()
```

👉 Run retrieval on each query and merge results.


### 2. RAG Fusion (Smarter Ranking)
RAG Fusion is similar to multi-query, but it adds a ranking step. Multi-query gives you multiple result sets. RAG Fusion combines them using ranking techniques.

### Example

```python
from collections import defaultdict

def reciprocal_rank_fusion(result_lists, k=60):
    scores = defaultdict(float)

    for docs in result_lists:
        for rank, doc in enumerate(docs, start=1):
            scores[doc.page_content] += 1.0 / (k + rank)

    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [content for content, score in ranked]
```

👉 This improves relevance by combining multiple perspectives.



### 3. Query Decomposition

Some questions are actually multiple questions.
Break them down - breaking one hard question into smaller subquestions, then solving them one by one. It also highlights a variant where answers to earlier subquestions are used to help answer later ones.

### Example

```python
def decompose(question: str):
    return [
        "What is the first concept needed to answer this?",
        "What are the main components involved?",
        "How do those components interact?"
    ]

sub_questions = decompose("What are the main components of an LLM-powered autonomous agent system?")
```

👉 Especially powerful for complex reasoning tasks.



### 4. Step-Back Prompting

Instead of going more specific, go more abstract.

Ask:

> “What broader concept explains this?”

### Example

```python
def step_back(question: str):
    return f"What broader concept or principle underlies: {question}?"

original = "What is task decomposition for LLM agents?"
abstract = step_back(original)
```

👉 Helps retrieve conceptual knowledge, not just surface-level answers.



### 5. HyDE (Hypothetical Document Embeddings)

HyDE stands for Hypothetical Document Embeddings. The trick is: instead of embedding the raw user question, generate a hypothetical document that answers the question, then embed that document and retrieve using it.

Why it works:
* Documents retrieve better than questions
* You align the query with document-style embeddings

### Example

```python
hyde_prompt = PromptTemplate.from_template("""
Write a short document that answers this question:
{question}
""")

hypothetical_doc = llm.invoke(hyde_prompt.format(question=question)).content
hyde_docs = retriever.invoke(hypothetical_doc)
```



### 6. Routing — Send Questions to the Right Place

Routing is about sending a question to the right destination. There are two types of routing:

* Logical routing: where an LLM chooses among data sources
* Semantic routing: where embeddings choose the best prompt or route based on similarity.

Some common examples:
* SQL databases
* Vector stores
* APIs

Routing ensures the question goes to the right system.

### Example

```python
def route_question(question: str):
    if "python" in question.lower():
        return "python_docs"
    if "sql" in question.lower():
        return "sql_docs"
    return "general_docs"
```



### 7. Query Construction

Sometimes you don’t just search—you **translate queries into structured filters**.

Example:

> “Videos about RAG after 2024”

Becomes:

```python
def build_filter(question: str):
    return {
        "topic": "RAG",
        "published_after": "2024-01-01"
    }
```
This is useful when you need to combine semantic search with structured constraints like date, author, tag, or source.


## Putting It All Together

Simple RAG :
```python
from langchain.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.document_loaders import PyPDFLoader
from langchain.embeddings import OpenAIEmbeddings
from langchain.chat_models import ChatOpenAI
from langchain.chains import RetrievalQA

# Load documents
loader = PyPDFLoader("report.pdf")
docs = loader.load()

# Split into chunks
splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
splits = splitter.split_documents(docs)

# Embed and store
vectorstore = Chroma.from_documents(
    documents=splits,
    embedding=OpenAIEmbeddings(),
    persist_directory="./.chroma_db"
)

# Create RAG chain
qa_chain = RetrievalQA.from_chain_type(
    llm=ChatOpenAI(model="gpt-4o-mini"),
    chain_type="stuff",
    retriever=vectorstore.as_retriever()
)

# Ask questions
response = qa_chain.run("What is RAG?")
print(response)
```

Here’s a simplified advanced pipeline:

```python
def advanced_rag_answer(question: str):
    rewritten_queries = rewrite_question(question)
    candidate_docs = []

    for q in rewritten_queries:
        candidate_docs.append(retriever.invoke(q))

    ranked = reciprocal_rank_fusion(candidate_docs)
    context = "\n\n".join(ranked[:5])

    prompt = f"""
    Use the context below to answer the question carefully.

    Context:
    {context}

    Question:
    {question}
    """

    return llm.invoke(prompt).content
```



## Final Thoughts

RAG isn’t just a feature—it’s becoming the **default architecture for AI systems**.

The key insight:

> LLMs are powerful, but **retrieval makes them useful**.

If you remember one thing, let it be this:

* **Index well**
* **Retrieve smartly**
* **Generate carefully**

Everything else is optimization.



## Where to Go Next

Once you’ve built a basic RAG system, explore:

* Better chunking strategies
* Hybrid search (keyword + vector)
* Re-ranking models
* Evaluation frameworks
* Feedback loops (self-correcting RAG)



If you’re building AI products, RAG is not optional—it’s foundational.

And the sooner you master it, the faster you can build systems that actually work.



*Want a follow-up post on production RAG systems, scaling, or evaluation? Let me know.*
