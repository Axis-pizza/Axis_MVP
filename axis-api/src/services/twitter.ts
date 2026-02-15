import { Context } from "hono";
import { Twitter } from "arctic";
import { setCookie, getCookie } from "hono/cookie";
import { Bindings } from "../config/env";
import * as UserModel from "../models/user";

export async function createTwitterAuth(c: Context<{ Bindings: Bindings }>) {
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
    "offline.access",
  ]);

  const cookieOpts = {
    path: "/",
    secure: true,
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: "Lax" as const,
  };

  setCookie(c, "twitter_oauth_state", state, cookieOpts);
  setCookie(c, "twitter_code_verifier", codeVerifier, cookieOpts);

  // wallet linking: store wallet address if provided
  const wallet = c.req.query("wallet");
  if (wallet) {
    setCookie(c, "twitter_link_wallet", wallet, cookieOpts);
  }

  return c.redirect(url.toString());
}

export async function handleTwitterCallback(c: Context<{ Bindings: Bindings }>) {
  const url = new URL(c.req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const storedState = getCookie(c, "twitter_oauth_state");
  const storedCodeVerifier = getCookie(c, "twitter_code_verifier");
  const linkWallet = getCookie(c, "twitter_link_wallet");

  if (
    !code ||
    !state ||
    !storedState ||
    !storedCodeVerifier ||
    state !== storedState
  ) {
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

    const tokens = await twitter.validateAuthorizationCode(
      code,
      storedCodeVerifier
    );

    const accessToken =
      typeof tokens.accessToken === "function"
        ? tokens.accessToken()
        : tokens.accessToken;

    const response = await fetch(
      "https://api.twitter.com/2/users/me?user.fields=profile_image_url",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `Twitter API Error: ${response.status} ${response.statusText} - ${errText}`
      );
    }

    const twitterUser: any = await response.json();
    const userData = twitterUser.data;

    if (!userData) throw new Error("Failed to fetch user data");

    const twitterId = userData.id;
    const name = userData.name;
    const avatar = userData.profile_image_url?.replace("_normal", "_400x400") || userData.profile_image_url;

    let user: UserModel.User | null = null;

    // Case 1: Wallet linking — update existing wallet user with Twitter data
    if (linkWallet) {
      const existingUser = await UserModel.findUserByWallet(c.env.axis_db, linkWallet);
      if (existingUser) {
        await UserModel.linkTwitterToUser(c.env.axis_db, linkWallet, twitterId, avatar);
        user = { ...existingUser, twitter_id: twitterId, avatar_url: avatar };
      }
    }

    // Case 2: No wallet or wallet user not found — try find by twitter_id
    if (!user) {
      user = await UserModel.findUserByTwitterId(c.env.axis_db, twitterId);
    }

    // Case 3: Completely new Twitter user — create fresh account
    if (!user) {
      const newId = crypto.randomUUID();
      const inviteCode = `AXIS-${Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase()}`;

      try {
        await UserModel.createTwitterUser(
          c.env.axis_db,
          newId,
          twitterId,
          name,
          avatar,
          inviteCode
        );
      } catch (e) {
        console.error("[Error] DB Insert failed:", e);
      }

      user = {
        id: newId,
        twitter_id: twitterId,
        name,
        avatar_url: avatar,
        invite_code: inviteCode,
      } as UserModel.User;
    }

    const safeUser = JSON.stringify(user).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

    const html = `
      <html>
        <head>
          <style>
            body { background: #0a0a0a; color: #e5e5e5; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .card { text-align: center; padding: 40px; }
            .check { width: 48px; height: 48px; margin: 0 auto 16px; background: #1D9BF0; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
            .check svg { width: 24px; height: 24px; fill: white; }
            h2 { font-size: 20px; margin: 0 0 8px; }
            p { color: #888; font-size: 14px; margin: 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="check">
              <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </div>
            <h2>Connected!</h2>
            <p>Closing automatically...</p>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({
                  type: "AXIS_AUTH_SUCCESS",
                  provider: "twitter",
                  user: ${safeUser}
                }, "*");
              }
            } catch(e) { console.error("postMessage failed:", e); }
            setTimeout(function() { window.close(); }, 1500);
          </script>
        </body>
      </html>
    `;

    return c.html(html);
  } catch (e: any) {
    console.error("[Auth Error]", e);
    return c.text(`Twitter Auth Error: ${e.message}`, 500);
  }
}
