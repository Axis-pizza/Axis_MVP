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

  setCookie(c, "twitter_oauth_state", state, {
    path: "/",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 10, // 10 min
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
}

export async function handleTwitterCallback(c: Context<{ Bindings: Bindings }>) {
  const url = new URL(c.req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const storedState = getCookie(c, "twitter_oauth_state");
  const storedCodeVerifier = getCookie(c, "twitter_code_verifier");

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

    console.log("[Debug] Exchanging authorization code...");
    const tokens = await twitter.validateAuthorizationCode(
      code,
      storedCodeVerifier
    );

    const accessToken =
      typeof tokens.accessToken === "function"
        ? tokens.accessToken()
        : tokens.accessToken;

    console.log(`[Debug] Access Token Length: ${accessToken.length}`);

    console.log("[Debug] Fetching user info...");
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
    const avatar = userData.profile_image_url;

    let user = await UserModel.findUserByTwitterId(c.env.axis_db, twitterId);

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
}
