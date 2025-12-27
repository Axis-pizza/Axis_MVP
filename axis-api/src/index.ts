import { Buffer } from 'node:buffer';
globalThis.Buffer = Buffer;
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
  Connection, Keypair, PublicKey, clusterApiUrl, Transaction
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
} from "@solana/spl-token";
import bs58 from 'bs58'
import { Twitter } from "arctic";
import { setCookie, getCookie } from 'hono/cookie'
import { GoogleGenerativeAI } from "@google/generative-ai";
import { HTTPException } from 'hono/http-exception'


type Bindings = {
  axis_db: D1Database
  FAUCET_PRIVATE_KEY: string
  GOOGLE_API_KEY: string
  TWITTER_CLIENT_ID: string
  TWITTER_CLIENT_SECRET: string
  FRONTEND_URL: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
}))

const USDC_MINT = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");

app.onError((err, c) => {
  console.error(`[Global Error] ${err.message}`, err);

  if (err instanceof HTTPException) {
    return c.json({
      success: false,
      error: err.message,
    }, err.status);
  }

  return c.json({
    success: false,
    error: 'Internal Server Error',
  }, 500);
});

const STRICT_LIST = [
  // --- Majors ---
  { symbol: "SOL", name: "Wrapped SOL", address: "So11111111111111111111111111111111111111112", logoURI: "https://assets.coingecko.com/coins/images/4128/large/solana.png" },
  { symbol: "USDC", name: "USD Coin", address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", logoURI: "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png" },
  { symbol: "USDT", name: "USDT", address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", logoURI: "https://assets.coingecko.com/coins/images/325/large/Tether.png" },
  { symbol: "WBTC", name: "Wrapped Bitcoin", address: "3NZ9JMVBmGAqocyBIC2c7LQCJScmgsAZ6vQqTDzcqmJh", logoURI: "https://assets.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png" },
  { symbol: "WETH", name: "Wrapped Ethereum", address: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs", logoURI: "https://assets.coingecko.com/coins/images/279/large/ethereum.png" },
  
  // --- DeFi Blue Chips ---
  { symbol: "JUP", name: "Jupiter", address: "JUPyiwrYJFskUPiHa7hkeR8VUtkOp66YWug2yPnTxk3", logoURI: "https://static.jup.ag/jup/icon.png" },
  { symbol: "RAY", name: "Raydium", address: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", logoURI: "https://assets.coingecko.com/coins/images/13928/large/PSigc4ie_400x400.jpg" },
  { symbol: "ORCA", name: "Orca", address: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE", logoURI: "https://assets.coingecko.com/coins/images/17547/large/Orca_Logo.png" },
  { symbol: "PYTH", name: "Pyth Network", address: "HzwqbKZw8RnJC2SHW4Mg8BJyEZ56m47y59ccJeSDexi3", logoURI: "https://assets.coingecko.com/coins/images/31924/large/pyth.png" },
  { symbol: "RENDER", name: "Render", address: "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof", logoURI: "https://assets.coingecko.com/coins/images/11636/large/rndr.png" },
  { symbol: "HNT", name: "Helium", address: "hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux", logoURI: "https://assets.coingecko.com/coins/images/4284/large/Helium_HNT.png" },

  // --- LSTs (Liquid Staking) ---
  { symbol: "mSOL", name: "Marinade Staked SOL", address: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", logoURI: "https://assets.coingecko.com/coins/images/17752/large/mSOL.png" },
  { symbol: "jitoSOL", name: "Jito Staked SOL", address: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", logoURI: "https://s2.coinmarketcap.com/static/img/coins/64x64/22533.png" },
  { symbol: "bSOL", name: "BlazeStake Staked SOL", address: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1", logoURI: "https://s2.coinmarketcap.com/static/img/coins/64x64/28862.png" },

  // --- Top Memes (Major Only) ---
  { symbol: "BONK", name: "Bonk", address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", logoURI: "https://assets.coingecko.com/coins/images/28600/large/bonk.jpg" },
  { symbol: "WIF", name: "dogwifhat", address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", logoURI: "https://assets.coingecko.com/coins/images/33566/large/dogwifhat.jpg" },
  { symbol: "POPCAT", name: "Popcat", address: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", logoURI: "https://s2.coinmarketcap.com/static/img/coins/64x64/28782.png" }
];


const TOKEN_CONTEXT_STR = STRICT_LIST.map(t => `- ${t.symbol} (${t.name})`).join("\n");

const SYSTEM_PROMPT = `
You are "Axis AI", an expert DeFi Portfolio Architect.
Your goal is to guide the user through a 4-step process to create an on-chain Index Fund (Vault).

### AVAILABLE TOKENS
${TOKEN_CONTEXT_STR}

### CONSTRAINTS
- **Management Fee:** FIXED at 0.95% (Do not ask).
- **Min Liquidity:** Default $1,000.
- **Composition:** Must sum to exactly 100%.

### PROCESS FLOW (Follow strictly)
1. **PHASE 1 (Identity):** If "name" or "symbol" is missing, ask for them. Ask the user to upload a logo if missing.
2. **PHASE 2 (Strategy):** If "description" is missing, ask for their investment thesis (e.g. "High risk Solana", "Stablecoins").
3. **PHASE 3 (Composition & Rebalance):** - Based on the strategy, **YOU MUST GENERATE** a portfolio composition from the "AVAILABLE TOKENS" list.
   - Ask for the "Rebalance Threshold" (e.g. 1% to 5%).
4. **PHASE 4 (Finalize):** - Once composition and rebalance are set, show the preview.
   - Set "uiAction": "SHOW_PREVIEW".

### RESPONSE JSON FORMAT
{
  "message": "Your conversational response...",
  "data": {
    "name": "...",
    "symbol": "...",
    "description": "...",
    "composition": [
      { "token": { "symbol": "SOL", "name": "Wrapped SOL", "logoURI": "..." }, "weight": 50 },
      ...
    ],
    "strategy": { "fee": 0.95, "rebalance": 2.5 }
  },
  "uiAction": "NONE" | "REQUEST_LOGO" | "SHOW_PREVIEW"
}
`;



app.get('/auth/twitter', async (c) => {
  const clientId = c.env.TWITTER_CLIENT_ID.trim();
  const clientSecret = c.env.TWITTER_CLIENT_SECRET.trim();

  const twitter = new Twitter(
    clientId,
    clientSecret,
    `${new URL(c.req.url).origin}/auth/twitter/callback`
  );

  const state = crypto.randomUUID();
  const codeVerifier = crypto.randomUUID();

  const url = await twitter.createAuthorizationURL(state, codeVerifier, [
    "users.read", 
    "tweet.read", 
    "offline.access"
  ]);

  setCookie(c, "twitter_oauth_state", state, {
    path: "/",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 10, // 10分
    sameSite: "Lax",
  });
  
  setCookie(c, "twitter_code_verifier", codeVerifier, {
    path: "/",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: "Lax",
  });

  return c.redirect(url.toString());
});

app.get('/auth/twitter/callback', async (c) => {
  const url = new URL(c.req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  
  const storedState = getCookie(c, "twitter_oauth_state");
  const storedCodeVerifier = getCookie(c, "twitter_code_verifier");

  if (!code || !state || !storedState || !storedCodeVerifier || state !== storedState) {
    return c.text("Authentication failed: Invalid state", 400);
  }

  try {
    const clientId = c.env.TWITTER_CLIENT_ID.trim();
    const clientSecret = c.env.TWITTER_CLIENT_SECRET.trim();

    const twitter = new Twitter(
      clientId,
      clientSecret,
      `${url.origin}/auth/twitter/callback`
    );

    console.log("[Debug] Exchanging authorization code...");
    const tokens = await twitter.validateAuthorizationCode(code, storedCodeVerifier);
    
    const accessToken = typeof tokens.accessToken === 'function' 
        ? tokens.accessToken() 
        : tokens.accessToken;

    console.log(`[Debug] Access Token Length: ${accessToken.length}`);
    
    console.log("[Debug] Fetching user info...");
    const response = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Twitter API Error: ${response.status} ${response.statusText} - ${errText}`);
    }

    const twitterUser: any = await response.json();
    const userData = twitterUser.data;

    if (!userData) throw new Error("Failed to fetch user data");

    // --- DB保存ロジック (変更なし) ---
    const twitterId = userData.id;
    const name = userData.name;
    const avatar = userData.profile_image_url;

    let user: any = null;
    try {
        user = await c.env.axis_db.prepare("SELECT * FROM users WHERE twitter_id = ?").bind(twitterId).first();
    } catch (e) {
        console.warn("[Warn] twitter_id column missing or DB error");
    }

    if (!user) {
      const newId = crypto.randomUUID();
      const inviteCode = `AXIS-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      try {
          await c.env.axis_db.prepare(
            "INSERT INTO users (id, twitter_id, name, avatar_url, invite_code) VALUES (?, ?, ?, ?, ?)"
          ).bind(newId, twitterId, name, avatar, inviteCode).run();
      } catch(e) {
           console.error("[Error] DB Insert failed:", e);
      }

      user = { id: newId, twitter_id: twitterId, name, avatar_url: avatar, invite_code: inviteCode };
    }

    const html = `
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: "AXIS_AUTH_SUCCESS",
              provider: "twitter",
              user: ${JSON.stringify(user)}
            }, "${c.env.FRONTEND_URL}");
            window.close();
          </script>
          <p>Authentication successful. Closing...</p>
        </body>
      </html>
    `;

    return c.html(html);

  } catch (e: any) {
    console.error("[Auth Error]", e);
    return c.text(`Twitter Auth Error: ${e.message}`, 500);
  }
});

app.post('/chat', async (c) => {
  try {
    const { history, currentState } = await c.req.json();
    const apiKey = c.env.GOOGLE_API_KEY;

    if (!apiKey) return c.json({ message: "API Key missing", uiAction: "NONE", data: {} });

    // 1. 履歴整形
    let chatHistory = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));
    if (chatHistory.length > 0 && chatHistory[0].role === 'model') chatHistory.shift();

    const lastUserMessage = chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'user' 
      ? chatHistory.pop() 
      : { parts: [{ text: "Start creation process." }] };

    const promptText = lastUserMessage.parts[0].text;

    // 2. プロンプト生成 (トークン情報の補完ロジック付き)
    // フロントエンドから渡されるcompositionには詳細がない場合があるため、AIが補完しやすいようにする
    const fullState = {
      ...currentState,
      available_tokens: STRICT_LIST.map(t => t.symbol).join(", ") // ヒントとして渡す
    };

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash", 
        systemInstruction: SYSTEM_PROMPT.replace("{{CURRENT_STATE}}", JSON.stringify(fullState)),
        generationConfig: { responseMimeType: "application/json" }
    });

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(promptText);
    const responseText = result.response.text();
    
    const parsed = JSON.parse(responseText);

    // ★重要: AIが選んだトークンシンボルを、完全なオブジェクト情報(address, logoURI等)に置換する補正処理
    if (parsed.data && parsed.data.composition) {
      parsed.data.composition = parsed.data.composition.map((item: any) => {
        // シンボル名から元の詳細データを検索
        const fullToken = STRICT_LIST.find(t => t.symbol === item.token.symbol) || STRICT_LIST[0];
        return {
          token: fullToken, // 完全な情報をセット
          weight: item.weight
        };
      });
    }

    return c.json(parsed);

  } catch (e: any) {
    console.error("AI Error:", e);
    return c.json({ 
      message: `System Error: ${e.message}`, 
      uiAction: "NONE", 
      data: {} 
    });
  }
});


app.post('/auth/social-login', async (c) => {
  try {
    const { provider, email, wallet_address, google_id, twitter_id } = await c.req.json();
    
    // 必須チェック
    if (!provider) return c.json({ error: "Provider required" }, 400);

    let user: any = null;

    // 1. 既存ユーザー検索
    if (provider === 'solana' && wallet_address) {
      user = await c.env.axis_db.prepare("SELECT * FROM users WHERE wallet_address = ?").bind(wallet_address).first();
    } 
    else if (provider === 'google' && email) {
      user = await c.env.axis_db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
    }
    // Twitterは今回は簡易的にemailがあればそれで検索、なければID管理などが一般的
    else if (provider === 'twitter' && email) {
      user = await c.env.axis_db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
    }

    // 2. ユーザーが存在する場合 -> そのまま返す (Login)
    if (user) {
      // (オプション) 情報が足りなければ補完する処理をここに書く
      // 例: Googleで登録済みだがWalletがない場合に埋めるなど
      if (provider === 'solana' && !user.wallet_address) {
         await c.env.axis_db.prepare("UPDATE users SET wallet_address = ? WHERE id = ?").bind(wallet_address, user.id).run();
         user.wallet_address = wallet_address;
      }
      return c.json({ success: true, isNew: false, user });
    }

    // 3. ユーザーが存在しない場合 -> 新規作成 (Sign Up)
    const newId = crypto.randomUUID();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newInviteCode = `AXIS-${randomSuffix}`; // 自動発行

    await c.env.axis_db.prepare(
      `INSERT INTO users (id, email, wallet_address, invite_code) VALUES (?, ?, ?, ?)`
    ).bind(
      newId, 
      email || null, 
      wallet_address || null, 
      newInviteCode
    ).run();

    const newUser = {
      id: newId,
      email: email || null,
      wallet_address: wallet_address || null,
      invite_code: newInviteCode
    };

    return c.json({ success: true, isNew: true, user: newUser });

  } catch (e: any) {
    console.error("Social Auth Error:", e);
    return c.json({ success: false, error: e.message }, 500);
  }
});


// --- Auth & Invite Endpoints ---

// 1. Verify Invite Code (DB Check)
app.get('/verify-invite', async (c) => {
  const code = c.req.query('code');
  if (!code) return c.json({ valid: false });

  // 未使用のコードがあるかチェック
  const invite: any = await c.env.axis_db.prepare(
    "SELECT * FROM invites WHERE code = ? AND used_by_user_id IS NULL"
  ).bind(code).first();
  
  if (invite) {
    return c.json({ valid: true });
  } else {
    return c.json({ valid: false }, 400);
  }
});
/**
 * 1. 招待コード確認API
 */
app.get('/verify', async (c) => {
  const code = c.req.query('code')
  
  if (!code) {
    return c.json({ valid: false, message: 'Code required' }, 400)
  }

  const result = await c.env.axis_db.prepare('SELECT id FROM users WHERE invite_code = ?')
    .bind(code)
    .first()

  if (result) {
    return c.json({ valid: true })
  } else {
    return c.json({ valid: false, message: 'Invalid code' }, 404)
  }
})

app.post('/auth/store-otp', async (c) => {
  const { email, code } = await c.req.json();
  const expires = Math.floor(Date.now() / 1000) + 600; // 10分間有効
  
  // ユーザーが存在するか確認
  const existing: any = await c.env.axis_db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  
  if (existing) {
    // 既存ユーザーならOTP更新
    await c.env.axis_db.prepare("UPDATE users SET otp_code = ?, otp_expires = ? WHERE email = ?")
      .bind(code, expires, email).run();
  } else {
    // 新規ユーザーなら作成 (ID発行)
    const id = crypto.randomUUID();
    await c.env.axis_db.prepare("INSERT INTO users (id, email, otp_code, otp_expires) VALUES (?, ?, ?, ?)")
      .bind(id, email, code, expires).run();
  }

  return c.json({ success: true });
});


app.post('/auth/verify-otp', async (c) => {
  const { email, code, inviteCode, walletAddress } = await c.req.json();
  const now = Math.floor(Date.now() / 1000);

  const user: any = await c.env.axis_db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();

  if (!user || user.otp_code !== code || user.otp_expires < now) {
    return c.json({ success: false, message: "Invalid or expired code" }, 400);
  }

  // ★ 招待コードの消費 & 新規コード発行 (初回のみ)
  if (!user.wallet_address && inviteCode) {
    // 初期ADMINコードの場合は消費しない
    if (inviteCode !== 'AXIS-ALPHA' && inviteCode !== 'AXIS-BETA') {
        const invite: any = await c.env.axis_db.prepare(
          "SELECT * FROM invites WHERE code = ? AND used_by_user_id IS NULL"
        ).bind(inviteCode).first();

        if (invite) {
          // 消費
          await c.env.axis_db.prepare("UPDATE invites SET used_by_user_id = ? WHERE code = ?")
            .bind(user.id, inviteCode).run();
        }
    }

    // 30個の招待コードを新規発行
    const stmt = c.env.axis_db.prepare("INSERT INTO invites (code, creator_id) VALUES (?, ?)");
    const batch = [];
    for (let i = 0; i < 30; i++) {
      batch.push(stmt.bind(generateInviteCode(), user.id));
    }
    await c.env.axis_db.batch(batch);
  }

  // ユーザー情報更新
  await c.env.axis_db.prepare(
    "UPDATE users SET otp_code = NULL, wallet_address = ?, invite_code_used = ? WHERE email = ?"
  ).bind(walletAddress || null, inviteCode, email).run();

  return c.json({ success: true, user });
});

app.get('/my-invites', async (c) => {
  const email = c.req.query('email');
  if(!email) return c.json([]);

  const user: any = await c.env.axis_db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if(!user) return c.json([]);

  const { results } = await c.env.axis_db.prepare(
    "SELECT * FROM invites WHERE creator_id = ?"
  ).bind(user.id).all();

  return c.json(results);
});

async function fetchWithTimeout(resource: string, options: any = {}) {
  const { timeout = 5000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal  
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

app.get('/tokens', (c) => {
  // 外部APIには行かず、メモリ上のリストを返すだけなので爆速
  console.log(`[Axis Internal] Returning ${STRICT_LIST.length} curated tokens.`);
  return c.json(STRICT_LIST);
});

app.get('/vaults', async (c) => {
  try {
    const { results } = await c.env.axis_db.prepare("SELECT * FROM vaults ORDER BY created_at DESC").all();
    
    // DBに保存されたJSON文字列をオブジェクトに戻す
    const vaults = results.map((v: any) => ({
      ...v,
      composition: v.composition ? JSON.parse(v.composition) : []
    }));

    return c.json(vaults);
  } catch (e: any) {
    console.error("Fetch Vaults Error:", e);
    return c.json({ error: e.message }, 500);
  }
});

// 3. Create New Vault (Save to DB)
app.post('/vaults', async (c) => {
  try {
    const body = await c.req.json();
    
    // 分割代入で受け取る（フロントエンドのpayloadと一致させる）
    const { 
      name, 
      symbol, 
      description, 
      creator, 
      strategy,      // フロントからは "Weekly" などの文字列が来る想定
      fee, 
      minLiquidity, 
      composition,   // 配列
      imageUrl 
    } = body;

    // 必須項目の簡易バリデーション
    if (!name || !creator || !composition) {
      return c.json({ success: false, error: "Missing required fields" }, 400);
    }

    const id = crypto.randomUUID();

    // D1へ保存
    await c.env.axis_db.prepare(`
      INSERT INTO vaults (
        id, name, symbol, description, creator, 
        strategy_type, management_fee, min_liquidity, composition, image_url
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, 
      name, 
      symbol, 
      description || "", 
      creator, 
      strategy || 'Weekly',  // デフォルト値
      fee || 0.95, 
      minLiquidity || 1000, 
      JSON.stringify(composition), // 配列を文字列化して保存
      imageUrl || null
    ).run();

    return c.json({ success: true, id });

  } catch (e: any) {
    console.error("Create Vault Error:", e);
    return c.json({ success: false, error: e.message }, 500);
  }
});

/**
 * 2. Faucet API (Claim USDC)
 */
app.post("/claim", async (c) => {
  const { wallet_address } = await c.req.json();
  if (!wallet_address) return c.json({ error: "Wallet address required" }, 400);

  try {
    const secret = bs58.decode(c.env.FAUCET_PRIVATE_KEY);
    const adminKeypair = Keypair.fromSecretKey(secret);

    const connection = new Connection(clusterApiUrl("devnet"), "processed");
    const userPublicKey = new PublicKey(wallet_address);

    const adminTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      adminKeypair,
      USDC_MINT,
      adminKeypair.publicKey
    );

    const userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      adminKeypair,
      USDC_MINT,
      userPublicKey
    );

    const amount = 1000 * 1_000_000;

    // ✅ tx を自前で作る
    const tx = new Transaction().add(
      createTransferInstruction(
        adminTokenAccount.address,
        userTokenAccount.address,
        adminKeypair.publicKey,
        amount
      )
    );

    // ✅ 最新 blockhash を明示
    const latest = await connection.getLatestBlockhash("processed");
    tx.recentBlockhash = latest.blockhash;
    tx.feePayer = adminKeypair.publicKey;
    tx.sign(adminKeypair);

    // ✅ 送信は confirm しない（= ここで待たない）
    const sig = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });

    // ✅ confirm は裏でベストエフォート（失敗してもレスポンスに影響させない）
    c.executionCtx.waitUntil(
      (async () => {
        try {
          await connection.confirmTransaction(
            { signature: sig, ...latest },
            "confirmed"
          );
        } catch (e) {
          console.warn("confirm failed (non-fatal):", e);
        }
      })()
    );

    return c.json({ success: true, signature: sig, message: "Sent 1,000 USDC (Devnet)" });
  } catch (e: any) {
    console.error(e);
    return c.json({ error: "Transfer failed: " + e.message }, 500);
  }
});

/**
 * 3. ユーザー登録API
 */
app.post('/register', async (c) => {
  try {
    const { email, wallet_address, invite_code_used } = await c.req.json()

    if (!email || !wallet_address || !invite_code_used) {
      return c.json({ error: 'Missing fields' }, 400)
    }

    // A. 招待コード確認
    const referrer = await c.env.axis_db.prepare('SELECT id FROM users WHERE invite_code = ?')
      .bind(invite_code_used)
      .first()

    if (!referrer) {
      return c.json({ error: 'Invalid invite code' }, 400)
    }

    // B. 重複確認
    const existing = await c.env.axis_db.prepare('SELECT id, invite_code FROM users WHERE email = ? OR wallet_address = ?')
      .bind(email, wallet_address)
      .first()

    if (existing) {
      return c.json({ 
        success: true, 
        user: { 
          id: existing.id, 
          invite_code: existing.invite_code,
          is_existing: true 
        } 
      })
    }

    // C. 新規登録
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    const newInviteCode = `AXIS-${randomSuffix}`
    const newId = crypto.randomUUID()

    await c.env.axis_db.prepare(
      'INSERT INTO users (id, email, wallet_address, invite_code, referred_by) VALUES (?, ?, ?, ?, ?)'
    ).bind(newId, email, wallet_address, newInviteCode, invite_code_used).run()

    return c.json({ 
      success: true, 
      user: { 
        id: newId, 
        invite_code: newInviteCode,
        is_existing: false
      } 
    })

  } catch (e) {
    console.error(e)
    return c.json({ error: 'Internal Server Error' }, 500)
  }
})

app.get('/user', async (c) => {
  const wallet = c.req.query('wallet');
  
  if (!wallet) {
    return c.json({ error: 'Wallet address required' }, 400);
  }

  try {
    const user: any = await c.env.axis_db.prepare(
      "SELECT * FROM users WHERE wallet_address = ?"
    ).bind(wallet).first();

    if (!user) {
      // ユーザーがいない場合はnullを返す（フロント側で空のプロファイルとして扱う）
      return c.json({}); 
    }

    // DBのカラム(snake_case)をフロントエンドの期待する形式(camelCase等)に変換して返す
    return c.json({
      username: user.name,
      bio: user.bio,
      pfpUrl: user.avatar_url,
      badges: user.badges ? JSON.parse(user.badges) : []
    });

  } catch (e: any) {
    console.error("Fetch User Error:", e);
    return c.json({ error: e.message }, 500);
  }
});

/**
 * 5. ユーザープロファイル更新 (POST)
 * フロントエンドからのリクエスト: POST /user
 */
app.post('/user', async (c) => {
  let body;
  
  // A. JSONパースエラーのハンドリング
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ success: false, error: 'Invalid JSON format' }, 400);
  }

  const { wallet_address, name, bio, avatar_url, badges } = body;

  // B. 必須パラメータのチェック (バリデーション)
  if (!wallet_address || typeof wallet_address !== 'string') {
    return c.json({ success: false, error: 'Wallet address is required and must be a string' }, 400);
  }

  // 文字数制限などの簡易バリデーション (DBエラーを防ぐ)
  if (name && name.length > 50) {
    return c.json({ success: false, error: 'Username must be 50 characters or less' }, 400);
  }
  if (bio && bio.length > 200) {
    return c.json({ success: false, error: 'Bio must be 200 characters or less' }, 400);
  }

  try {
    // C. ユーザー存在確認
    const existing: any = await c.env.axis_db.prepare(
      "SELECT id FROM users WHERE wallet_address = ?"
    ).bind(wallet_address).first();

    if (!existing) {
      // 存在しないユーザーの更新は 404
      return c.json({ success: false, error: "User not found. Please register first." }, 404);
    }

    // D. DB更新処理
    // badgesは配列で来る可能性があるので、文字列化して保存
    const badgesStr = Array.isArray(badges) ? JSON.stringify(badges) : (badges || null);

    await c.env.axis_db.prepare(`
      UPDATE users 
      SET name = ?, bio = ?, avatar_url = ?, badges = ?
      WHERE wallet_address = ?
    `).bind(
      name || null, 
      bio || null, 
      avatar_url || null, 
      badgesStr,
      wallet_address
    ).run();

    return c.json({ success: true, message: "Profile updated successfully" });

  } catch (e: any) {
    // E. データベース固有のエラーハンドリング
    console.error("[DB Error]", e);
    
    // 特定のDBエラー (例: 一意制約違反など) を判定してメッセージを変えることも可能
    if (e.message.includes('UNIQUE constraint failed')) {
      return c.json({ success: false, error: 'This username is already taken' }, 409); // Conflict
    }

    // それ以外は 500 として投げる (onErrorでキャッチされる)
    throw new HTTPException(500, { message: 'Database operation failed' });
  }
});

export default app