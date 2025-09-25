-- Document Embeddings Schema for Rita Recruit AI
-- This script creates the necessary tables and functions for document embeddings with pgvector

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing embeddings table if exists (for clean setup)
DROP TABLE IF EXISTS public.document_embeddings CASCADE;

-- Create document_embeddings table with organization isolation
CREATE TABLE public.document_embeddings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_content_id UUID REFERENCES public.document_content(id) ON DELETE CASCADE NOT NULL,
  file_id UUID REFERENCES public.document_files(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  
  -- Embedding data
  embedding vector(1536) NOT NULL, -- OpenAI text-embedding-ada-002 dimension
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  token_count INTEGER,
  
  -- Metadata
  file_name TEXT,
  folder_name TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for document_embeddings
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_document_embeddings_org ON public.document_embeddings(organization_id);
CREATE INDEX idx_document_embeddings_content ON public.document_embeddings(document_content_id);
CREATE INDEX idx_document_embeddings_file ON public.document_embeddings(file_id);

-- Create vector similarity index (IVFFlat for large datasets)
CREATE INDEX idx_document_embeddings_vector ON public.document_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Function to search similar embeddings with organization isolation
CREATE OR REPLACE FUNCTION public.search_document_embeddings(
  query_embedding vector(1536),
  p_organization_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  file_id UUID,
  file_name TEXT,
  folder_name TEXT,
  chunk_text TEXT,
  chunk_index INTEGER,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    de.id,
    de.file_id,
    de.file_name,
    de.folder_name,
    de.chunk_text,
    de.chunk_index,
    1 - (de.embedding <=> query_embedding) AS similarity
  FROM public.document_embeddings de
  WHERE 
    de.organization_id = p_organization_id
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old embeddings when document is reprocessed
CREATE OR REPLACE FUNCTION public.cleanup_document_embeddings(
  p_document_content_id UUID,
  p_organization_id UUID
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.document_embeddings
  WHERE document_content_id = p_document_content_id
    AND organization_id = p_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_document_embeddings_updated_at
  BEFORE UPDATE ON public.document_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- RLS POLICIES FOR DOCUMENT EMBEDDINGS
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view embeddings in their organization" ON public.document_embeddings;
DROP POLICY IF EXISTS "Service role can manage all embeddings" ON public.document_embeddings;

-- Policy: Users can view embeddings from their organization
CREATE POLICY "Users can view embeddings in their organization" ON public.document_embeddings
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Service role can manage all embeddings (for edge functions)
CREATE POLICY "Service role can manage all embeddings" ON public.document_embeddings
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.document_embeddings TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_document_embeddings TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_document_embeddings TO authenticated;

-- Create function to get embedding statistics
CREATE OR REPLACE FUNCTION public.get_embedding_stats(p_organization_id UUID)
RETURNS TABLE(
  total_embeddings BIGINT,
  total_documents INTEGER,
  avg_chunks_per_document NUMERIC,
  total_tokens BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_embeddings,
    COUNT(DISTINCT file_id)::INTEGER as total_documents,
    ROUND(COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT file_id), 0), 2) as avg_chunks_per_document,
    COALESCE(SUM(token_count), 0)::BIGINT as total_tokens
  FROM public.document_embeddings
  WHERE organization_id = p_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_embedding_stats TO authenticated;