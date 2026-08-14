import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  const { to, subject, message, link } = await request.json();

  if (!to || !subject || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    await resend.emails.send({
      from: "HRhub <onboarding@resend.dev>",
      to,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <div style="background: #0d0114; padding: 24px; border-radius: 12px 12px 0 0;">
            <p style="color: #d8bbf6; font-weight: 600; font-size: 18px; margin: 0;">HRhub</p>
          </div>
          <div style="background: #fbf9fd; padding: 24px; border-radius: 0 0 12px 12px;">
            <p style="color: #130422; font-size: 15px; line-height: 1.5;">${message}</p>
            ${
              link
                ? `<a href="${link}" style="display: inline-block; margin-top: 12px; background: #8224e3; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px;">Open HRhub</a>`
                : ""
            }
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Email send failed:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}