# Workspace Tool Integrations

This directory contains integrations with various workspace tools (Confluence, SharePoint, etc.) that enable document loading, processing, and synchronization with our vector store.

## Architecture Overview

Each integration follows a consistent architecture pattern with these core components:

### Core Components

1. **Loader Class**

   - Main entry point for the integration
   - Handles authentication and API communication
   - Orchestrates document loading and processing pipeline
   - Manages batching and pagination of API requests
   - Example: `ConfluenceLoader`, `SharePointLoader`

2. **Content Converter**

   - Converts tool-specific content format to standardized markdown
   - Handles special content elements (mentions, links)
   - Extracts metadata and referenced users
   - Example: `ConfluenceToGFMConverter`

3. **Hierarchy Manager (mostly only for document store loaders)**

   - Manages document hierarchies and relationships
   - Builds path structures for documents
   - Example: `ConfluenceHierarchyManager`

4. **Access Manager**
   - Handles document access permissions
   - Manages user access operations (add/remove)
   - Syncs permissions with vector store

### Data Flow

1. **Configuration**

   ```typescript
   interface IntegrationConfig {
     userId: string;
     credentials: {
       /* tool-specific auth */
     };
     selectedSources: string[];
     supabase: SupabaseClient;
   }
   ```

2. **Document Loading Pipeline**

   - Fetch documents in batches (respect API limits)
   - Process content (convert to markdown)
   - Build hierarchy paths
   - Manage access permissions
   - Store in vector database

3. **Document Structure**
   ```typescript
   interface ProcessedDocument {
     title: string;
     content: string;
     hierarchy_path: string;
     source: string;
     metadata: Record<string, any>;
     // ... other fields
   }
   ```

## Creating a New Integration

1. Create a new directory structure:

   ```
   integration-name/
   ├── integration-loader.ts
   ├── integration-content-to-md.ts
   ├── integration-hierarchy-manager.ts
   ├── integration-updater.ts
   └── index.ts
   ```

2. Create DB Config schema

   See `20241229000001_atlassian_config.sql` file in `apps/web/supabase`

3. Implement core interfaces:

   ```typescript
   interface DocumentProcessor {
     processContent(raw: string): ProcessedContent;
     extractMetadata(raw: string): DocumentMetadata;
   }

   interface HierarchyManager {
     buildHierarchyPaths(entries: PageEntry[]): Promise<Map<string, string>>;
   }

   interface DocumentLoader {
     load(options?: LoadOptions): Promise<void>;
     fetchPages(options?: FetchOptions): Promise<FetchResult>;
   }
   ```

## Best Practices

1. **API Communication**

   - Use typed responses
   - Handle rate limiting and pagination
   - Implement proper error handling with retries
   - Process documents in batches

2. **Content Processing**

   - Convert to standardized markdown
   - Preserve important metadata
   - Handle special content types and user mentions
   - Sanitize content

3. **Example Usage**

   ```typescript
   const loader = new IntegrationLoader({
     userId: 'user-123',
     credentials: {
       /* Integration-specific */
     },
     /* e.g. spaces / pages / boards etc. */
     selectedSources: ['source-1'],
     supabase: supabaseClient,
   });

   await loader.load({
     modifiedSince: new Date('2024-01-01'),
   });
   ```
