import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Create a simple session token
 */
function createSessionToken(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2);
  const secret = process.env.SESSION_SECRET || "fallback-secret";

  // Simple hash using the secret
  const data = `${timestamp}-${random}-${secret}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return `${timestamp}.${random}.${Math.abs(hash).toString(36)}`;
}

/**
 * Validate a session token
 */
function validateSessionToken(token: string): boolean {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [timestamp] = parts;
  const tokenTime = parseInt(timestamp, 36);
  const now = Date.now();

  // Check if token is expired (7 days)
  if (now - tokenTime > SESSION_MAX_AGE * 1000) {
    return false;
  }

  return true;
}

/**
 * Create an authenticated session
 */
export async function createSession(): Promise<string> {
  const token = createSessionToken();
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return token;
}

/**
 * Check if the current request is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return false;
  }

  return validateSessionToken(sessionCookie.value);
}

/**
 * Destroy the current session
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Validate the admin password
 */
export function validatePassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error("ADMIN_PASSWORD not configured");
    return false;
  }

  return password === adminPassword;
}

/**
 * Middleware helper to check authentication
 */
export function checkAuthMiddleware(request: NextRequest): NextResponse | null {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value || !validateSessionToken(sessionCookie.value)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return null;
}
