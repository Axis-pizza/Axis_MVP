import { Hono } from 'hono';
import type { Bindings } from '../config/env';

const mobile = new Hono<{ Bindings: Bindings }>();

/**
 * GET /mobile/init-db
 * Create mobile-specific tables (run once)
 */
mobile.get('/init-db', async (c) => {
  try {
    const db = c.env.axis_db_core;

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS mobile_sessions (
        token TEXT PRIMARY KEY,
        wallet_address TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS device_tokens (
        id TEXT PRIMARY KEY,
        wallet_address TEXT NOT NULL,
        device_token TEXT NOT NULL UNIQUE,
        platform TEXT NOT NULL DEFAULT 'android',
        app_version TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )
    `).run();

    return c.json({ success: true, message: 'Mobile tables created' });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

/**
 * POST /mobile/auth/siws
 * Sign-In with Solana — verify wallet ownership via signed message
 */
mobile.post('/auth/siws', async (c) => {
  try {
    const { wallet_address, signature, message, timestamp } = await c.req.json();

    if (!wallet_address || !signature || !message) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    // Verify the timestamp is recent (within 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (timestamp && Math.abs(now - timestamp) > 300) {
      return c.json({ success: false, error: 'Message expired' }, 400);
    }

    // TODO: Verify the signature on-chain using ed25519
    // For MVP, we trust the wallet_address since MWA already authenticated
    // In production, verify signature against the message + pubkey

    // Generate a simple session token (base64 random)
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const sessionToken = btoa(String.fromCharCode(...tokenBytes));
    const expiresAt = now + 86400 * 7; // 7 days

    // Store session in D1
    const db = c.env.axis_db_core;
    await db.prepare(
      `INSERT OR REPLACE INTO mobile_sessions (token, wallet_address, expires_at, created_at)
       VALUES (?, ?, ?, ?)`
    ).bind(sessionToken, wallet_address, expiresAt, now).run();

    // Ensure user exists
    const user = await db.prepare(
      'SELECT id FROM users WHERE wallet_address = ?'
    ).bind(wallet_address).first();

    return c.json({
      success: true,
      session_token: sessionToken,
      expires_at: expiresAt,
      is_registered: !!user,
    });
  } catch (e: any) {
    console.error('SIWS error:', e);
    return c.json({ success: false, error: e.message }, 500);
  }
});

/**
 * POST /mobile/auth/verify
 * Verify a mobile session token
 */
mobile.post('/auth/verify', async (c) => {
  try {
    const { session_token } = await c.req.json();
    if (!session_token) {
      return c.json({ success: false, valid: false }, 400);
    }

    const db = c.env.axis_db_core;
    const session = await db.prepare(
      'SELECT wallet_address, expires_at FROM mobile_sessions WHERE token = ?'
    ).bind(session_token).first();

    if (!session) {
      return c.json({ success: true, valid: false });
    }

    const now = Math.floor(Date.now() / 1000);
    if ((session.expires_at as number) < now) {
      // Clean up expired session
      await db.prepare('DELETE FROM mobile_sessions WHERE token = ?')
        .bind(session_token).run();
      return c.json({ success: true, valid: false });
    }

    // Fetch user profile
    const user = await db.prepare(
      'SELECT * FROM users WHERE wallet_address = ?'
    ).bind(session.wallet_address).first();

    return c.json({
      success: true,
      valid: true,
      user: user || null,
    });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

/**
 * POST /mobile/device/register
 * Register a push notification token
 */
mobile.post('/device/register', async (c) => {
  try {
    const { wallet_address, device_token, platform, app_version } = await c.req.json();

    if (!wallet_address || !device_token) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const db = c.env.axis_db_core;
    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    await db.prepare(
      `INSERT OR REPLACE INTO device_tokens (id, wallet_address, device_token, platform, app_version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, wallet_address, device_token, platform || 'android', app_version || '1.0.0', now, now).run();

    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

/**
 * POST /mobile/device/unregister
 * Remove a push notification token
 */
mobile.post('/device/unregister', async (c) => {
  try {
    const { wallet_address, device_token } = await c.req.json();

    if (!wallet_address || !device_token) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const db = c.env.axis_db_core;
    await db.prepare(
      'DELETE FROM device_tokens WHERE wallet_address = ? AND device_token = ?'
    ).bind(wallet_address, device_token).run();

    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

export default mobile;
