import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { z } from 'zod';

// Strict schema validation to prevent injection or memory exhaustion
const sendEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(5, 'Email must be at least 5 characters')
    .max(254, 'Email exceeds 254 characters maximum')
    .email('Invalid email address format'),
  imageBase64: z
    .string()
    .min(100, 'Image data is too short')
    .max(7000000, 'Image size exceeds 5MB limit') // Max 7MB base64 (~5MB binary)
    .refine((val) => val.startsWith('data:image/png;base64,'), {
      message: 'Image must be a valid PNG data URL',
    }),
  frameName: z.string().trim().max(100).optional().default('In Frame Cinema Edition'),
  takenAt: z.string().trim().max(100).optional(),
});

// HTML Entity Sanitizer to prevent HTML injection / XSS in email client
function sanitizeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// In-Memory IP Rate Limiter (Max 5 emails per IP per 5 minutes)
const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 minutes
  const limit = 5;

  const record = ipRequestCounts.get(ip);
  if (!record || now > record.resetAt) {
    ipRequestCounts.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (record.count >= limit) {
    const waitSeconds = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, waitSeconds };
  }

  record.count += 1;
  return { allowed: true };
}

export async function POST(req: Request) {
  try {
    // 1. IP Rate Limiting
    const forwarded = req.headers.get('x-forwarded-for');
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

    const rateLimit = checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many email requests. Please wait ${rateLimit.waitSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    // 2. Body Payload Parsing
    const body = await req.json();
    const parseResult = sendEmailSchema.safeParse(body);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Invalid payload';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { email, imageBase64, frameName, takenAt } = parseResult.data;

    // 3. Decode Base64 and Validate PNG Magic Bytes
    const base64Data = imageBase64.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // PNG signature check: 89 50 4E 47 0D 0A 1A 0A
    const isPng =
      imageBuffer.length >= 8 &&
      imageBuffer[0] === 0x89 &&
      imageBuffer[1] === 0x50 &&
      imageBuffer[2] === 0x4e &&
      imageBuffer[3] === 0x47 &&
      imageBuffer[4] === 0x0d &&
      imageBuffer[5] === 0x0a &&
      imageBuffer[6] === 0x1a &&
      imageBuffer[7] === 0x0a;

    if (!isPng) {
      return NextResponse.json(
        { error: 'Image file is not a valid PNG format' },
        { status: 400 }
      );
    }

    const safeFrameName = sanitizeHtml(frameName);
    const safeDate = sanitizeHtml(takenAt || new Date().toLocaleString('en-US'));
    const fileName = `inframe-${Date.now()}.png`;

    // 4. Send Email via Nodemailer SMTP or Mock Mode
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.SMTP_PORT) || 465;

    // Email HTML Template (Red Warm Cinema Ticket Style)
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>In Frame Photobooth Ticket</title>
      </head>
      <body style="margin:0; padding:24px; background-color:#180D0E; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#F5EBEC;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:540px; margin:0 auto; background-color:#271416; border:2px solid #B22722; border-radius:18px; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,0.6);">
          <!-- Header Banner -->
          <tr>
            <td style="padding:28px 24px 20px 24px; text-align:center; background:linear-gradient(180deg, #381C1E 0%, #271416 100%); border-bottom:2px dashed #E5B869;">
              <div style="display:inline-block; padding:4px 12px; background-color:#B22722; color:#F5EBEC; font-size:11px; font-weight:bold; letter-spacing:2px; border-radius:20px; text-transform:uppercase; margin-bottom:8px;">
                IN FRAME PHOTO BOOTH
              </div>
              <h1 style="color:#E5B869; margin:8px 0 0 0; font-size:24px; letter-spacing:1.5px; text-transform:uppercase; font-weight:800;">
                🎬 ADMIT ONE: YOUR CANDID MEMORIES
              </h1>
              <p style="margin:6px 0 0 0; color:#B39899; font-size:13px;">
                Keep it Candid • Red Warm Cinema Edition
              </p>
            </td>
          </tr>

          <!-- Ticket Details -->
          <tr>
            <td style="padding:24px 28px;">
              <p style="color:#F5EBEC; font-size:15px; line-height:1.6; margin:0 0 16px 0;">
                Hey there! ✨ Thanks for creating memories at <strong>In Frame Photo Booth</strong>. Your candid photostrip is attached in full print resolution!
              </p>

              <table width="100%" cellpadding="10" cellspacing="0" style="background-color:#160D0C; border:1px solid #4A2825; border-radius:12px; margin:16px 0;">
                <tr>
                  <td style="color:#A89088; font-size:13px; border-bottom:1px solid #2F1B1A;">Selected Frame:</td>
                  <td style="color:#E5B869; font-weight:bold; font-size:13px; text-align:right; border-bottom:1px solid #2F1B1A;">${safeFrameName}</td>
                </tr>
                <tr>
                  <td style="color:#A89088; font-size:13px;">Session Timestamp:</td>
                  <td style="color:#FAF0E4; font-size:13px; text-align:right;">${safeDate}</td>
                </tr>
              </table>

              <div style="background-color:#2F1B1A; border:1px dashed #E5B869; border-radius:12px; padding:16px; text-align:center; margin:20px 0;">
                <p style="margin:0; font-size:14px; color:#FAF0E4; font-weight:600;">
                  📸 Full-Resolution .PNG Attached!
                </p>
                <p style="margin:6px 0 0 0; font-size:12px; color:#A89088;">
                  Download the attachment below to share to your Instagram Story or TikTok with tag #CineSnap!
                </p>
              </div>

              <p style="margin:24px 0 0 0; font-size:11px; color:#A89088; text-align:center; line-height:1.5;">
                Sent automatically by CineSnap Bot • No reply needed.<br/>
                © 2026 CineSnap Interactive Kiosk. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Check if real SMTP credentials are provided
    if (!smtpUser || !smtpPass) {
      console.log('ℹ️ [CineSnap Email Bot]: SMTP_USER or SMTP_PASS not set. Operating in verified Mock / Dev mode.');
      console.log(`📨 [Mock Delivery]: Sent ${fileName} (${(imageBuffer.length / 1024).toFixed(1)} KB) to ${email}`);

      return NextResponse.json({
        success: true,
        mocked: true,
        message: 'Photostrip processed successfully! (Mock email delivery mode verified)',
      });
    }

    // Configure Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"CineSnap Photobooth Bot 🎬" <${smtpUser}>`,
      to: email,
      subject: '🎟️ Your CineSnap Photobooth Strip is Ready!',
      html: emailHtml,
      attachments: [
        {
          filename: fileName,
          content: imageBuffer,
          contentType: 'image/png',
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: 'Full-resolution photostrip sent directly to your email!',
    });
  } catch (error) {
    console.error('Email Bot Error:', error);
    return NextResponse.json(
      { error: 'Failed to send email. Please try again or download the PNG directly.' },
      { status: 500 }
    );
  }
}
