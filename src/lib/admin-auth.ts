import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "special_affair_admin";
const SESSION_SECONDS = 60 * 60 * 8;

function adminConfig() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!email || !password || !secret) return null;
  return { email, password, secret };
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function matches(left: string, right: string) {
  return timingSafeEqual(digest(left), digest(right));
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function adminIsConfigured() {
  return adminConfig() !== null;
}

export function authenticateAdmin(email: string, password: string) {
  const config = adminConfig();
  if (!config) return null;

  const normalizedEmail = email.trim().toLowerCase();
  const emailMatches = matches(normalizedEmail, config.email);
  const passwordMatches = matches(password, config.password);
  if (!emailMatches || !passwordMatches) {
    return null;
  }

  return config.email;
}

function createSessionToken(email: string) {
  const config = adminConfig();
  if (!config) throw new Error("Admin access is not configured.");

  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = Buffer.from(email + ":" + expires).toString("base64url");
  return payload + "." + signature(payload, config.secret);
}

function verifySessionToken(token: string) {
  const config = adminConfig();
  if (!config) return null;

  const [payload, suppliedSignature, ...rest] = token.split(".");
  if (!payload || !suppliedSignature || rest.length) return null;
  if (!matches(suppliedSignature, signature(payload, config.secret))) return null;

  let decoded: string;
  try {
    decoded = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const separator = decoded.lastIndexOf(":");
  if (separator < 1) return null;
  const email = decoded.slice(0, separator);
  const expires = Number(decoded.slice(separator + 1));

  if (!Number.isFinite(expires) || expires <= Date.now() / 1000) return null;
  return matches(email, config.email) ? email : null;
}

export async function readAdminSession() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return token ? verifySessionToken(token) : null;
}

export async function startAdminSession(email: string) {
  (await cookies()).set(ADMIN_COOKIE, createSessionToken(email), {
    httpOnly: true,
    maxAge: SESSION_SECONDS,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function endAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}
