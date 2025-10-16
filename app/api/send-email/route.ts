import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Ensure this route runs on the Node.js runtime (Nodemailer won't work on the edge runtime)
export const runtime = 'nodejs';

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text: string;
  config: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
    from: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, text, config }: EmailRequest = await request.json();

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.auth.user,
        // Gmail app passwords are displayed with spaces; remove spaces just in case
        pass: (config.auth.pass || '').replace(/\s+/g, ''),
      },
    });

    // Send email
    const info = await transporter.sendMail({
      // For Gmail SMTP, the "from" should match the authenticated user
      from: config.auth.user,
      replyTo: config.from || config.auth.user,
      to: to,
      subject: subject,
      text: text,
      html: html,
    });

    console.log('Email sent successfully:', info.messageId);
    
    return NextResponse.json({ 
      success: true, 
      messageId: info.messageId 
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send email' 
      },
      { status: 500 }
    );
  }
}
