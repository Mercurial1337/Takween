import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:3000";
    const resendFrom = Deno.env.get("RESEND_FROM") ?? "Takween <onboarding@resend.dev>";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase URL or Service Role Key in environment variables.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const body = await req.json();

    console.log("Webhook payload received:", JSON.stringify(body));

    // Supabase DB webhooks send the record under `record` or `new_record` or directly
    const record = body.record || body.new_record || body;
    if (!record || !record.user_id || !record.type) {
      console.warn("Invalid webhook payload structure. Missing record, user_id or type.");
      return new Response(JSON.stringify({ error: "Invalid payload structure" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Filter notification types: only send email for 'request_received' and 'request_accepted'
    const allowedEmailTypes = ["request_received", "request_accepted"];
    if (!allowedEmailTypes.includes(record.type)) {
      console.log(`Notification type '${record.type}' is not enabled for email. Skipping email dispatch.`);
      return new Response(
        JSON.stringify({ success: true, message: `Email skipped for notification type: ${record.type}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Fetch recipient user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", record.user_id)
      .single();

    if (profileError || !profile) {
      console.error(`Failed to fetch profile for user_id ${record.user_id}:`, profileError);
      throw new Error(`Profile not found: ${profileError?.message || "unknown error"}`);
    }

    if (!profile.email) {
      console.warn(`User ${record.user_id} (${profile.full_name}) has no email address configured. Skipping email.`);
      return new Response(JSON.stringify({ error: "User has no email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Sending email to ${profile.full_name} (${profile.email}) for notification type '${record.type}'...`);

    if (!resendApiKey) {
      console.warn("RESEND_API_KEY is not set. Simulating email sending for testing.");
      return new Response(
        JSON.stringify({
          success: true,
          simulated: true,
          recipient: profile.email,
          subject: record.title,
          body: record.body,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Construct the email body
    const year = new Date().getFullYear();
    const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Takween Notification</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F2F0EA;
      color: #1A3C34;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #F2F0EA;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(26, 60, 52, 0.05);
      border: 1px solid #E8EDEB;
    }
    .header {
      background-color: #1D6E72;
      padding: 30px 40px;
      text-align: center;
    }
    .header h1 {
      color: #FFFFFF;
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 40px;
    }
    .content h2 {
      margin-top: 0;
      font-size: 20px;
      color: #1A3C34;
      font-weight: 600;
    }
    .content p {
      font-size: 16px;
      line-height: 1.6;
      color: #5A7A72;
      margin-bottom: 24px;
    }
    .button-container {
      text-align: center;
      margin: 30px 0 10px;
    }
    .button {
      display: inline-block;
      background-color: #2A9298;
      color: #FFFFFF !important;
      text-decoration: none;
      padding: 12px 30px;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      transition: background-color 0.2s ease;
    }
    .footer {
      background-color: #FBF0DC;
      padding: 20px 40px;
      text-align: center;
      border-top: 1px solid #E8EDEB;
    }
    .footer p {
      font-size: 12px;
      color: #5A7A72;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>Takween</h1>
      </div>
      <div class="content">
        <h2>${record.title}</h2>
        <p>Hello ${profile.full_name},</p>
        <p>${record.body}</p>
        <div class="button-container">
          <a href="${appUrl}/dashboard" class="button" style="color: #FFFFFF !important;">Go to Dashboard</a>
        </div>
      </div>
      <div class="footer">
        <p>&copy; ${year} Takween. All rights reserved.</p>
        <p style="margin-top: 8px; font-size: 11px;">You are receiving this email because you registered on Takween.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    // Make the API call to Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: resendFrom,
        to: profile.email,
        subject: record.title,
        html: htmlEmail,
      }),
    });

    const resData = await res.json();
    if (!res.ok) {
      console.error("Resend API error response:", JSON.stringify(resData));
      throw new Error(`Resend API failed: ${resData.message || res.statusText}`);
    }

    console.log("Email successfully sent via Resend:", JSON.stringify(resData));
    return new Response(JSON.stringify({ success: true, resend: resData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Fatal error in send-email Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
