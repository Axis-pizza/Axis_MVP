"use server";

import nodemailer from "nodemailer";

export async function sendOtpEmail(email: string) {
  // 6桁のコード生成
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    // DBに保存 (Backend API経由)
    const dbRes = await fetch("https://axis-api.yusukekikuta-05.workers.dev/auth/store-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });

    if (!dbRes.ok) throw new Error("Database error");

    // メール送信
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"Axis Security" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Your Axis Login Code",
      text: `Your verification code is: ${code}`,
      html: `
        <div style="background: #000; padding: 40px; color: #fff; font-family: sans-serif;">
          <div style="max-w-md margin: 0 auto; border: 1px solid #333; padding: 30px; border-radius: 12px;">
            <h2 style="margin: 0 0 20px; font-size: 24px;">Axis Protocol</h2>
            <p style="color: #aaa;">Enter the code below to sign in:</p>
            <div style="background: #111; padding: 20px; font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 8px; border-radius: 8px; margin: 30px 0; color: #10b981;">
              ${code}
            </div>
            <p style="color: #666; font-size: 12px;">This code will expire in 10 minutes.</p>
          </div>
        </div>
      `
    });

    return { success: true };

  } catch (error) {
    console.error("Auth Error:", error);
    return { success: false, message: "Failed to send code." };
  }
}