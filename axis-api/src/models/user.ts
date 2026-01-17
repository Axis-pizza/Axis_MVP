import { Bindings } from "../config/env";

export interface User {
  id: string;
  twitter_id?: string;
  email?: string;
  wallet_address?: string;
  name?: string;
  bio?: string;
  avatar_url?: string;
  invite_code: string;
  referred_by?: string;
  badges?: string; // JSON string
  otp_code?: string;
  otp_expires?: number;
  invite_code_used?: string;
  is_existing?: boolean; // For registration response
}

export async function findUserByTwitterId(db: D1Database, twitterId: string): Promise<User | null> {
  const user = await db.prepare("SELECT * FROM users WHERE twitter_id = ?").bind(twitterId).first();
  return user as User | null;
}

export async function findUserByEmail(db: D1Database, email: string): Promise<User | null> {
  const user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  return user as User | null;
}

export async function findUserByWallet(db: D1Database, wallet: string): Promise<User | null> {
    const user = await db.prepare("SELECT * FROM users WHERE wallet_address = ?").bind(wallet).first();
    return user as User | null;
}

export async function createUser(db: D1Database, user: Partial<User>): Promise<void> {
    // Note: This is an abstraction, specific queries might need separate functions depending on the context (social login vs normal register)
    // For now, let's keep specific insertion logic in the service or specialized model functions if needed.
    // However, looking at the original code, insertion logic varies (twitter, social-login, manual register).
    // Let's create specific functions for those use cases.
    throw new Error("Use specific create functions");   
}

export async function createTwitterUser(db: D1Database, id: string, twitterId: string, name: string, avatar: string, inviteCode: string): Promise<void> {
    await db.prepare(
        "INSERT INTO users (id, twitter_id, name, avatar_url, invite_code) VALUES (?, ?, ?, ?, ?)"
    ).bind(id, twitterId, name, avatar, inviteCode).run();
}

export async function createSocialUser(db: D1Database, id: string, email: string | null, wallet: string | null, inviteCode: string): Promise<void> {
     await db.prepare(
      `INSERT INTO users (id, email, wallet_address, invite_code) VALUES (?, ?, ?, ?)`
    ).bind(id, email, wallet, inviteCode).run();
}

export async function createRegisteredUser(db: D1Database, id: string, email: string, wallet: string, inviteCode: string, referredBy: string, avatarUrl?: string, name?: string, bio?: string): Promise<void> {
    await db.prepare(
        'INSERT INTO users (id, email, wallet_address, invite_code, referred_by, avatar_url, name, bio) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(id, email, wallet, inviteCode, referredBy, avatarUrl || null, name || null, bio || null).run()
}

export async function updateUser(db: D1Database, wallet: string, updates: { name?: string, bio?: string, avatar_url?: string, badges?: string }): Promise<void> {
    await db.prepare(`
        UPDATE users 
        SET name = ?, bio = ?, avatar_url = ?, badges = ?
        WHERE wallet_address = ?
      `).bind(
        updates.name || null, 
        updates.bio || null, 
        updates.avatar_url || null, 
        updates.badges || null,
        wallet
      ).run();
}


export async function updateUserOtp(db: D1Database, email: string, code: string, expires: number): Promise<void> {
    await db.prepare("UPDATE users SET otp_code = ?, otp_expires = ? WHERE email = ?")
      .bind(code, expires, email).run();
}

export async function createOtpUser(db: D1Database, id: string, email: string, code: string, expires: number): Promise<void> {
    await db.prepare("INSERT INTO users (id, email, otp_code, otp_expires) VALUES (?, ?, ?, ?)")
      .bind(id, email, code, expires).run();
}

export async function updateUserWalletAndInvite(db: D1Database, email: string, wallet: string | null, inviteCode: string): Promise<void> {
     await db.prepare(
    "UPDATE users SET otp_code = NULL, wallet_address = ?, invite_code_used = ? WHERE email = ?"
  ).bind(wallet, inviteCode, email).run();
}

export async function updateUserWallet(db: D1Database, id: string, wallet: string): Promise<void> {
    await db.prepare("UPDATE users SET wallet_address = ? WHERE id = ?").bind(wallet, id).run();
}
