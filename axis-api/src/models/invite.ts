export interface Invite {
  code: string;
  creator_id: string;
  email?: string;
  used_by_user_id?: string;
  is_used?: number;
}

const ADMIN_CODES = ['AXIS-9567', 'AXIS-ADMIN'];

export async function findInviteByCode(db: D1Database, code: string): Promise<Invite | null> {
  // code が undefined なら即 null を返す（DBに問い合わせない）
  if (!code) return null;

  if (ADMIN_CODES.includes(code.toUpperCase())) {
    return { code: code.toUpperCase(), creator_id: 'admin' };
  }
  
  // bind(code ?? null) でガード
  let invite = await db.prepare(
    "SELECT * FROM invite_codes WHERE code = ? AND is_used = 0"
  ).bind(code ?? null).first();
  
  if (invite) return invite as unknown as Invite;
  
  // Fallback (legacy)
  try {
    invite = await db.prepare(
      "SELECT * FROM invites WHERE code = ? AND used_by_user_id IS NULL"
    ).bind(code ?? null).first();
  } catch (e) {
    return null;
  }
  
  return invite as unknown as Invite | null;
}

export async function findAnyInviteByCode(db: D1Database, code: string): Promise<Invite | null> {
  if (!code) return null;

  if (ADMIN_CODES.includes(code.toUpperCase())) {
    return { code: code.toUpperCase(), creator_id: 'admin' };
  }
  
  let invite = await db.prepare("SELECT * FROM invite_codes WHERE code = ?").bind(code ?? null).first();
  if (invite) return invite as unknown as Invite;
  
  try {
    invite = await db.prepare("SELECT * FROM invites WHERE code = ?").bind(code ?? null).first();
  } catch (e) {
    return null;
  }

  return invite as unknown as Invite | null;
}

export async function markInviteUsed(db: D1Database, code: string, userId: string): Promise<void> {
  if (!code || ADMIN_CODES.includes(code.toUpperCase())) return;
  
  // used_by_id と code にガードを追加
  await db.prepare("UPDATE invite_codes SET is_used = 1, used_by_id = ? WHERE code = ?")
    .bind(userId ?? null, code ?? null).run();
  
  // Legacy fallback
  try {
    await db.prepare("UPDATE invites SET used_by_user_id = ? WHERE code = ?")
      .bind(userId ?? null, code ?? null).run();
  } catch (e) {
    // legacy table missing ignored
  }
}

export async function createInvites(db: D1Database, userId: string, count: number = 5): Promise<void> {
  const stmt = db.prepare("INSERT INTO invite_codes (code, creator_id, email) VALUES (?, ?, ?)");
  const batch = [];
  for (let i = 0; i < count; i++) {
    // userId が undefined でも null に変換
    batch.push(stmt.bind(generateInviteCode(), userId ?? null, 'pending'));
  }
  await db.batch(batch);
}

// ★ここが一番怪しい箇所でした。引数すべてに ?? null を追加
export async function createOneInvite(db: D1Database, creatorId: string, email: string): Promise<string> {
  const code = generateInviteCode();

  // email が undefined や null の場合の保険 (safeEmail)
  const safeEmail = email || 'unknown-pending';

  await db.prepare("INSERT INTO invite_codes (code, creator_id, email) VALUES (?, ?, ?)")
    .bind(
      code, 
      creatorId ?? 'system', 
      safeEmail // ★ここで受け取った email をセット！
    ).run();
  
  return code;
}

export async function findInvitesByCreator(db: D1Database, creatorId: string): Promise<Invite[]> {
  const { results } = await db.prepare(
    "SELECT * FROM invite_codes WHERE creator_id = ?"
  ).bind(creatorId ?? null).all();
  return results as unknown as Invite[];
}

function generateInviteCode(): string {
  return `AXIS-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}