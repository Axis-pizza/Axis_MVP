export interface SendEmailBinding {
  send: (message: any) => Promise<void>;
}

// @ts-ignore
import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

export async function sendInviteEmail(env: { EMAIL: SendEmailBinding }, to: string, inviteCode: string) {
  try {
    const msg = createMimeMessage();
    msg.setSender({ name: "Axis Protocol", addr: "noreply@axis-protocol.xyz" });
    msg.setRecipient(to);
    msg.setSubject("Welcome to Axis - Your Invite Code");
    
    msg.addMessage({
      contentType: 'text/html',
      data: `
        <div style="font-family: monospace; background-color: #000; color: #fff; padding: 20px;">
          <h1 style="color: #f97316;">Welcome to Axis</h1>
          <p>Your tactical terminal is ready.</p>
          
          <div style="border: 1px solid #333; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; color: #888; font-size: 12px;">YOUR ACCESS CODE</p>
            <h2 style="margin: 10px 0; letter-spacing: 2px;">${inviteCode}</h2>
          </div>

          <p>Share this code to invite other strategists.</p>
          <p style="color: #555; font-size: 12px; margin-top: 40px;">// End of transmission</p>
        </div>
      `
    });

    const message = new EmailMessage(
      "noreply@axis-protocol.xyz",
      to,
      msg.asRaw()
    );

    await env.EMAIL.send(message);
    
    console.log(`Invite email sent to ${to}`);
    return true;

  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
