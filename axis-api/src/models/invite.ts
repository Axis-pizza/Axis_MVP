export interface Invite {
    code: string;
    creator_id: string;
    used_by_user_id?: string;
  }
  
  export async function findInviteByCode(db: D1Database, code: string): Promise<Invite | null> {
      // Check for unused invite
      const invite = await db.prepare(
          "SELECT * FROM invites WHERE code = ? AND used_by_user_id IS NULL"
        ).bind(code).first();
      return invite as Invite | null;
  }
  
  export async function findAnyInviteByCode(db: D1Database, code: string): Promise<Invite | null> {
      const invite = await db.prepare(
          "SELECT * FROM invites WHERE code = ?"
        ).bind(code).first();
      return invite as Invite | null;
  }
  
  export async function markInviteUsed(db: D1Database, code: string, userId: string): Promise<void> {
      await db.prepare("UPDATE invites SET used_by_user_id = ? WHERE code = ?")
              .bind(userId, code).run();
  }
  
  // ★修正: デフォルト値を10に変更
  export async function createInvites(db: D1Database, userId: string, count: number = 10): Promise<void> {
      const stmt = db.prepare("INSERT INTO invites (code, creator_id) VALUES (?, ?)");
      const batch = [];
      for (let i = 0; i < count; i++) {
          batch.push(stmt.bind(generateInviteCode(), userId));
      }
      await db.batch(batch);
  }
  
  export async function findInvitesByCreator(db: D1Database, creatorId: string): Promise<Invite[]> {
      const { results } = await db.prepare(
          "SELECT * FROM invites WHERE creator_id = ?"
        ).bind(creatorId).all();
      return results as unknown as Invite[];
  }
  
  function generateInviteCode(): string {
      return `AXIS-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }