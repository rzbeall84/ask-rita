import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { fileId } = await req.json();
    if (!fileId) throw new Error("File ID is required");

    // Get file metadata from database
    const { data: fileData, error: fileError } = await supabaseClient
      .from("document_files")
      .select("*, document_folders!inner(organization_id)")
      .eq("id", fileId)
      .single();

    if (fileError) throw new Error(`File not found: ${fileError.message}`);

    // Update processing status to 'processing'
    await supabaseClient
      .from("document_files")
      .update({ 
        processing_status: "processing",
        updated_at: new Date().toISOString()
      })
      .eq("id", fileId);

    // Download file from storage
    const { data: fileBlob, error: downloadError } = await supabaseClient.storage
      .from("documents")
      .download(fileData.file_path);

    if (downloadError) throw new Error(`Failed to download file: ${downloadError.message}`);

    let extractedText = "";
    const fileName = fileData.file_name.toLowerCase();

    try {
      if (fileName.endsWith(".pdf")) {
        // Extract text from PDF
        const arrayBuffer = await fileBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Simple PDF text extraction (basic implementation)
        // For production, you might want to use a more robust solution
        const textDecoder = new TextDecoder();
        const text = textDecoder.decode(uint8Array);
        
        // Extract readable text patterns from the PDF
        const textPatterns = text.match(/[^\x00-\x1F\x7F-\xFF]{3,}/g) || [];
        extractedText = textPatterns
          .filter(str => str.trim().length > 0)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
          
      } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
        // Extract text from Word document using basic text extraction
        const arrayBuffer = await fileBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const textDecoder = new TextDecoder("utf-8", { fatal: false });
        const text = textDecoder.decode(uint8Array);
        
        // Extract readable text patterns
        const textPatterns = text.match(/[^\x00-\x1F\x7F-\xFF]{3,}/g) || [];
        extractedText = textPatterns
          .filter(str => str.trim().length > 0)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        
      } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv")) {
        // Extract text from Excel/CSV files using basic text extraction
        const arrayBuffer = await fileBlob.arrayBuffer();
        
        if (fileName.endsWith(".csv")) {
          // For CSV files, simply decode as text
          const textDecoder = new TextDecoder();
          extractedText = textDecoder.decode(arrayBuffer);
        } else {
          // For Excel files, use basic text extraction
          const uint8Array = new Uint8Array(arrayBuffer);
          const textDecoder = new TextDecoder("utf-8", { fatal: false });
          const text = textDecoder.decode(uint8Array);
          
          // Extract readable text patterns
          const textPatterns = text.match(/[^\x00-\x1F\x7F-\xFF]{3,}/g) || [];
          extractedText = textPatterns
            .filter(str => str.trim().length > 0)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
        }
        
      } else if (fileName.endsWith(".txt")) {
        // For text files, simply decode
        const textDecoder = new TextDecoder();
        extractedText = textDecoder.decode(await fileBlob.arrayBuffer());
        
      } else {
        throw new Error(`Unsupported file type: ${fileName}`);
      }

      // Clean and normalize the extracted text
      extractedText = extractedText
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/\t+/g, " ")
        .replace(/ {2,}/g, " ")
        .trim();

      // Store extracted content in document_content table
      const { data: contentData, error: contentError } = await supabaseClient
        .from("document_content")
        .insert({
          file_id: fileId,
          content_text: extractedText,
          organization_id: fileData.document_folders.organization_id,
          processing_status: "completed",
          extracted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (contentError) throw new Error(`Failed to save content: ${contentError.message}`);

      // Generate embeddings for the extracted content
      try {
        console.log("Triggering embeddings generation for document:", contentData.id);
        
        // Call the generate-embeddings edge function internally
        const { error: embeddingError } = await supabaseClient.functions.invoke('generate-embeddings', {
          body: { documentContentId: contentData.id },
          headers: {
            Authorization: req.headers.get("Authorization"),
          },
        });

        if (embeddingError) {
          console.error("Error generating embeddings:", embeddingError);
          // Don't fail the whole extraction if embeddings fail
          // The document text is still available for search
        } else {
          console.log("Embeddings generated successfully");
        }
      } catch (embError) {
        console.error("Failed to generate embeddings:", embError);
        // Continue without embeddings - text extraction was still successful
      }

      // Update file processing status to 'completed'
      const { error: updateError } = await supabaseClient
        .from("document_files")
        .update({ 
          processing_status: "completed",
          updated_at: new Date().toISOString()
        })
        .eq("id", fileId);

      if (updateError) throw new Error(`Failed to update status: ${updateError.message}`);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Document text extracted successfully",
          stats: {
            character_count: extractedText.length,
            word_count: extractedText.split(/\s+/).filter(word => word.length > 0).length
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );

    } catch (extractionError: any) {
      // Update file processing status to 'failed'
      await supabaseClient
        .from("document_files")
        .update({ 
          processing_status: "failed",
          processing_error: extractionError.message,
          updated_at: new Date().toISOString()
        })
        .eq("id", fileId);

      throw extractionError;
    }

  } catch (error: any) {
    console.error("Error extracting document text:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});