import { Context } from "hono";
import { Bindings } from "../config/env";
import * as UserModel from "../models/user";
import * as InviteModel from "../models/invite";

export async function verifyOtpAndProcessInvite(
  db: D1Database,
  email: string,
  code: string,
  inviteCode: string,
  walletAddress: string
) {
  const now = Math.floor(Date.now() / 1000);
  const user = await UserModel.findUserByEmail(db, email);

  if (!user || user.otp_code !== code || (user.otp_expires && user.otp_expires < now)) {
    throw new Error("Invalid or expired code");
  }

  // Invite code processing (first time only)
  if (!user.wallet_address && inviteCode) {
    if (inviteCode !== "AXIS-ALPHA" && inviteCode !== "AXIS-BETA") {
      const invite = await InviteModel.findInviteByCode(db, inviteCode);
      if (invite) {
        await InviteModel.markInviteUsed(db, inviteCode, user.id);
      }
    }

    // Generate new invites for the user
    await InviteModel.createInvites(db, user.id, 30);
  }

  // Update user wallet and clear OTP
  await UserModel.updateUserWalletAndInvite(db, email, walletAddress || null, inviteCode);
  
  // Fetch updated user to return
  return await UserModel.findUserByEmail(db, email);
}

export async function verifyInviteCode(db: D1Database, code: string) {
    if(!code) return false;
    const invite = await InviteModel.findInviteByCode(db, code);
    return !!invite;
}

export async function verifyUsersInvite(db: D1Database, code: string) {
     if(!code) return false;
     // This seems to look up a user by invite code? Original code: 
     // SELECT id FROM users WHERE invite_code = ?
     // This is checking if the code is a valid referral code belonging to a user (for registration?)
     // Ah, looking at `app.get('/verify', ...)` in index.ts:
     // const result = await c.env.axis_db.prepare('SELECT id FROM users WHERE invite_code = ?').bind(code).first()
     // Yes, 'verify-invite' checks the `invites` table.
     // 'verify' checks the `users` table (referral).
     // Let's implement looking up user by invite code in UserModel if not exists.
     // Adding `findUserByInviteCode` to UserModel would be better but I can do raw query here or add it.
     // Let's assume I should fix the confusion. 
     // `verify-invite` (invites table) -> used for checking if I can use this code to join?
     // `verify` (users table) -> used for checking if the referrer exists?
     
     // Let's keep existing logic.
     const user = await db.prepare('SELECT id FROM users WHERE invite_code = ?').bind(code).first();
     return !!user;
}
