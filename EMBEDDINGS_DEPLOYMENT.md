# OpenAI Embeddings System Deployment Guide

## Overview
This guide covers the deployment of the OpenAI embeddings system for organization-specific document search in the AskRita application.

## Architecture Components

### 1. Database Schema
- **document_embeddings table**: Stores vector embeddings for document chunks
- **pgvector extension**: Enables vector similarity search
- **Organization isolation**: All queries are filtered by organization_id

### 2. Edge Functions
- **generate-embeddings**: Creates embeddings for document content
- **search-embeddings**: Performs semantic search across documents
- **rita-chat**: Integrates document search with chat responses
- **extract-document-text**: Updated to trigger embedding generation

### 3. Frontend Updates
- **Chat.tsx**: Enhanced with search status indicators and source citations

## Deployment Steps

### Step 1: Enable pgvector Extension
Run the database setup script to create the embeddings table and enable pgvector:

```bash
# Apply the embeddings schema to your Supabase database
supabase db push database-embeddings.sql
```

### Step 2: Set Environment Variables
Ensure the following environment variables are set:

```bash
# In your Supabase dashboard or .env file
OPENAI_API_KEY=your_openai_api_key
VITE_OPENAI_API_KEY=your_openai_api_key  # For frontend (if needed)
```

### Step 3: Deploy Edge Functions
Deploy the edge functions to Supabase:

```bash
# Deploy individual functions
supabase functions deploy generate-embeddings
supabase functions deploy search-embeddings
supabase functions deploy rita-chat

# Or deploy all functions at once
supabase functions deploy
```

### Step 4: Verify Database Schema
Confirm the document_embeddings table was created:

```sql
-- Check if pgvector extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Verify document_embeddings table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'document_embeddings';

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename = 'document_embeddings';
```

### Step 5: Test Document Processing
1. Upload a test document through the Documents interface
2. Check the document_files table for processing status
3. Verify embeddings are generated in document_embeddings table

```sql
-- Check if embeddings were generated
SELECT 
  de.id,
  de.file_name,
  de.chunk_index,
  LENGTH(de.chunk_text) as text_length,
  de.created_at
FROM document_embeddings de
WHERE de.organization_id = 'your-org-id'
ORDER BY de.created_at DESC
LIMIT 10;
```

### Step 6: Test Chat Integration
1. Navigate to the Chat interface
2. Ask a question about uploaded documents
3. Verify:
   - "Searching documents..." status appears
   - Response includes document context
   - Sources are cited when available

## Security Considerations

### Organization Isolation
- All queries filter by organization_id
- RLS policies enforce organization boundaries
- Edge functions validate user's organization membership

### API Key Security
- OpenAI API key stored as environment variable
- Never exposed to frontend
- All API calls made through edge functions

## Performance Optimizations

### Indexing
The system includes several indexes for optimal performance:
- IVFFlat index on embedding vectors for fast similarity search
- B-tree indexes on organization_id and file_id for filtering

### Chunk Size
Documents are split into chunks of ~1500 tokens to:
- Stay within OpenAI's token limits
- Provide meaningful context segments
- Optimize search relevance

### Caching
- Embeddings are generated once and stored
- No regeneration unless document is updated
- Search results cached in frontend query cache

## Monitoring and Debugging

### Check Embedding Generation
```sql
-- Get embedding statistics by organization
SELECT * FROM get_embedding_stats('your-org-id');
```

### Monitor Edge Function Logs
```bash
# View logs for specific function
supabase functions logs generate-embeddings
supabase functions logs search-embeddings
supabase functions logs rita-chat
```

### Debug Search Results
```sql
-- Test search function directly
SELECT * FROM search_document_embeddings(
  '[your-query-embedding-vector]'::vector(1536),
  'your-org-id'::uuid,
  0.7, -- similarity threshold
  10   -- max results
);
```

## Troubleshooting

### No Search Results
1. Verify documents have been processed
2. Check if embeddings exist for the organization
3. Lower the similarity threshold in search

### Slow Search Performance
1. Ensure IVFFlat index is created
2. Check number of embeddings per organization
3. Consider adjusting chunk size

### Missing Citations
1. Verify search-embeddings returns results
2. Check rita-chat function logs
3. Ensure document_embeddings table has proper data

## Cost Considerations

### OpenAI API Usage
- Embeddings: ~$0.0001 per 1K tokens
- Chat completions: Varies by model
- Monitor usage in OpenAI dashboard

### Optimization Tips
1. Process documents in batches
2. Cache embeddings to avoid regeneration
3. Limit search results to relevant chunks
4. Use appropriate chunk sizes

## Maintenance

### Regular Tasks
1. Monitor embedding generation success rate
2. Clean up orphaned embeddings
3. Review search relevance metrics
4. Update similarity thresholds as needed

### Scaling Considerations
As the document corpus grows:
1. Consider partitioning by organization
2. Implement embedding versioning
3. Add more sophisticated chunking strategies
4. Consider using more advanced models

## Support
For issues or questions:
1. Check edge function logs
2. Verify database permissions
3. Test with small document sets first
4. Monitor OpenAI API quotas