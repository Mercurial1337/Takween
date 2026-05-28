import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { getRateLimiter, getClientIp } from '@/lib/rateLimit';

const emailLimiter = getRateLimiter('email', { windowMs: 60_000, maxRequests: 5 });
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const { success, resetIn } = emailLimiter.check(ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', retryAfterMs: resetIn },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(resetIn / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const body = await request.json();
    const { type, recipientId, recipientName, actorName, projectName, message, teamName, sourceMemberCount } = body;

    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 });
    }

    // Fetch recipient email securely using service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Supabase credentials missing. Cannot fetch email.');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: contactData, error: contactErr } = await supabaseAdmin
      .from('contact_info')
      .select('email')
      .eq('id', recipientId)
      .single();

    if (contactErr || !contactData?.email) {
      console.error('Failed to fetch recipient email:', contactErr);
      return NextResponse.json({ error: 'Recipient email not found' }, { status: 404 });
    }

    const recipientEmail = contactData.email;

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      console.warn('SMTP not configured. Simulated email:', body);
      return NextResponse.json({ success: true, simulated: true });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const { subject, innerContent } = buildEmailContent({
      type, recipientName, actorName, projectName, message, teamName, sourceMemberCount,
    });

    if (!subject) {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    const htmlContent = buildBaseHtml(innerContent);
    const textContent = buildPlainText(innerContent);

    const info = await transporter.sendMail({
      from: `"Takween" <${process.env.SMTP_USER}>`,
      to: recipientEmail,
      subject,
      text: textContent,
      html: htmlContent,
      headers: {
        'Precedence': 'transactional',
        'List-Unsubscribe': `<mailto:${process.env.SMTP_USER}?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Mailer': 'Takween/1.0',
      },
    });

    return NextResponse.json({ success: true, messageId: info.messageId });

  } catch (error) {
    console.error('Email API route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function buildEmailContent({ type, recipientName, actorName, projectName, message, teamName, sourceMemberCount }) {
  const msg = (text) => message
    ? `<div style="background-color:#F8F9FA;border-left:4px solid #C49A4A;padding:16px;margin-bottom:24px;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-style:italic;color:#1A3C34;">${text}: "${message}"</p>
       </div>`
    : '';

  const p = (text) =>
    `<p style="font-size:16px;line-height:1.6;color:#5A7A72;margin-bottom:24px;">${text}</p>`;

  const h2 = (text) =>
    `<h2 style="margin-top:0;font-size:20px;color:#1A3C34;font-weight:600;">${text}</h2>`;

  const templates = {
    request_received: {
      subject: `New join request for ${projectName}`,
      innerContent: `
        ${h2('New Join Request')}
        ${p(`Hello ${recipientName},`)}
        ${p(`<strong>${actorName}</strong> has requested to join your team for <strong>${projectName}</strong>.`)}
        ${msg('Message')}
        ${p('Log in to your dashboard to review and respond to this request.')}
      `,
    },
    request_accepted: {
      subject: `Your request to join ${projectName} was accepted`,
      innerContent: `
        ${h2('Request Accepted')}
        ${p(`Hello ${recipientName},`)}
        ${p(`<strong>${actorName}</strong> has accepted your request to join the team for <strong>${projectName}</strong>.`)}
        ${msg('Message from owner')}
        ${p('Log in to collaborate with your new teammates.')}
      `,
    },
    request_rejected: {
      subject: `Update on your request for ${projectName}`,
      innerContent: `
        ${h2('Request Update')}
        ${p(`Hello ${recipientName},`)}
        ${p(`Your request to join <strong>${projectName}</strong> was not accepted at this time.`)}
        ${msg('Message from owner')}
        ${p('There are other teams looking for members — check the projects page to find a match.')}
      `,
    },
    merge_received: {
      subject: `Team merge request for ${projectName}`,
      innerContent: `
        ${h2('Team Merge Request')}
        ${p(`Hello ${recipientName},`)}
        ${p(`<strong>${actorName}</strong>'s team${teamName ? ` (${teamName})` : ''} has requested to merge into your team for <strong>${projectName}</strong>.`)}
        ${sourceMemberCount ? p(`This would add <strong>${sourceMemberCount} member${sourceMemberCount > 1 ? 's' : ''}</strong> to your team.`) : ''}
        ${msg('Message')}
        ${p('Log in to your dashboard to review this request.')}
      `,
    },
    merge_accepted: {
      subject: `Team merge accepted for ${projectName}`,
      innerContent: `
        ${h2('Merge Accepted')}
        ${p(`Hello ${recipientName},`)}
        ${p(`Your team merge request for <strong>${projectName}</strong> was accepted by <strong>${actorName}</strong>.`)}
        ${msg('Message')}
        ${p('Your team members have been transferred. Log in to see your updated team.')}
      `,
    },
    merge_rejected: {
      subject: `Update on your merge request for ${projectName}`,
      innerContent: `
        ${h2('Merge Request Update')}
        ${p(`Hello ${recipientName},`)}
        ${p(`Your merge request for <strong>${projectName}</strong> was not accepted by the target team owner.`)}
        ${msg('Message')}
        ${p('Your team remains active. You may continue recruiting or request a merge with another team.')}
      `,
    },
    invite_received: {
      subject: `Invitation to join ${projectName}`,
      innerContent: `
        ${h2('Team Invitation')}
        ${p(`Hello ${recipientName},`)}
        ${p(`<strong>${actorName}</strong> has invited you to join their team for <strong>${projectName}</strong>.`)}
        ${msg('Message')}
        ${p('Log in to accept or decline this invitation.')}
      `,
    },
    invite_accepted: {
      subject: `Your invitation for ${projectName} was accepted`,
      innerContent: `
        ${h2('Invitation Accepted')}
        ${p(`Hello ${recipientName},`)}
        ${p(`<strong>${actorName}</strong> has accepted your invitation to join the team for <strong>${projectName}</strong>.`)}
        ${p('Log in to see your updated team roster.')}
      `,
    },
    invite_rejected: {
      subject: `Update on your invitation for ${projectName}`,
      innerContent: `
        ${h2('Invitation Declined')}
        ${p(`Hello ${recipientName},`)}
        ${p(`<strong>${actorName}</strong> has declined your invitation to join the team for <strong>${projectName}</strong>.`)}
        ${p('You can browse the Student Directory to find other students looking for a team.')}
      `,
    },
  };

  return templates[type] ?? { subject: null, innerContent: null };
}

function buildBaseHtml(innerContent) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Takween Notification</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#F2F0EA;margin:0;padding:0;">
  <div style="width:100%;background-color:#F2F0EA;padding:40px 0;">
    <div style="max-width:600px;margin:0 auto;background-color:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E8EDEB;">
      <div style="background-color:#1D6E72;padding:30px 40px;text-align:center;">
        <h1 style="color:#FFFFFF;margin:0;font-size:24px;font-weight:700;">Takween</h1>
      </div>
      <div style="padding:40px;">
        ${innerContent}
        <div style="text-align:center;margin:30px 0 10px;">
          <a href="${appUrl}/dashboard" style="display:inline-block;background-color:#2A9298;color:#FFFFFF;text-decoration:none;padding:12px 30px;border-radius:6px;font-size:16px;font-weight:600;">Go to Dashboard</a>
        </div>
      </div>
      <div style="background-color:#FBF0DC;padding:20px 40px;text-align:center;border-top:1px solid #E8EDEB;">
        <p style="font-size:12px;color:#5A7A72;margin:0;">&copy; ${year} Takween. All rights reserved.</p>
        <p style="font-size:11px;color:#5A7A72;margin:8px 0 0;">You received this because you are registered on Takween.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buildPlainText(innerContent) {
  return innerContent
    .replace(/<\/h2>/g, '\n\n')
    .replace(/<\/p>/g, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
    + `\n\nDashboard: ${appUrl}/dashboard\n\n© ${new Date().getFullYear()} Takween`;
}