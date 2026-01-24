import { Bindings } from "../config/env";

export interface Invite {
  code: string;
  creator_id: string;
  email?: string;
  used_by_user_id?: string;
  is_used?: number;
}

const ADMIN_CODES = ['AXIS-9567', 'AXIS-ADMIN'];

function generateInviteCode(): string {
  return `AXIS-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

export async function findInviteByCode(db: D1Database, code: string): Promise<Invite | null> {
  if (!code) return null;
  if (ADMIN_CODES.includes(code.toUpperCase())) {
    return { code: code.toUpperCase(), creator_id: 'admin' };
  }
  
  let invite = await db.prepare("SELECT * FROM invite_codes WHERE code = ? AND is_used = 0").bind(code).first();
  if (invite) return invite as unknown as Invite;
  
  try {
    invite = await db.prepare("SELECT * FROM invites WHERE code = ? AND used_by_user_id IS NULL").bind(code).first();
  } catch (e) {
    return null;
  }
  return invite as unknown as Invite | null;
}

export async function findInvitesByCreator(db: D1Database, creatorId: string): Promise<Invite[]> {
  const { results } = await db.prepare("SELECT * FROM invite_codes WHERE creator_id = ?").bind(creatorId).all();
  return results as unknown as Invite[];
}

export async function markInviteUsed(db: D1Database, code: string, userId: string): Promise<void> {
  if (!code || ADMIN_CODES.includes(code.toUpperCase())) return;
  await db.prepare("UPDATE invite_codes SET is_used = 1, used_by = ? WHERE code = ?").bind(userId, code).run();
}

// ★警告が出ていた関数を明示的にエクスポート
export async function createInvites(db: D1Database, userId: string, count: number = 5): Promise<void> {
  const stmt = db.prepare("INSERT INTO invite_codes (code, creator_id, email) VALUES (?, ?, ?)");
  const batch = [];
  for (let i = 0; i < count; i++) {
    batch.push(stmt.bind(generateInviteCode(), userId, 'pending'));
  }
  await db.batch(batch);
}

export async function createOneInvite(db: D1Database, creatorId: string, email?: string): Promise<string> {
  const code = generateInviteCode();
  await db.prepare("INSERT INTO invite_codes (code, creator_id, email) VALUES (?, ?, ?)")
    .bind(code, creatorId ?? 'system', email || null).run();
  return code;
}