export async function sendInviteEmail(to: string, inviteCode: string) {
  try {
    const emailBody = {
      personalizations: [{ 
        to: [{ email: to, name: to }] 
      }],
      from: { 
        email: 'noreply@axis.finance', 
        name: 'Axis Protocol' 
      },
      subject: 'Welcome to Axis - Your Invite Code',
      content: [{
        type: 'text/html',
        value: `
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
      }]
    };

    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(emailBody),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Failed to send email to ${to}: ${response.status} ${text}`);
      throw new Error(`Email send failed: ${text}`);
    }
    
    console.log(`Invite email sent to ${to}`);
    return true;

  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
