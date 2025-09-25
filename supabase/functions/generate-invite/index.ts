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

    // Get user's profile to check if they're an admin
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role, organization_id")
      .eq("user_id", user.id)
      .single();

    if (profileError) throw new Error("Could not fetch user profile");
    if (profile.role !== "admin") throw new Error("Only admins can generate invite links");

    const requestBody = await req.json();
    const { expiresIn = 7, email } = requestBody; // Default to 7 days

    // Generate invite token for the organization
    const { data: tokenData, error: tokenError } = await supabaseClient
      .rpc("generate_invite_token");

    if (tokenError) throw new Error(`Failed to generate token: ${tokenError.message}`);

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresIn);

    // Update organization with invite token and expiry
    const { data: org, error: updateError } = await supabaseClient
      .from("organizations")
      .update({
        invite_token: tokenData,
        invite_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", profile.organization_id)
      .select()
      .single();

    if (updateError) throw new Error(`Failed to update organization: ${updateError.message}`);

    // Build the invite link
    const baseUrl = req.headers.get("origin") || "https://ask-rita-kt95eg6tk-drive-line.vercel.app";
    const inviteLink = `${baseUrl}/invite/${tokenData}`;

    // Get user's profile for inviter name  
    const { data: userProfile } = await supabaseClient
      .from("profiles")
      .select("first_name, last_name")
      .eq("user_id", user.id)
      .single();

    // Send invitation email if email is provided
    if (email) {
      try {
        const emailData = {
          type: "invitation",
          data: {
            email: email,
            inviterName: `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim() || user.email,
            organizationName: org.name,
            inviteLink: inviteLink,
            expiresAt: expiresAt.toISOString()
          }
        };

        // Call send-email function
        const emailResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": authHeader,
          },
          body: JSON.stringify(emailData),
        });

        if (!emailResponse.ok) {
          console.error("Failed to send invitation email:", await emailResponse.text());
        }
      } catch (emailError) {
        console.error("Error sending invitation email:", emailError);
        // Continue even if email fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        inviteLink,
        token: tokenData,
        expiresAt: expiresAt.toISOString(),
        organizationName: org.name
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error generating invite:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});