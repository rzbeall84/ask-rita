import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { handleCors, addCorsHeaders, validateRequest, validateEnvVars } from "../_shared/cors.ts";
import { withRateLimit, rateLimitConfigs } from "../_shared/rateLimiter.ts";

// Email templates
const emailTemplates = {
  welcome: (firstName: string, organizationName: string) => ({
    subject: "Welcome to AskRita!",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e5e5; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to AskRita!</h1>
            </div>
            <div class="content">
              <h2>Hi ${firstName},</h2>
              <p>Welcome to AskRita - your AI-powered recruitment assistant!</p>
              <p>You've successfully joined <strong>${organizationName}</strong>. Here's what you can do now:</p>
              <ul>
                <li>✨ Chat with Rita to find the perfect candidates</li>
                <li>📄 Upload and manage recruitment documents</li>
                <li>👥 Collaborate with your team members</li>
                <li>📊 Track your recruitment analytics</li>
              </ul>
              <p>Ready to get started?</p>
              <a href="https://ask-rita-kt95eg6tk-drive-line.vercel.app/dashboard/chat" class="button">Go to Dashboard</a>
              <p>If you have any questions, feel free to reach out to our support team.</p>
              <p>Best regards,<br>The AskRita Team</p>
            </div>
            <div class="footer">
              <p>© 2024 AskRita. All rights reserved.</p>
              <p>This email was sent to you because you signed up for AskRita.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hi ${firstName},\n\nWelcome to AskRita - your AI-powered recruitment assistant!\n\nYou've successfully joined ${organizationName}. You can now chat with Rita, upload documents, collaborate with your team, and track recruitment analytics.\n\nGet started at: https://ask-rita-kt95eg6tk-drive-line.vercel.app/dashboard/chat\n\nBest regards,\nThe AskRita Team`
  }),

  invitation: (inviterName: string, organizationName: string, inviteLink: string, expiresAt: string) => ({
    subject: `You're invited to join ${organizationName} on AskRita`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e5e5; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>You're Invited!</h1>
            </div>
            <div class="content">
              <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on AskRita.</p>
              <p>AskRita is an AI-powered recruitment assistant that helps teams find the perfect candidates faster and more efficiently.</p>
              <p>Click the button below to accept your invitation and create your account:</p>
              <center>
                <a href="${inviteLink}" class="button">Accept Invitation</a>
              </center>
              <div class="warning">
                <strong>Note:</strong> This invitation will expire on ${new Date(expiresAt).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}.
              </div>
              <p>If you have any questions, please contact ${inviterName} or our support team.</p>
              <p>Best regards,<br>The AskRita Team</p>
            </div>
            <div class="footer">
              <p>© 2024 AskRita. All rights reserved.</p>
              <p>If you did not expect this invitation, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `${inviterName} has invited you to join ${organizationName} on AskRita.\n\nAskRita is an AI-powered recruitment assistant that helps teams find the perfect candidates faster.\n\nAccept your invitation here: ${inviteLink}\n\nNote: This invitation will expire on ${new Date(expiresAt).toLocaleDateString()}.\n\nBest regards,\nThe AskRita Team`
  }),

  subscriptionConfirmation: (firstName: string, planName: string, features: string[]) => ({
    subject: `Subscription Confirmed - ${planName} Plan`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e5e5; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .plan-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Subscription Confirmed!</h1>
            </div>
            <div class="content">
              <h2>Hi ${firstName},</h2>
              <p>Great news! Your subscription to the <strong>${planName} Plan</strong> has been confirmed.</p>
              <div class="plan-box">
                <h3>Your Plan Features:</h3>
                <ul>
                  ${features.map(f => `<li>${f}</li>`).join('')}
                </ul>
              </div>
              <p>You now have full access to all ${planName} features. Start using them right away!</p>
              <a href="https://ask-rita-kt95eg6tk-drive-line.vercel.app/dashboard" class="button">Go to Dashboard</a>
              <p>To manage your subscription or update billing information, visit your account settings.</p>
              <p>Thank you for choosing AskRita!</p>
              <p>Best regards,<br>The AskRita Team</p>
            </div>
            <div class="footer">
              <p>© 2024 AskRita. All rights reserved.</p>
              <p>Need help? Contact our support team at support@askrita.org</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hi ${firstName},\n\nYour subscription to the ${planName} Plan has been confirmed.\n\nYour plan includes:\n${features.join('\n')}\n\nAccess your dashboard at: https://ask-rita-kt95eg6tk-drive-line.vercel.app/dashboard\n\nThank you for choosing AskRita!\n\nBest regards,\nThe AskRita Team`
  }),

  subscriptionCancellation: (firstName: string, gracePeriodEnd: string) => ({
    subject: "Subscription Cancellation Confirmed",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #6c757d; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e5e5; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .info-box { background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Subscription Cancellation</h1>
            </div>
            <div class="content">
              <h2>Hi ${firstName},</h2>
              <p>We've received your request to cancel your AskRita subscription.</p>
              <div class="info-box">
                <strong>Important:</strong> You'll continue to have access to your paid features until <strong>${new Date(gracePeriodEnd).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</strong>.
              </div>
              <p>After this date, your account will revert to our free plan with limited features.</p>
              <p>We're sorry to see you go! If there's anything we could have done better, please let us know.</p>
              <p>You can reactivate your subscription at any time from your billing settings:</p>
              <a href="https://ask-rita-kt95eg6tk-drive-line.vercel.app/billing" class="button">Manage Subscription</a>
              <p>Thank you for being part of the AskRita community.</p>
              <p>Best regards,<br>The AskRita Team</p>
            </div>
            <div class="footer">
              <p>© 2024 AskRita. All rights reserved.</p>
              <p>Questions? Contact support@askrita.org</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hi ${firstName},\n\nWe've received your request to cancel your AskRita subscription.\n\nImportant: You'll continue to have access until ${new Date(gracePeriodEnd).toLocaleDateString()}.\n\nAfter this date, your account will revert to our free plan.\n\nYou can reactivate at any time from: https://ask-rita-kt95eg6tk-drive-line.vercel.app/billing\n\nThank you for being part of AskRita.\n\nBest regards,\nThe AskRita Team`
  }),

  paymentFailed: (firstName: string, retryDate: string) => ({
    subject: "Payment Failed - Action Required",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e5e5; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning-box { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Failed</h1>
            </div>
            <div class="content">
              <h2>Hi ${firstName},</h2>
              <p>We were unable to process your payment for your AskRita subscription.</p>
              <div class="warning-box">
                <strong>Action Required:</strong> Please update your payment information to avoid service interruption.
                <br><br>
                We'll retry the payment on <strong>${new Date(retryDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</strong>.
              </div>
              <p>To update your payment method now:</p>
              <center>
                <a href="https://ask-rita-kt95eg6tk-drive-line.vercel.app/billing" class="button">Update Payment Method</a>
              </center>
              <p>If you've recently updated your payment information, please disregard this email.</p>
              <p>Need help? Our support team is here to assist you.</p>
              <p>Best regards,<br>The AskRita Team</p>
            </div>
            <div class="footer">
              <p>© 2024 AskRita. All rights reserved.</p>
              <p>Contact support: support@askrita.org</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hi ${firstName},\n\nWe were unable to process your payment for your AskRita subscription.\n\nAction Required: Please update your payment information to avoid service interruption.\n\nWe'll retry the payment on ${new Date(retryDate).toLocaleDateString()}.\n\nUpdate your payment method at: https://ask-rita-kt95eg6tk-drive-line.vercel.app/billing\n\nNeed help? Contact support@askrita.org\n\nBest regards,\nThe AskRita Team`
  })
};

// Helper function to send email via Resend
async function sendEmail(to: string, subject: string, html: string, text: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "AskRita <noreply@askrita.org>",
      to: [to],
      subject: subject,
      html: html,
      text: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return await response.json();
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Validate environment variables
  const envCheck = validateEnvVars(['RESEND_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  if (!envCheck.valid) {
    return new Response(
      JSON.stringify({ error: `Missing environment variables: ${envCheck.missing.join(', ')}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Apply rate limiting
  const rateLimitResponse = await withRateLimit(
    req,
    rateLimitConfigs.email,
    (req) => req.headers.get('authorization')?.replace('Bearer ', '') || 'anonymous'
  );
  if (rateLimitResponse) return rateLimitResponse;

  // Validate request
  const validation = validateRequest(req, {
    requireAuth: false,
    requireBody: true,
    allowedMethods: ['POST'],
  });
  if (!validation.valid) {
    return new Response(
      JSON.stringify({ error: validation.error }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    const { type, data } = await req.json();

    if (!type || !data) {
      throw new Error("Missing email type or data");
    }

    let emailContent;
    let recipientEmail = data.email;

    switch (type) {
      case "welcome":
        emailContent = emailTemplates.welcome(
          data.firstName || "there",
          data.organizationName || "AskRita"
        );
        break;

      case "invitation":
        emailContent = emailTemplates.invitation(
          data.inviterName,
          data.organizationName,
          data.inviteLink,
          data.expiresAt
        );
        break;

      case "subscription_confirmation":
        emailContent = emailTemplates.subscriptionConfirmation(
          data.firstName || "there",
          data.planName,
          data.features || []
        );
        break;

      case "subscription_cancellation":
        emailContent = emailTemplates.subscriptionCancellation(
          data.firstName || "there",
          data.gracePeriodEnd
        );
        break;

      case "payment_failed":
        emailContent = emailTemplates.paymentFailed(
          data.firstName || "there",
          data.retryDate
        );
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    // Send the email
    const result = await sendEmail(
      recipientEmail,
      emailContent.subject,
      emailContent.html,
      emailContent.text
    );

    // Log email sent
    await supabaseClient.from('email_logs').insert({
      recipient: recipientEmail,
      type: type,
      status: 'sent',
      metadata: data,
      created_at: new Date().toISOString(),
    });

    return addCorsHeaders(
      new Response(
        JSON.stringify({ success: true, messageId: result.id }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ),
      req
    );
  } catch (error) {
    console.error("Error sending email:", error);
    
    // Log email failure
    try {
      await supabaseClient.from('email_logs').insert({
        recipient: data?.email,
        type: type,
        status: 'failed',
        error_message: error.message,
        metadata: data,
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error("Failed to log email error:", logError);
    }

    return addCorsHeaders(
      new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ),
      req
    );
  }
});