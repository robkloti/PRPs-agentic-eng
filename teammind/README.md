# Enterprise AI Chat System - TeamMind

A production-ready RAG (Retrieval Augmented Generation) system built from 1200+ hours of development, designed for enterprise environments with sophisticated document retrieval and AI-powered chat capabilities.

## 🚀 Key Features

### **Smart Document Ingestion**

- **Multi-source support**: SharePoint, Notion, Confluence, Jira, Google Drive via OAuth
- **Universal conversion**: PDF, Office files → GFM Markdown via Gemini 2.5 Flash & Gotenberg
- **Context-preserving chunking**: Hierarchical breadcrumbs maintain document structure
- **Late chunking**: Advanced embedding technique that preserves inter-chunk relationships

### **Intelligent Retrieval**

- **Hierarchical search**: Two-stage document filtering → chunk-level scoring
- **HyDE (Hypothetical Document Embeddings)**: Generates hypothetical answers for better query matching
- **Self-reflective RAG**: Automatically identifies and fills information gaps with follow-up searches
- **Hybrid scoring**: Combines semantic embeddings (70%) with keyword search (30%), adaptively weighted

### **Enterprise-Ready Architecture**

- **Permission-aware**: Role-based access control at database level
- **PostgreSQL + pgvector**: Scalable vector search with HNSW indexes
- **Performance optimized**: <2s response time for millions of documents
- **Temporal filtering**: Smart date range extraction and filtering

## 🛠 Tech Stack

- **Database**: PostgreSQL with pgvector extension
- **Embeddings**: Configurable models (optimized for late chunking)
- **LLM**: Multi-provider support (OpenAI, Google, Anthropic)
- **Search**: PGroonga for full-text search + vector similarity
- **File Processing**: Gotenberg, Gemini 2.5 Flash for document conversion

## 📊 Performance

- **Response time**: <2 seconds for enterprise datasets
- **Scale**: Tested with millions of documents
- **Search quality**: Hierarchical + hybrid approach beats basic vector search
- **Cost optimized**: Balanced performance vs infrastructure costs

## 🎯 Philosophy

Built on the **Pareto frontier** - maximizing performance while keeping complexity and costs reasonable. No shiny new techniques that don't work in production; only battle-tested approaches that handle real users asking terrible questions about messy enterprise data.

## 🔧 Quick Start

```bash
# Install dependencies
pnpm install

# Set up Supabase
# Configure environment variables
# Run migrations
# Start the application
```

## 📖 Deep Dive

For comprehensive implementation details, architecture decisions, and lessons learned, read the full blog post: [Building Enterprise AI: Hard-Won Lessons from 1200+ Hours of RAG Development](https://bytevagabond.com/post/how-to-build-enterprise-ai-rag/)

## 🤝 Contributing

This represents real-world, production-tested RAG architecture. Contributions welcome, especially optimizations and enterprise integrations.

---

_"AI Apps Are Really Just RAG" - Focus on getting ingestion and retrieval right, everything else follows._
