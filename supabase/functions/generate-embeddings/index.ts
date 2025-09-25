import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// Estimate token count (rough approximation)
function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

// Split text into chunks
function splitIntoChunks(text: string, maxTokens: number = 1500): string[] {
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let currentChunk = "";
  let currentTokens = 0;
  
  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);
    
    if (currentTokens + sentenceTokens > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
      currentTokens = sentenceTokens;
    } else {
      currentChunk += " " + sentence;
      currentTokens += sentenceTokens;
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// Generate embeddings using OpenAI API
async function generateEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-ada-002",
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Get user's organization
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      throw new Error("User organization not found");
    }

    const { documentContentId } = await req.json();
    if (!documentContentId) throw new Error("Document content ID is required");

    // Get document content
    const { data: documentContent, error: contentError } = await supabaseClient
      .from("document_content")
      .select(`
        *,
        document_files!inner(
          id,
          file_name,
          document_folders!inner(
            name,
            organization_id
          )
        )
      `)
      .eq("id", documentContentId)
      .single();

    if (contentError) throw new Error(`Document content not found: ${contentError.message}`);

    // Verify organization access
    if (documentContent.document_files.document_folders.organization_id !== profile.organization_id) {
      throw new Error("Access denied: Document belongs to different organization");
    }

    // Clean up any existing embeddings for this document
    const { error: deleteError } = await supabaseClient
      .from("document_embeddings")
      .delete()
      .eq("document_content_id", documentContentId)
      .eq("organization_id", profile.organization_id);

    if (deleteError) console.error("Error cleaning up old embeddings:", deleteError);

    // Split content into chunks
    const chunks = splitIntoChunks(documentContent.content_text);
    console.log(`Processing ${chunks.length} chunks for document ${documentContentId}`);

    // Process each chunk and generate embeddings
    const embeddingPromises = chunks.map(async (chunk, index) => {
      try {
        const embedding = await generateEmbedding(chunk);
        
        // Store embedding in database
        const { error: insertError } = await supabaseClient
          .from("document_embeddings")
          .insert({
            document_content_id: documentContentId,
            file_id: documentContent.document_files.id,
            organization_id: profile.organization_id,
            embedding: JSON.stringify(embedding),
            chunk_text: chunk,
            chunk_index: index,
            token_count: estimateTokens(chunk),
            file_name: documentContent.document_files.file_name,
            folder_name: documentContent.document_files.document_folders.name,
          });

        if (insertError) {
          console.error(`Error inserting embedding for chunk ${index}:`, insertError);
          throw insertError;
        }

        return { success: true, chunkIndex: index };
      } catch (error) {
        console.error(`Error processing chunk ${index}:`, error);
        return { success: false, chunkIndex: index, error: error.message };
      }
    });

    const results = await Promise.all(embeddingPromises);
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`Embeddings generation complete: ${successCount} successful, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Generated embeddings for ${successCount} chunks`,
        stats: {
          total_chunks: chunks.length,
          successful: successCount,
          failed: failedCount,
          document_content_id: documentContentId,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("Error generating embeddings:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});