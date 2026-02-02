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
export async function sendBugReportEmail(
  // env に ADMIN_EMAIL は必須ではなくなったので型を簡略化できますが、そのままでも動きます
  env: { EMAIL: SendEmailBinding }, 
  reportData: { user_tg: string; message: string; timestamp: string }
) {
  // ★宛先をここで定数定義（ハードコーディング）
  const TARGET_EMAIL = "yusukekikuta.05@gmail.com";

  try {
    const msg = createMimeMessage();
    
    // 送信元
    msg.setSender({ name: "Kagemusha System", addr: "noreply@axis-protocol.xyz" });
    
    // ★修正点1: 関数呼び出しに変更し、定数を使用
    msg.setRecipient(TARGET_EMAIL);
    
    // 件名
    msg.setSubject(`[SIGNAL] New Report from ${reportData.user_tg}`);
    
    msg.addMessage({
      contentType: 'text/html',
      data: `
        <div style="font-family: 'Courier New', monospace; background-color: #050505; color: #e5e5e5; padding: 40px 20px;">
          <div style="max-width: 600px; margin: 0 auto; border: 1px solid #333; border-radius: 4px; overflow: hidden;">
            
            <div style="background-color: #111; padding: 15px 20px; border-bottom: 1px solid #333; display: flex; align-items: center; justify-content: space-between;">
              <span style="color: #f97316; font-weight: bold; letter-spacing: 2px;">KAGEMUSHA // SIGNAL</span>
              <span style="font-size: 12px; color: #666;">${reportData.timestamp}</span>
            </div>

            <div style="padding: 30px;">
              <div style="margin-bottom: 25px;">
                <p style="margin: 0; color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">SOURCE ID</p>
                <h2 style="margin: 5px 0; font-size: 24px; color: #fff;">${reportData.user_tg}</h2>
                <a href="https://t.me/${reportData.user_tg.replace('@', '')}" style="color: #f97316; text-decoration: none; font-size: 12px;">Open Telegram Profile &rarr;</a>
              </div>

              <hr style="border: 0; border-top: 1px dashed #333; margin: 20px 0;" />

              <div>
                <p style="margin: 0 0 10px 0; color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">DECODED MESSAGE</p>
                <div style="background-color: #000; padding: 15px; border-left: 3px solid #f97316; color: #ddd; white-space: pre-wrap; line-height: 1.6;">${reportData.message}</div>
              </div>
            </div>

            <div style="background-color: #111; padding: 15px; text-align: center; border-top: 1px solid #333;">
              <p style="margin: 0; color: #444; font-size: 10px;">SECURE TRANSMISSION // AXIS PROTOCOL</p>
            </div>
          </div>
        </div>
      `
    });

    // ★修正点2: ここでも同じ定数を使用
    const message = new EmailMessage(
      "noreply@axis-protocol.xyz",
      TARGET_EMAIL, 
      msg.asRaw()
    );

    await env.EMAIL.send(message);
    
    console.log(`Bug report forwarded to ${TARGET_EMAIL}`);
    return true;

  } catch (error) {
    console.error('Error forwarding bug report:', error);
    return false;
  }
}