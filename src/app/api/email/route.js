import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, recipientEmail, recipientName, actorName, projectName, message, teamName, sourceMemberCount } = body;

    if (!recipientEmail) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      console.warn('SMTP credentials are not set. Email would have been:', body);
      return NextResponse.json({ success: true, simulated: true });
    }

    let subject = '';
    let htmlContent = '';

    const year = new Date().getFullYear();
    const baseHtml = (content) => `
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
    .message-box {
      background-color: #F8F9FA;
      border-left: 4px solid #C49A4A;
      padding: 16px;
      margin-bottom: 24px;
      border-radius: 0 8px 8px 0;
    }
    .message-box p {
      margin: 0;
      font-style: italic;
      color: #1A3C34;
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
        ${content}
        <div class="button-container">
          <a href="${appUrl}/dashboard" class="button" style="color: #FFFFFF !important;">Go to Dashboard</a>
        </div>
      </div>
      <div class="footer">
        <p>&copy; ${year} Takween. All rights reserved.</p>
        <p style="margin-top: 8px; font-size: 11px;">You are receiving this email because you are registered on Takween.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
    
    let innerContent = '';

    switch (type) {
      case 'request_received':
        subject = `New Join Request for ${projectName}`;
        innerContent = `
          <h2>New Join Request</h2>
          <p>Hello ${recipientName},</p>
          <p><strong>${actorName}</strong> has requested to join your team for the project <strong>${projectName}</strong>.</p>
          ${message ? `<div class="message-box"><p>"${message}"</p></div>` : ''}
          <p>Please log in to your dashboard to review and accept or reject this request.</p>
        `;
        break;
      case 'request_accepted':
        subject = `Request Accepted: ${projectName}`;
        innerContent = `
          <h2>You're in! 🎉</h2>
          <p>Hello ${recipientName},</p>
          <p>Great news! <strong>${actorName}</strong> has accepted your request to join the team for <strong>${projectName}</strong>.</p>
          ${message ? `<div class="message-box"><p>Message from owner: "${message}"</p></div>` : ''}
          <p>You can now collaborate with your new teammates. Log in to view your team details.</p>
        `;
        break;
      case 'request_rejected':
        subject = `Request Update: ${projectName}`;
        innerContent = `
          <h2>Request Update</h2>
          <p>Hello ${recipientName},</p>
          <p>We wanted to let you know that your request to join the team for <strong>${projectName}</strong> was declined by the team owner.</p>
          ${message ? `<div class="message-box"><p>Message from owner: "${message}"</p></div>` : ''}
          <p>Don't worry! There are plenty of other teams looking for members. Check out the projects page to find another great fit.</p>
        `;
        break;
      case 'merge_received':
        subject = `Team Merge Request for ${projectName}`;
        innerContent = `
          <h2>Team Merge Request</h2>
          <p>Hello ${recipientName},</p>
          <p><strong>${actorName}</strong>'s team${teamName ? ` (${teamName})` : ''} has requested to merge into your team for the project <strong>${projectName}</strong>.</p>
          ${sourceMemberCount ? `<p>This would add <strong>${sourceMemberCount} member${sourceMemberCount > 1 ? 's' : ''}</strong> to your team.</p>` : ''}
          ${message ? `<div class="message-box"><p>"${message}"</p></div>` : ''}
          <p>Please log in to your dashboard to review this merge request.</p>
        `;
        break;
      case 'merge_accepted':
        subject = `Team Merge Accepted: ${projectName}`;
        innerContent = `
          <h2>Merge Accepted! 🤝</h2>
          <p>Hello ${recipientName},</p>
          <p>Great news! Your team merge request for <strong>${projectName}</strong> has been accepted by <strong>${actorName}</strong>.</p>
          ${message ? `<div class="message-box"><p>Message: "${message}"</p></div>` : ''}
          <p>Your team members have been transferred. Log in to see your updated team.</p>
        `;
        break;
      case 'merge_rejected':
        subject = `Team Merge Update: ${projectName}`;
        innerContent = `
          <h2>Merge Request Update</h2>
          <p>Hello ${recipientName},</p>
          <p>Your team merge request for <strong>${projectName}</strong> was declined by the target team owner.</p>
          ${message ? `<div class="message-box"><p>Message: "${message}"</p></div>` : ''}
          <p>Your team remains active. You can continue to recruit members or consider requesting a merge with another team.</p>
        `;
        break;
      default:
        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    if (!innerContent) {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    htmlContent = baseHtml(innerContent);

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipientEmail,
      subject: subject,
      html: htmlContent,
    });

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Email API route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
