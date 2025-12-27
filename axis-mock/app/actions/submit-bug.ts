"use server";

import nodemailer from "nodemailer";

export async function submitBugReport(formData: FormData) {
  const discord = formData.get("discord") as string;
  const description = formData.get("description") as string;
  const screenshot = formData.get("screenshot") as File;

  if (!discord || !description) {
    return { success: false, message: "Discord ID and Description are required." };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    let attachments = [];
    if (screenshot && screenshot.size > 0) {
      const buffer = Buffer.from(await screenshot.arrayBuffer());
      attachments.push({
        filename: screenshot.name,
        content: buffer,
      });
    }

    await transporter.sendMail({
      from: `"Axis Bug Reporter" <${process.env.GMAIL_USER}>`,
      to: "yusukekikuta.05@gmail.com",
      subject: `[Bug Report] from ${discord}`,
      text: `
User (Discord): ${discord}

Description:
${description}
      `,
      attachments: attachments,
    });

    return { success: true, message: "Report sent successfully!" };
  } catch (error: any) {
    console.error("Email Error:", error);

    return { success: false, message: "Failed to send email. Check server logs." };
  }
}
