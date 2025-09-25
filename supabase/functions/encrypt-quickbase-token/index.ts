import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://ask-rita-kt95eg6tk-drive-line.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple encryption using Web Crypto API
async function encryptToken(token: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    
    // Generate a key from dedicated encryption secret
    const encryptionKey = Deno.env.get("QUICKBASE_TOKEN_ENCRYPTION_KEY");
    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error("QUICKBASE_TOKEN_ENCRYPTION_KEY must be set and at least 32 characters");
    }
    
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(encryptionKey.substring(0, 32)),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("quickbase-salt"),
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Return base64 encoded
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt token");
  }
}

async function decryptToken(encryptedToken: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    
    // Decode from base64
    const combined = new Uint8Array(
      atob(encryptedToken).split('').map(char => char.charCodeAt(0))
    );

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    // Generate the same key using dedicated encryption secret
    const encryptionKey = Deno.env.get("QUICKBASE_TOKEN_ENCRYPTION_KEY");
    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error("QUICKBASE_TOKEN_ENCRYPTION_KEY must be set and at least 32 characters");
    }
    
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(encryptionKey.substring(0, 32)),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("quickbase-salt"),
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt token");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // CRITICAL: Only allow service role access - this is an internal function
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.replace("Bearer ", "") !== serviceRoleKey) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "Unauthorized - Service role access required" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
    );
  }

  try {
    const { action, token } = await req.json();

    if (!action || !token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Missing required fields: action, token" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    let result;
    if (action === 'encrypt') {
      result = await encryptToken(token);
    } else if (action === 'decrypt') {
      result = await decryptToken(token);
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Invalid action. Use 'encrypt' or 'decrypt'" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        result: result
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("Error in encrypt-quickbase-token:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        message: error.message || "Internal server error"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});