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

// Search for relevant documents
async function searchDocuments(
  supabaseClient: any,
  query: string,
  organizationId: string
): Promise<any[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query);

    // Search for similar embeddings
    const { data: searchResults, error: searchError } = await supabaseClient
      .rpc("search_document_embeddings", {
        query_embedding: JSON.stringify(queryEmbedding),
        p_organization_id: organizationId,
        match_threshold: 0.75,
        match_count: 5, // Get top 5 most relevant chunks
      });

    if (searchError) {
      console.error("Search error:", searchError);
      return [];
    }

    return searchResults || [];
  } catch (error) {
    console.error("Error searching documents:", error);
    return [];
  }
}

// Format document context for the prompt
function formatDocumentContext(documents: any[]): string {
  if (!documents || documents.length === 0) {
    return "";
  }

  const groupedByFile: { [key: string]: any[] } = {};
  
  // Group chunks by file
  documents.forEach(doc => {
    const fileKey = doc.file_name || "Unknown";
    if (!groupedByFile[fileKey]) {
      groupedByFile[fileKey] = [];
    }
    groupedByFile[fileKey].push(doc);
  });

  // Format the context
  let context = "Based on the following relevant document excerpts from your organization:\n\n";
  
  Object.entries(groupedByFile).forEach(([fileName, chunks]) => {
    context += `**From "${fileName}":**\n`;
    chunks.sort((a, b) => a.chunk_index - b.chunk_index);
    chunks.forEach(chunk => {
      context += `${chunk.chunk_text}\n\n`;
    });
  });

  return context;
}

// Generate response using OpenAI Chat API
async function generateChatResponse(
  message: string,
  documentContext: string
): Promise<{ response: string; sources: string[] }> {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  let systemPrompt = `You are Rita, an AI recruiting assistant specialized in the transportation industry. 
You help with questions about carrier information, driver qualifications, job descriptions, and recruiting materials.`;

  if (documentContext) {
    systemPrompt += `\n\nUse the following document context to answer the user's question. When referencing information from documents, mention the source document name.`;
  } else {
    systemPrompt += `\n\nNo relevant documents were found for this query. Provide a general response based on your knowledge, but mention that no specific organizational documents were found.`;
  }

  const messages = [
    { role: "system", content: systemPrompt },
  ];

  if (documentContext) {
    messages.push({ role: "assistant", content: documentContext });
  }

  messages.push({ role: "user", content: message });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4-turbo-preview",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  const responseText = data.choices[0].message.content;

  // Extract source documents from the context
  const sources = documentContext 
    ? [...new Set(documentContext.match(/From "([^"]+)":/g)?.map(s => s.replace(/From "|":/g, "")) || [])]
    : [];

  return {
    response: responseText,
    sources: sources,
  };
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

    const { message } = await req.json();
    if (!message) throw new Error("Message is required");

    console.log(`Processing chat request for organization ${profile.organization_id}: "${message}"`);

    // Search for relevant documents
    const searchResults = await searchDocuments(supabaseClient, message, profile.organization_id);
    
    console.log(`Found ${searchResults.length} relevant document chunks`);

    // Format document context
    const documentContext = formatDocumentContext(searchResults);

    // Generate response with context
    const { response, sources } = await generateChatResponse(message, documentContext);

    // Track the query in the database
    const { error: queryError } = await supabaseClient
      .from("queries")
      .insert({
        user_id: user.id,
        organization_id: profile.organization_id,
        query_text: message,
        response_text: response,
        tokens_used: Math.ceil((message.length + response.length) / 4), // Rough estimate
      });

    if (queryError) {
      console.error("Error tracking query:", queryError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        response: response,
        sources: sources,
        documentsSearched: searchResults.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("Error in rita-chat:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        response: "I apologize, but I'm having trouble responding right now. Please try again.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});