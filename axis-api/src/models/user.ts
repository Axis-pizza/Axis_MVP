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
  badges?: string; 
  otp_code?: string;
  otp_expires?: number;
  invite_code_used?: string;
  is_existing?: boolean;
  total_xp?: number;
  rank_tier?: string;
  last_checkin?: number;
}

// --- Read Functions ---

export async function findUserByTwitterId(db: D1Database, twitterId: string): Promise<User | null> {
  const user = await db.prepare("SELECT * FROM users WHERE twitter_id = ?").bind(twitterId ?? null).first();
  return user as User | null;
}

export async function findUserByEmail(db: D1Database, email: string): Promise<User | null> {
  const user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email ?? null).first();
  return user as User | null;
}

export async function findUserByWallet(db: D1Database, wallet: string): Promise<User | null> {
    const user = await db.prepare("SELECT * FROM users WHERE wallet_address = ?").bind(wallet ?? null).first();
    return user as User | null;
}

// --- Create Functions ---

export async function createRegisteredUser(
    db: D1Database, 
    id: string, 
    email: string, 
    wallet: string, 
    inviteCode: string, 
    inviteCodeUsed: string, 
    avatarUrl?: string, 
    name?: string, 
    bio?: string
): Promise<void> {
    await db.prepare(
        'INSERT INTO users (id, email, wallet_address, invite_code, invite_code_used, avatar_url, name, bio, total_xp, rank_tier, last_checkin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 500, "Novice", 0)'
      ).bind(
        id ?? null, 
        email ?? null, 
        wallet ?? null, 
        inviteCode ?? null, 
        inviteCodeUsed ?? null, 
        avatarUrl ?? null, 
        name ?? null, 
        bio ?? null
      ).run();
}

export async function createOtpUser(db: D1Database, id: string, email: string, code: string, expires: number): Promise<void> {
    await db.prepare("INSERT INTO users (id, email, otp_code, otp_expires) VALUES (?, ?, ?, ?)")
      .bind(id ?? null, email ?? null, code ?? null, expires ?? null).run();
}

// --- Update Functions ---

export async function updateUser(db: D1Database, wallet: string, updates: { name?: string, bio?: string, avatar_url?: string, badges?: string }): Promise<void> {
    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
        setClauses.push("name = ?");
        values.push(updates.name ?? null);
    }
    if (updates.bio !== undefined) {
        setClauses.push("bio = ?");
        values.push(updates.bio ?? null);
    }
    if (updates.avatar_url !== undefined) {
        setClauses.push("avatar_url = ?");
        values.push(updates.avatar_url ?? null);
    }
    if (updates.badges !== undefined) {
        setClauses.push("badges = ?");
        values.push(updates.badges ?? null);
    }

    if (setClauses.length === 0) return;

    values.push(wallet);

    const query = `UPDATE users SET ${setClauses.join(", ")} WHERE wallet_address = ?`;
    await db.prepare(query).bind(...values).run();
}

export async function updateUserXp(db: D1Database, wallet: string, xp: number, lastCheckin: number): Promise<void> {
    await db.prepare("UPDATE users SET total_xp = ?, last_checkin = ? WHERE wallet_address = ?")
        .bind(xp, lastCheckin, wallet).run();
}

// ★前回不足していた関数を追加
export async function updateUserWalletAndInvite(db: D1Database, email: string, wallet: string | null, inviteCode: string): Promise<void> {
     await db.prepare(
    "UPDATE users SET otp_code = NULL, wallet_address = ?, invite_code_used = ? WHERE email = ?"
  ).bind(wallet ?? null, inviteCode ?? null, email ?? null).run();
}

export async function updateUserOtp(db: D1Database, email: string, code: string, expires: number): Promise<void> {
    await db.prepare("UPDATE users SET otp_code = ?, otp_expires = ? WHERE email = ?")
      .bind(code ?? null, expires ?? null, email ?? null).run();
}