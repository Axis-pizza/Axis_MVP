export interface Invite {
  code: string;
  creator_id: string;
  used_by_user_id?: string;
  is_used?: number;
}

const ADMIN_CODES = ['AXIS-9567', 'AXIS-ADMIN'];

export async function findInviteByCode(db: D1Database, code: string): Promise<Invite | null> {
  // Admin bypass: always valid
  if (ADMIN_CODES.includes(code.toUpperCase())) {
    return { code: code.toUpperCase(), creator_id: 'admin' };
  }
  
  // Check invite_codes table (new schema)
  let invite = await db.prepare(
    "SELECT * FROM invite_codes WHERE code = ? AND is_used = 0"
  ).bind(code).first();
  
  if (invite) return invite as unknown as Invite;
  
  // Fallback: check invites table (legacy)
  invite = await db.prepare(
    "SELECT * FROM invites WHERE code = ? AND used_by_user_id IS NULL"
  ).bind(code).first();
  
  return invite as unknown as Invite | null;
}

export async function findAnyInviteByCode(db: D1Database, code: string): Promise<Invite | null> {
  if (ADMIN_CODES.includes(code.toUpperCase())) {
    return { code: code.toUpperCase(), creator_id: 'admin' };
  }
  
  let invite = await db.prepare("SELECT * FROM invite_codes WHERE code = ?").bind(code).first();
  if (invite) return invite as unknown as Invite;
  
  invite = await db.prepare("SELECT * FROM invites WHERE code = ?").bind(code).first();
  return invite as unknown as Invite | null;
}

export async function markInviteUsed(db: D1Database, code: string, userId: string): Promise<void> {
  // Admin codes are never marked as used
  if (ADMIN_CODES.includes(code.toUpperCase())) return;
  
  // Try invite_codes table first
  await db.prepare("UPDATE invite_codes SET is_used = 1, used_by = ? WHERE code = ?")
    .bind(userId, code).run();
  
  // Legacy fallback
  await db.prepare("UPDATE invites SET used_by_user_id = ? WHERE code = ?")
    .bind(userId, code).run();
}

export async function createInvites(db: D1Database, userId: string, count: number = 5): Promise<void> {
  const stmt = db.prepare("INSERT INTO invite_codes (code, creator_id) VALUES (?, ?)");
  const batch = [];
  for (let i = 0; i < count; i++) {
    batch.push(stmt.bind(generateInviteCode(), userId));
  }
  await db.batch(batch);
}

export async function createOneInvite(db: D1Database, creatorId: string): Promise<string> {
    const code = generateInviteCode();
    await db.prepare("INSERT INTO invite_codes (code, creator_id) VALUES (?, ?)").bind(code, creatorId).run();
    return code;
}

export async function findInvitesByCreator(db: D1Database, creatorId: string): Promise<Invite[]> {
  const { results } = await db.prepare(
    "SELECT * FROM invite_codes WHERE creator_id = ?"
  ).bind(creatorId).all();
  return results as unknown as Invite[];
}

function generateInviteCode(): string {
  return `AXIS-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}
