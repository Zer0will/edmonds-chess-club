import { SignJWT, jwtVerify } from "jose";
import type { IncomingMessage, ServerResponse } from "node:http";
import { parse as parseCookie, serialize as serializeCookie } from "cookie";

const COOKIE_NAME = "ecc_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: number;
  openId: string;
  name: string;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getJwtSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: ServerResponse, token: string) {
  res.setHeader(
    "Set-Cookie",
    serializeCookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    })
  );
}

export function clearSessionCookie(res: ServerResponse) {
  res.setHeader(
    "Set-Cookie",
    serializeCookie(COOKIE_NAME, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    })
  );
}

export async function getSessionFromRequest(req: IncomingMessage): Promise<SessionPayload | null> {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const cookies = parseCookie(cookieHeader);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  return await verifySession(token);
}

/**
 * Exchange OAuth code with Manus OAuth server for user info.
 * Manus OAuth returns: { openId, name, email }
 */
export async function exchangeOAuthCode(code: string): Promise<{
  openId: string;
  name: string;
  email?: string;
} | null> {
  const oauthServerUrl = process.env.OAUTH_SERVER_URL;
  const appId = process.env.VITE_APP_ID;

  if (!oauthServerUrl || !appId) {
    console.error("[Auth] OAuth env vars missing");
    return null;
  }

  try {
    const url = `${oauthServerUrl.replace(/\/+$/, "")}/api/oauth/exchange`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, app_id: appId }),
    });

    if (!resp.ok) {
      console.error("[Auth] OAuth exchange failed:", resp.status, await resp.text());
      return null;
    }

    const data = (await resp.json()) as {
      open_id?: string;
      openId?: string;
      name?: string;
      email?: string;
      user?: { open_id?: string; openId?: string; name?: string; email?: string };
    };

    const user = data.user ?? data;
    const openId = user.openId ?? user.open_id;
    if (!openId) {
      console.error("[Auth] No openId in OAuth response", data);
      return null;
    }

    return {
      openId,
      name: user.name ?? "Player",
      email: user.email,
    };
  } catch (err) {
    console.error("[Auth] OAuth exchange error:", err);
    return null;
  }
}
