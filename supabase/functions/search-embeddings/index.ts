import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// Generate embedding for search query using OpenAI API
async function generateQueryEmbedding(query: string): Promise<number[]> {
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
      input: query,
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

    const { query, matchThreshold = 0.7, matchCount = 10 } = await req.json();
    if (!query) throw new Error("Query is required");

    console.log(`Searching embeddings for query: "${query}" in organization ${profile.organization_id}`);

    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query);

    // Search for similar embeddings using the database function
    const { data: searchResults, error: searchError } = await supabaseClient
      .rpc("search_document_embeddings", {
        query_embedding: JSON.stringify(queryEmbedding),
        p_organization_id: profile.organization_id,
        match_threshold: matchThreshold,
        match_count: matchCount,
      });

    if (searchError) {
      console.error("Search error:", searchError);
      throw new Error(`Search failed: ${searchError.message}`);
    }

    // Group results by file for better context
    const groupedResults: { [key: string]: any[] } = {};
    
    for (const result of searchResults || []) {
      const fileKey = result.file_id;
      if (!groupedResults[fileKey]) {
        groupedResults[fileKey] = [];
      }
      groupedResults[fileKey].push({
        chunk_text: result.chunk_text,
        chunk_index: result.chunk_index,
        similarity: result.similarity,
        file_name: result.file_name,
        folder_name: result.folder_name,
      });
    }

    // Sort chunks within each file by chunk_index
    for (const fileKey in groupedResults) {
      groupedResults[fileKey].sort((a, b) => a.chunk_index - b.chunk_index);
    }

    // Format the response with context
    const formattedResults = Object.entries(groupedResults).map(([fileId, chunks]) => {
      const firstChunk = chunks[0];
      return {
        file_id: fileId,
        file_name: firstChunk.file_name,
        folder_name: firstChunk.folder_name,
        chunks: chunks,
        max_similarity: Math.max(...chunks.map(c => c.similarity)),
      };
    });

    // Sort by max similarity
    formattedResults.sort((a, b) => b.max_similarity - a.max_similarity);

    console.log(`Found ${searchResults?.length || 0} matching chunks across ${formattedResults.length} documents`);

    return new Response(
      JSON.stringify({ 
        success: true,
        query: query,
        results: formattedResults,
        total_chunks: searchResults?.length || 0,
        total_documents: formattedResults.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("Error searching embeddings:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});