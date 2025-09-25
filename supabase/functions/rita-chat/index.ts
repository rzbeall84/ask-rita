import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// Plan limits - must match SubscriptionContext.tsx
const PLAN_LIMITS = {
  starter: 1500,
  pro: 5000,
  enterprise: 15000,
  free: 100,
};

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

// Check and enforce query limits
async function checkQueryLimits(
  supabaseClient: any,
  organizationId: string
): Promise<{ allowed: boolean; usage: any; planLimit: number; message?: string }> {
  try {
    // Get current month
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
    
    // Get organization's subscription and plan limit
    const { data: subscription, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("plan_type, query_limit")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .single();
    
    if (subError) {
      console.log("No active subscription found, using free tier limits");
    }
    
    const planType = subscription?.plan_type || 'free';
    const planLimit = PLAN_LIMITS[planType as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;
    
    // Get or create current month usage
    const { data: usage, error: usageError } = await supabaseClient
      .from("query_usage")
      .select("*")
      .eq("org_id", organizationId)
      .eq("month", currentMonth)
      .single();
    
    let currentUsage = usage;
    if (usageError || !usage) {
      // Create new usage record for this month
      const { data: newUsage, error: createError } = await supabaseClient
        .from("query_usage")
        .insert({
          org_id: organizationId,
          month: currentMonth,
          queries_used: 0,
          extra_queries_purchased: 0
        })
        .select()
        .single();
      
      if (createError) {
        console.error("Error creating usage record:", createError);
        return { allowed: true, usage: null, planLimit }; // Allow on error
      }
      currentUsage = newUsage;
    }
    
    const totalAllowed = planLimit + (currentUsage.extra_queries_purchased || 0);
    const currentQueriesUsed = currentUsage.queries_used || 0;
    
    if (currentQueriesUsed >= totalAllowed) {
      return {
        allowed: false,
        usage: currentUsage,
        planLimit,
        message: `You've reached your monthly query limit of ${totalAllowed}. Please upgrade your plan or purchase additional queries in the Billing section.`
      };
    }
    
    return {
      allowed: true,
      usage: currentUsage,
      planLimit
    };
    
  } catch (error) {
    console.error("Error checking query limits:", error);
    return { allowed: true, usage: null, planLimit: 100 }; // Allow on error to prevent blocking
  }
}

// Increment query usage and check for notifications
async function incrementQueryUsage(
  supabaseClient: any,
  organizationId: string,
  usage: any,
  planLimit: number
): Promise<void> {
  try {
    const newUsageCount = (usage.queries_used || 0) + 1;
    const totalAllowed = planLimit + (usage.extra_queries_purchased || 0);
    const usagePercentage = (newUsageCount / totalAllowed) * 100;
    
    // Update usage count
    await supabaseClient
      .from("query_usage")
      .update({
        queries_used: newUsageCount,
        updated_at: new Date().toISOString()
      })
      .eq("id", usage.id);
    
    // Check for notification thresholds
    const now = new Date().toISOString();
    let shouldNotify80 = false;
    let shouldNotify100 = false;
    
    if (usagePercentage >= 80 && usagePercentage < 100 && !usage.last_notification_80) {
      shouldNotify80 = true;
      await supabaseClient
        .from("query_usage")
        .update({ last_notification_80: now })
        .eq("id", usage.id);
    }
    
    if (usagePercentage >= 100 && !usage.last_notification_100) {
      shouldNotify100 = true;
      await supabaseClient
        .from("query_usage")
        .update({ last_notification_100: now })
        .eq("id", usage.id);
    }
    
    // Send notifications if needed
    if (shouldNotify80 || shouldNotify100) {
      const threshold = shouldNotify100 ? 100 : 80;
      await sendUsageNotification(supabaseClient, organizationId, {
        threshold,
        current: newUsageCount,
        total: totalAllowed,
        percentage: usagePercentage
      });
    }
    
  } catch (error) {
    console.error("Error incrementing query usage:", error);
  }
}

// Send usage notification email
async function sendUsageNotification(
  supabaseClient: any,
  organizationId: string,
  usage: { threshold: number; current: number; total: number; percentage: number }
): Promise<void> {
  try {
    // Get organization admin email
    const { data: org, error: orgError } = await supabaseClient
      .from("organizations")
      .select(`
        name,
        profiles!inner(
          user_id,
          role
        )
      `)
      .eq("id", organizationId)
      .eq("profiles.role", "admin")
      .single();
    
    if (orgError || !org) {
      console.error("Could not find organization admin:", orgError);
      return;
    }
    
    const { data: adminUser, error: userError } = await supabaseClient.auth.admin.getUserById(
      org.profiles.user_id
    );
    
    if (userError || !adminUser?.user?.email) {
      console.error("Could not find admin user email:", userError);
      return;
    }
    
    // Send email notification
    await supabaseClient.functions.invoke('send-email', {
      body: {
        to: adminUser.user.email,
        subject: `Query Usage Alert - ${usage.threshold}% Limit Reached`,
        template: 'usage-notification',
        data: {
          organizationName: org.name,
          threshold: usage.threshold,
          current: usage.current,
          total: usage.total,
          percentage: Math.round(usage.percentage),
          billingUrl: `${Deno.env.get('PUBLIC_SITE_URL') || 'https://askrita.org'}/billing`
        }
      }
    });
    
    console.log(`Usage notification sent to ${adminUser.user.email} for ${usage.threshold}% threshold`);
    
  } catch (error) {
    console.error("Error sending usage notification:", error);
  }
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

    // Check query limits before processing
    const limitCheck = await checkQueryLimits(supabaseClient, profile.organization_id);
    
    if (!limitCheck.allowed) {
      return new Response(
        JSON.stringify({ 
          error: "Query limit reached",
          response: limitCheck.message,
          limitReached: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
      );
    }

    // Search for relevant documents
    const searchResults = await searchDocuments(supabaseClient, message, profile.organization_id);
    
    console.log(`Found ${searchResults.length} relevant document chunks`);

    // Format document context
    const documentContext = formatDocumentContext(searchResults);

    // Generate response with context
    const { response, sources } = await generateChatResponse(message, documentContext);

    // Increment query usage after successful response
    await incrementQueryUsage(supabaseClient, profile.organization_id, limitCheck.usage, limitCheck.planLimit);

    // Track the query in the database (keeping existing tracking)
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