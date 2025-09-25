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
  }),

  usageNotification: (organizationName: string, threshold: number, current: number, total: number, percentage: number, billingUrl: string) => ({
    subject: `Query Usage Alert - ${threshold}% Limit Reached`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${threshold >= 100 ? '#dc3545' : '#ffc107'}; color: ${threshold >= 100 ? 'white' : '#000'}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e5e5; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .usage-box { background: #f8f9fa; border: 1px solid #dee2e6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .usage-bar { background: #e9ecef; height: 20px; border-radius: 10px; margin: 10px 0; overflow: hidden; }
            .usage-fill { background: ${threshold >= 100 ? '#dc3545' : threshold >= 80 ? '#ffc107' : '#28a745'}; height: 100%; width: ${percentage}%; transition: width 0.3s ease; }
            .warning-box { background: ${threshold >= 100 ? '#f8d7da' : '#fff3cd'}; border: 1px solid ${threshold >= 100 ? '#f5c6cb' : '#ffc107'}; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${threshold >= 100 ? '🚨 Query Limit Reached!' : '⚠️ Query Usage Alert'}</h1>
            </div>
            <div class="content">
              <h2>Hi there,</h2>
              <p>This is an automated notification about your query usage for <strong>${organizationName}</strong>.</p>
              
              <div class="usage-box">
                <h3>Current Usage</h3>
                <div class="usage-bar">
                  <div class="usage-fill"></div>
                </div>
                <p><strong>${current.toLocaleString()} of ${total.toLocaleString()} queries used</strong></p>
                <p>${percentage}% of your monthly limit</p>
              </div>

              <div class="warning-box">
                ${threshold >= 100 
                  ? '<strong>Limit Reached:</strong> You have reached 100% of your monthly query limit. Further queries will be blocked until you upgrade your plan or purchase additional query packs.'
                  : '<strong>Usage Warning:</strong> You have used 80% of your monthly query limit. Consider upgrading your plan or purchasing additional query packs to avoid service interruption.'
                }
              </div>

              <h3>What can you do?</h3>
              <ul>
                <li>🔄 <strong>Upgrade your plan</strong> for higher monthly limits</li>
                <li>📦 <strong>Purchase query packs</strong> for immediate additional capacity</li>
                <li>📊 <strong>Monitor usage</strong> in your billing dashboard</li>
                ${threshold >= 100 ? '<li>⏳ <strong>Wait for monthly reset</strong> on your next billing cycle</li>' : ''}
              </ul>

              <center>
                <a href="${billingUrl}" class="button">${threshold >= 100 ? 'Purchase More Queries' : 'Manage Billing'}</a>
              </center>

              <p>Your monthly usage resets on your billing cycle date. You can view detailed usage statistics and purchase additional query packs in your billing dashboard.</p>
              
              <p>Questions? Contact our support team - we're here to help!</p>
              <p>Best regards,<br>The AskRita Team</p>
            </div>
            <div class="footer">
              <p>© 2024 AskRita. All rights reserved.</p>
              <p>This is an automated notification based on your usage settings.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Query Usage Alert for ${organizationName}\n\nYou have used ${current.toLocaleString()} of ${total.toLocaleString()} queries (${percentage}%) this month.\n\n${threshold >= 100 
      ? 'You have reached your monthly query limit. Further queries will be blocked until you upgrade or purchase additional query packs.'
      : 'You are approaching your monthly query limit. Consider upgrading your plan or purchasing additional query packs.'
    }\n\nManage your billing: ${billingUrl}\n\nBest regards,\nThe AskRita Team`
  }),

  quickbaseSync: (organizationName: string, adminName: string, errorMessage: string, realmHostname: string, appId: string, dashboardUrl: string) => ({
    subject: `Quickbase Sync Failed - ${organizationName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e5e5; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .error-box { background: #f8d7da; border: 1px solid #f1aeb5; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .info-box { background: #e3f2fd; border: 1px solid #1976d2; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 Quickbase Sync Failed</h1>
            </div>
            <div class="content">
              <h2>Hello ${adminName},</h2>
              <p>We encountered an issue while syncing your Quickbase data for <strong>${organizationName}</strong>.</p>
              
              <div class="error-box">
                <h3 style="color: #721c24; margin-top: 0;">Error Details:</h3>
                <p style="font-family: monospace; font-size: 14px; margin: 0; word-break: break-word;">
                  ${errorMessage}
                </p>
              </div>
              
              <div class="info-box">
                <h3 style="color: #1976d2; margin-top: 0;">Integration Details:</h3>
                <ul style="margin: 10px 0;">
                  <li><strong>Realm:</strong> ${realmHostname || 'N/A'}</li>
                  <li><strong>App ID:</strong> ${appId || 'N/A'}</li>
                </ul>
              </div>
              
              <h3>What you can do:</h3>
              <ul>
                <li>🔑 Check your Quickbase User Token permissions</li>
                <li>✅ Verify the App ID and Realm hostname are correct</li>
                <li>🌐 Ensure the Quickbase app is accessible</li>
                <li>🔄 Try running a manual sync from your dashboard</li>
              </ul>
              
              <center>
                <a href="${dashboardUrl}" class="button">Go to Integration Settings</a>
              </center>
              
              <p>If you continue to experience issues, please contact our support team - we're here to help!</p>
              <p>Best regards,<br>The AskRita Team</p>
            </div>
            <div class="footer">
              <p>© 2024 AskRita. All rights reserved.</p>
              <p>This is an automated notification from AskRita.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Quickbase Sync Failed - ${organizationName}\n\nHello ${adminName},\n\nWe encountered an issue while syncing your Quickbase data for ${organizationName}.\n\nError: ${errorMessage}\n\nIntegration Details:\n- Realm: ${realmHostname || 'N/A'}\n- App ID: ${appId || 'N/A'}\n\nPlease check your Quickbase User Token permissions, verify your App ID and Realm hostname, and try running a manual sync from your dashboard.\n\nManage your integration: ${dashboardUrl}\n\nBest regards,\nThe AskRita Team`
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

      case "usage-notification":
        emailContent = emailTemplates.usageNotification(
          data.organizationName,
          data.threshold,
          data.current,
          data.total,
          data.percentage,
          data.billingUrl
        );
        break;

      case "quickbase_sync_error":
        emailContent = emailTemplates.quickbaseSync(
          data.organizationName,
          data.adminName,
          data.errorMessage,
          data.realmHostname,
          data.appId,
          data.dashboardUrl
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