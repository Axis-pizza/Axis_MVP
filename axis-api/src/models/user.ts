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
  is_existing?: boolean;
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

export async function createUser(db: D1Database, user: Partial<User>): Promise<void> {
    throw new Error("Use specific create functions");   
}

export async function createTwitterUser(db: D1Database, id: string, twitterId: string, name: string, avatar: string, inviteCode: string): Promise<void> {
    await db.prepare(
        "INSERT INTO users (id, twitter_id, name, avatar_url, invite_code) VALUES (?, ?, ?, ?, ?)"
    ).bind(id ?? null, twitterId ?? null, name ?? null, avatar ?? null, inviteCode ?? null).run();
}

export async function createSocialUser(db: D1Database, id: string, email: string | null, wallet: string | null, inviteCode: string): Promise<void> {
     await db.prepare(
      `INSERT INTO users (id, email, wallet_address, invite_code) VALUES (?, ?, ?, ?)`
    ).bind(id ?? null, email ?? null, wallet ?? null, inviteCode ?? null).run();
}

// ★一番重要な修正箇所 (undefinedガードを追加)
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
        'INSERT INTO users (id, email, wallet_address, invite_code, invite_code_used, avatar_url, name, bio, total_xp, rank_tier) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 500, "Novice")'
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

// ★修正: 値があるものだけを更新するように変更 (以前のコードだと未指定の項目が消えてしまうため)
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

    // 更新するものがなければ終了
    if (setClauses.length === 0) return;

    values.push(wallet); // WHERE句用

    const query = `UPDATE users SET ${setClauses.join(", ")} WHERE wallet_address = ?`;
    await db.prepare(query).bind(...values).run();
}

export async function updateUserOtp(db: D1Database, email: string, code: string, expires: number): Promise<void> {
    await db.prepare("UPDATE users SET otp_code = ?, otp_expires = ? WHERE email = ?")
      .bind(code ?? null, expires ?? null, email ?? null).run();
}

export async function updateUserWalletAndInvite(db: D1Database, email: string, wallet: string | null, inviteCode: string): Promise<void> {
     await db.prepare(
    "UPDATE users SET otp_code = NULL, wallet_address = ?, invite_code_used = ? WHERE email = ?"
  ).bind(wallet ?? null, inviteCode ?? null, email ?? null).run();
}

export async function updateUserWallet(db: D1Database, id: string, wallet: string): Promise<void> {
    await db.prepare("UPDATE users SET wallet_address = ? WHERE id = ?").bind(wallet ?? null, id ?? null).run();
}