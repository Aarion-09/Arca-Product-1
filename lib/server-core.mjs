import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import {
  VERSION, OPERATOR, ADMIN_EMAIL, SESSION_DAYS, FOUNDING_LIMIT,
  UPLOAD, PAYMENTS_OPEN, APP_ORIGIN, IS_PRODUCTION,
  cleanCountry, operatorConfigured, MINIMUM_AGE,
} from "./config.mjs";
import {
  clean, cleanEmail, validEmail, safeUrl, hash, newToken, isToken,
  passwordHash, passwordMatches, passwordProblem,
  ageFromDateOfBirth, meetsMinimumAge,
  rateLimit, cookieMap, sessionCookie, isSecureRequest, sameOrigin,
  badRequest, unauthorized, forbidden, notFound, httpError,
} from "./security.mjs";
import { MemoryStore, publicUser } from "./store-memory.mjs";
import { createMySQLStore } from "./store-mysql.mjs";
import { deliver, verificationEmail, resetEmail, smtpConfigured } from "./mailer.mjs";
import { saveImage, removeImage } from "./uploads.mjs";
import { renderLegalPage, LEGAL_DOCS, LEGAL_UPDATED } from "./legal.mjs";
import { isKnownPath, metaFor, sitemap, robots, PUBLIC_PAGES } from "./routes.mjs";

const ROOT = fileURLToPath(new URL("../public/", import.meta.url));

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const SESSION_MS = SESSION_DAYS * 86_400_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function safeAssetPath(url = "/") {
  let pathname;
  try {
    pathname = decodeURIComponent(String(url).split("?")[0]);
  } catch {
    return join(ROOT, "index.html");
  }
  if (pathname.includes("\0")) return join(ROOT, "index.html");
  const candidate = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const resolved = normalize(join(ROOT, candidate));
  // Compare with a trailing separator so "/public-evil" cannot pass as "/public".
  return resolved === normalize(ROOT).replace(/[\\/]+$/, "") || resolved.startsWith(normalize(ROOT))
    ? resolved
    : join(ROOT, "index.html");
}

function json(response, status, body, headers = {}) {
  response.writeHead(status, {
    "Content-Type": TYPES[".json"],
    "Cache-Control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function originOf(request) {
  const host = request.headers.host;
  if (host && /^[a-z0-9.-]+(?::\d+)?$/i.test(host)) {
    return `${isSecureRequest(request) ? "https" : "http"}://${host}`;
  }
  return APP_ORIGIN || "http://localhost:3000";
}

async function readBody(request, limit = UPLOAD.maxRequestBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > limit) throw httpError(413, "That upload is too large.");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw badRequest("We could not read that request.");
  }
}

function contentSecurityPolicy() {
  const analytics = process.env.ANALYTICS_DOMAIN ? " " + (process.env.ANALYTICS_SRC || "https://plausible.io") : "";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src 'self'" + analytics,
    "style-src 'self'",
    "img-src 'self' data: blob:",
    "media-src 'self'",
    "font-src 'self'",
    "connect-src 'self'" + analytics,
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function setSecurityHeaders(response) {
  response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()");
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  response.setHeader("Content-Security-Policy", contentSecurityPolicy());
  response.setHeader("X-Robots-Tag", "noai, noimageai");
}

const sessionOptions = (request) => ({
  maxAge: SESSION_DAYS * 86_400,
  secure: isSecureRequest(request) || IS_PRODUCTION,
});

async function startSession(store, request, response, userId) {
  const token = newToken();
  await store.createSession(userId, token, Date.now() + SESSION_MS);
  return sessionCookie(token, sessionOptions(request));
}

// ---------------------------------------------------------------------------
// Store selection
// ---------------------------------------------------------------------------

async function makeStore() {
  if (!process.env.DB_NAME) {
    console.warn("[store] DB_NAME not set — using in-memory storage. Data will not persist.");
    const store = new MemoryStore();
    await store.init();
    return store;
  }
  return createMySQLStore();
}

// ---------------------------------------------------------------------------
// Google OAuth (optional)
// ---------------------------------------------------------------------------

async function googleOauth(request, response, store, url) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return json(response, 503, {
      error: "Google sign-in is not enabled yet. Please use your email address and a password.",
    });
  }
  const origin = originOf(request);
  const redirect = `${origin}/api/oauth/google/callback`;

  if (url.pathname.endsWith("/start")) {
    const state = newToken().slice(0, 36);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirect,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });
    response.writeHead(302, {
      Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      "Set-Cookie": `arca_oauth=${state}; Path=/; HttpOnly; ${
        isSecureRequest(request) ? "Secure; " : ""
      }SameSite=Lax; Max-Age=600`,
    });
    return response.end();
  }

  const expected = cookieMap(request.headers.cookie).arca_oauth;
  if (!expected || expected !== url.searchParams.get("state")) {
    return json(response, 400, { error: "That sign-in attempt expired. Please try again." });
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: url.searchParams.get("code") || "",
      redirect_uri: redirect,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!tokenResponse.ok) {
    return json(response, 400, { error: "Google could not complete sign-in." });
  }
  const tokens = await tokenResponse.json();
  const infoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!infoResponse.ok) {
    return json(response, 400, { error: "Google could not confirm your account." });
  }
  const info = await infoResponse.json();
  const address = cleanEmail(info.email);
  if (!validEmail(address)) {
    return json(response, 400, { error: "Google did not return a usable email address." });
  }

  let user = await store.userByEmail(address);
  if (!user) {
    // Google accounts still have to pass the age gate; we cannot infer it, so
    // the member completes it on first sign-in via the onboarding step.
    const created = await store.register({
      email: address,
      password_hash: null,
      name: clean(info.name || "ARCA member", 120),
      role: "Member",
      email_verified: true,
      is_admin: ADMIN_EMAIL && address === ADMIN_EMAIL,
      oauth_provider: "google",
      oauth_subject: clean(info.sub, 180),
    });
    user = await store.userById(created.id);
  } else if (!user.email_verified) {
    await store.markEmailVerified(user.id);
    user = await store.userById(user.id);
  }

  const cookie = await startSession(store, request, response, user.id);
  response.writeHead(302, {
    Location: user.onboarding_complete ? "/app" : "/onboarding",
    "Set-Cookie": cookie,
  });
  response.end();
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

async function handleApi(request, response, store, url, { mailer }) {
  const method = request.method || "GET";

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && !sameOrigin(request)) {
    throw forbidden("This request must come from ARCA.");
  }

  const cookies = cookieMap(request.headers.cookie);
  const current = await store.userFromSession(cookies.arca_session || "");
  const payload = () => readBody(request);
  const origin = originOf(request);

  // ---- public ----
  if (method === "GET" && url.pathname === "/api/public") {
    return json(response, 200, {
      counts: await store.counts(),
      events: (await store.listEvents(null)).slice(0, 12),
      communities: await store.listCommunities(null),
      foundingLimit: FOUNDING_LIMIT,
      paymentsOpen: PAYMENTS_OPEN,
      legalUpdated: LEGAL_UPDATED,
    });
  }

  if (method === "POST" && url.pathname === "/api/analytics") {
    rateLimit(request, "analytics", 240, 60_000);
    const data = await payload();
    const path = clean(data.path, 180);
    if (!path.startsWith("/")) throw badRequest("Invalid analytics event.");
    await store.trackView(path, clean(data.referrerHost, 180));
    return json(response, 202, { ok: true });
  }

  // ---- auth ----
  if (method === "POST" && url.pathname === "/api/auth/register") {
    rateLimit(request, "register", 5, 60 * 60_000);
    if (IS_PRODUCTION && !operatorConfigured()) {
      throw httpError(503, "Sign-up is temporarily closed while we complete our launch checks.");
    }
    const data = await payload();

    // Honeypot: invisible to people, irresistible to bots. Fake success.
    if (clean(data.company_website, 200)) return json(response, 202, { verificationRequired: true });

    const name = clean(data.name, 120);
    const address = cleanEmail(data.email);
    const password = String(data.password || "");

    if (data.accept_terms !== true && data.accept_terms !== "on") {
      throw badRequest("Please accept the Terms and Privacy Policy to create an account.");
    }
    const age = ageFromDateOfBirth(data.date_of_birth);
    if (age === null) throw badRequest("Enter your date of birth so we can confirm your age.");
    if (!meetsMinimumAge(age)) {
      throw forbidden(`You must be ${MINIMUM_AGE} or over to join ARCA.`);
    }
    if (name.length < 2) throw badRequest("Enter the name other members should see.");
    if (!validEmail(address)) throw badRequest("Enter a valid email address.");
    const problem = passwordProblem(password, { email: address, name });
    if (problem) throw badRequest(problem);

    const user = await store.register({
      name,
      email: address,
      password_hash: await passwordHash(password),
      role: clean(data.role || "Member", 80),
      email_verified: false,
      is_admin: Boolean(ADMIN_EMAIL) && address === ADMIN_EMAIL,
    });

    // The account exists from here on. Mail failure never rolls it back.
    const token = await store.createAuthToken(user.id, "verify_email", 24 * 60 * 60_000);
    const link = `${origin}/verify-email?token=${encodeURIComponent(token)}`;
    const result = await mailer({ to: address, ...verificationEmail(link) });

    return json(response, 201, {
      verificationRequired: true,
      email: address,
      emailSent: result.sent,
      message: result.sent
        ? "Check your email for a confirmation link."
        : "Your account is created. We could not send the confirmation email just now — use “Resend” in a moment.",
    });
  }

  if (method === "POST" && url.pathname === "/api/auth/verify") {
    rateLimit(request, "verify", 12, 15 * 60_000);
    const data = await payload();
    const token = clean(data.token, 200);
    if (!isToken(token)) throw badRequest("That confirmation link is invalid or has expired.");
    const user = await store.consumeAuthToken(token, "verify_email");
    if (!user) throw badRequest("That confirmation link is invalid or has expired.");
    await store.markEmailVerified(user.id);
    const cookie = await startSession(store, request, response, user.id);
    const fresh = await store.userById(user.id);
    return json(response, 200, { user: publicUser(fresh) }, { "Set-Cookie": cookie });
  }

  if (method === "POST" && url.pathname === "/api/auth/verify/resend") {
    rateLimit(request, "verify-resend", 4, 15 * 60_000);
    const data = await payload();
    const user = await store.userByEmail(cleanEmail(data.email));
    // Always the same response, so this cannot be used to discover who has an account.
    if (user && !user.email_verified) {
      const token = await store.createAuthToken(user.id, "verify_email", 24 * 60 * 60_000);
      await mailer({
        to: user.email,
        ...verificationEmail(`${origin}/verify-email?token=${encodeURIComponent(token)}`),
      });
    }
    return json(response, 202, { ok: true });
  }

  if (method === "POST" && url.pathname === "/api/auth/password-reset/request") {
    rateLimit(request, "reset-request", 4, 15 * 60_000);
    const data = await payload();
    const user = await store.userByEmail(cleanEmail(data.email));
    if (user && user.password_hash) {
      const token = await store.createAuthToken(user.id, "password_reset", 60 * 60_000);
      await mailer({
        to: user.email,
        ...resetEmail(`${origin}/reset-password?token=${encodeURIComponent(token)}`),
      });
    }
    return json(response, 202, { ok: true });
  }

  if (method === "POST" && url.pathname === "/api/auth/password-reset/confirm") {
    rateLimit(request, "reset-confirm", 8, 15 * 60_000);
    const data = await payload();
    const token = clean(data.token, 200);
    const password = String(data.password || "");
    if (!isToken(token)) throw badRequest("That reset link is invalid or has expired.");
    const user = await store.consumeAuthToken(token, "password_reset");
    if (!user) throw badRequest("That reset link is invalid or has expired.");
    const problem = passwordProblem(password, { email: user.email, name: user.name });
    if (problem) throw badRequest(problem);
    await store.updatePassword(user.id, await passwordHash(password));
    await store.deleteSessionsForUser(user.id);
    const cookie = await startSession(store, request, response, user.id);
    return json(response, 200, { user: publicUser(await store.userById(user.id)) }, { "Set-Cookie": cookie });
  }

  if (method === "POST" && url.pathname === "/api/auth/login") {
    rateLimit(request, "login", 10, 15 * 60_000);
    const data = await payload();
    const user = await store.userByEmail(cleanEmail(data.email));
    const ok = user && (await passwordMatches(String(data.password || ""), user.password_hash || ""));
    if (!ok) throw unauthorized("That email address or password is not right.");
    if (!user.email_verified) {
      const token = await store.createAuthToken(user.id, "verify_email", 24 * 60 * 60_000);
      await mailer({
        to: user.email,
        ...verificationEmail(`${origin}/verify-email?token=${encodeURIComponent(token)}`),
      });
      throw forbidden("Please confirm your email first. We have sent you a fresh link.");
    }
    const cookie = await startSession(store, request, response, user.id);
    return json(response, 200, { user: publicUser(user) }, { "Set-Cookie": cookie });
  }

  if (method === "POST" && url.pathname === "/api/auth/logout") {
    if (cookies.arca_session) await store.deleteSession(cookies.arca_session);
    return json(response, 200, { ok: true }, {
      "Set-Cookie": sessionCookie("", { maxAge: 0, secure: isSecureRequest(request) || IS_PRODUCTION }),
    });
  }

  if (/^\/api\/oauth\/google\/(start|callback)$/.test(url.pathname)) {
    return googleOauth(request, response, store, url);
  }

  // ---- everything below needs a session ----
  if (!current) return json(response, 401, { error: "Please sign in to continue." });

  if (method === "GET" && url.pathname === "/api/me") {
    return json(response, 200, {
      user: publicUser(current),
      profile: await store.profile(current.id),
    });
  }

  if (method === "PUT" && url.pathname === "/api/profile") {
    rateLimit(request, "profile", 30, 60 * 60_000);
    const data = await payload();
    const existing = await store.profile(current.id);

    const photo = await saveImage(data.photo, { maxBytes: UPLOAD.maxAvatarBytes, prefix: "avatar" });
    const banner = await saveImage(data.banner, { maxBytes: UPLOAD.maxImageBytes, prefix: "banner" });
    if (existing.photo && existing.photo !== photo) await removeImage(existing.photo);
    if (existing.banner && existing.banner !== banner) await removeImage(existing.banner);

    const profile = await store.saveProfile(current.id, {
      tagline: clean(data.tagline, 180),
      description: clean(data.description, 3000),
      website: safeUrl(data.website, 500),
      linkedin: safeUrl(data.linkedin, 500, "linkedin.com"),
      location: clean(data.location, 160),
      country: cleanCountry(data.country),
      looking_for: clean(data.looking_for, 255),
      photo,
      banner,
    });
    return json(response, 200, {
      profile,
      user: { ...publicUser(current), onboardingComplete: true },
    });
  }

  if (method === "GET" && url.pathname === "/api/communities") {
    return json(response, 200, { communities: await store.listCommunities(current.id) });
  }
  if (method === "POST" && /^\/api\/communities\/[^/]+\/join$/.test(url.pathname)) {
    rateLimit(request, "community", 40, 60 * 60_000);
    await store.joinCommunity(current.id, decodeURIComponent(url.pathname.split("/")[3]));
    return json(response, 200, { ok: true });
  }
  if (method === "POST" && /^\/api\/communities\/[^/]+\/leave$/.test(url.pathname)) {
    await store.leaveCommunity(current.id, decodeURIComponent(url.pathname.split("/")[3]));
    return json(response, 200, { ok: true });
  }

  if (method === "GET" && url.pathname === "/api/events") {
    return json(response, 200, { events: await store.listEvents(current.id) });
  }

  if (method === "POST" && url.pathname === "/api/events") {
    rateLimit(request, "event-create", 12, 60 * 60_000);
    const data = await payload();
    const price = Math.max(0, Number(data.price_pence) || 0);
    if (price > 0 && !PAYMENTS_OPEN) {
      throw badRequest("Paid tickets are not available yet. Publish a free event for now.");
    }
    const title = clean(data.title, 180);
    const starts = new Date(data.starts_at);
    if (title.length < 5) throw badRequest("Give your event a title of at least 5 characters.");
    if (Number.isNaN(starts.valueOf()) || starts.getTime() < Date.now()) {
      throw badRequest("Choose a date and time in the future.");
    }
    if (starts.getTime() > Date.now() + 2 * 365 * 86_400_000) {
      throw badRequest("Events can be scheduled up to two years ahead.");
    }
    const format = ["online", "in-person", "hybrid"].includes(data.format) ? data.format : "online";
    const venue = clean(data.venue, 255);
    if (format !== "online" && venue.length < 3) {
      throw badRequest("Add the venue for an in-person or hybrid event.");
    }
    if (data.accept_host_terms !== true) {
      throw badRequest("Please confirm you accept the host responsibilities before publishing.");
    }

    const id = await store.createEvent(current, {
      community_id: clean(data.community_id, 36) || null,
      title,
      description: clean(data.description, 5000),
      starts_at: starts,
      duration_minutes: Math.min(480, Math.max(15, Number(data.duration_minutes) || 60)),
      format,
      venue,
      meeting_url: safeUrl(data.meeting_url, 500),
      price_pence: price,
      capacity: Math.min(10_000, Math.max(2, Number(data.capacity) || 100)),
    });
    return json(response, 201, { id });
  }

  if (method === "POST" && /^\/api\/events\/[^/]+\/register$/.test(url.pathname)) {
    rateLimit(request, "event-register", 40, 60 * 60_000);
    await store.registerEvent(current.id, url.pathname.split("/")[3]);
    return json(response, 200, { ok: true });
  }
  if (method === "POST" && /^\/api\/events\/[^/]+\/cancel$/.test(url.pathname)) {
    await store.cancelEvent(current.id, url.pathname.split("/")[3]);
    return json(response, 200, { ok: true });
  }
  if (method === "POST" && /^\/api\/events\/[^/]+\/withdraw$/.test(url.pathname)) {
    await store.cancelRegistration(current.id, url.pathname.split("/")[3]);
    return json(response, 200, { ok: true });
  }

  if (method === "GET" && url.pathname === "/api/members") {
    return json(response, 200, {
      members: await store.listMembers(current.id, clean(url.searchParams.get("q"), 120)),
    });
  }
  if (method === "GET" && url.pathname === "/api/network") {
    return json(response, 200, { members: await store.network(current.id) });
  }
  if (method === "POST" && /^\/api\/connections\/[^/]+$/.test(url.pathname)) {
    rateLimit(request, "connect", 60, 60 * 60_000);
    await store.connect(current.id, url.pathname.split("/")[3]);
    return json(response, 200, { ok: true });
  }
  if (method === "DELETE" && /^\/api\/connections\/[^/]+$/.test(url.pathname)) {
    await store.disconnect(current.id, url.pathname.split("/")[3]);
    return json(response, 200, { ok: true });
  }

  if (method === "GET" && url.pathname === "/api/conversations") {
    return json(response, 200, { conversations: await store.conversations(current.id) });
  }
  if (/^\/api\/messages\/[^/]+$/.test(url.pathname)) {
    const other = url.pathname.split("/")[3];
    if (method === "GET") {
      return json(response, 200, { messages: await store.listMessages(current.id, other) });
    }
    if (method === "POST") {
      rateLimit(request, "message", 60, 60_000);
      const data = await payload();
      const body = clean(data.body, 3000);
      if (!body) throw badRequest("Write a message first.");
      await store.sendMessage(current.id, other, body);
      return json(response, 201, { ok: true });
    }
  }

  if (method === "GET" && url.pathname === "/api/blocks") {
    return json(response, 200, { blocks: await store.listBlocks(current.id) });
  }
  if (method === "POST" && /^\/api\/blocks\/[^/]+$/.test(url.pathname)) {
    await store.block(current.id, url.pathname.split("/")[3]);
    return json(response, 200, { ok: true });
  }
  if (method === "DELETE" && /^\/api\/blocks\/[^/]+$/.test(url.pathname)) {
    await store.unblock(current.id, url.pathname.split("/")[3]);
    return json(response, 200, { ok: true });
  }

  if (method === "POST" && url.pathname === "/api/reports") {
    rateLimit(request, "report", 10, 60 * 60_000);
    const data = await payload();
    const reason = clean(data.reason, 1000);
    const subject = clean(data.subject_id, 36);
    if (!subject || reason.length < 10) {
      throw badRequest("Tell us briefly what happened — at least 10 characters.");
    }
    await store.report(current.id, subject, reason, clean(data.context, 255));
    return json(response, 201, { ok: true });
  }

  // ---- account ----
  if (method === "GET" && url.pathname === "/api/account/export") {
    rateLimit(request, "export", 5, 60 * 60_000);
    return json(
      response, 200,
      {
        exportedAt: new Date().toISOString(),
        notice: "This is a complete copy of the personal data ARCA holds about you.",
        data: await store.exportAccount(current.id),
      },
      { "Content-Disposition": 'attachment; filename="arca-my-data.json"' }
    );
  }

  if (method === "DELETE" && url.pathname === "/api/account") {
    const data = await payload();
    if (data.confirm !== "DELETE") throw badRequest("Type DELETE to confirm.");
    // OAuth-only accounts have no password to check; the typed confirmation and
    // the session are what we have, and both are required.
    if (current.password_hash) {
      const ok = await passwordMatches(String(data.password || ""), current.password_hash);
      if (!ok) throw unauthorized("Enter your current password to close your account.");
    }
    const profile = await store.profile(current.id);
    await removeImage(profile.photo);
    await removeImage(profile.banner);
    await store.deleteAccount(current.id);
    return json(response, 200, { ok: true }, {
      "Set-Cookie": sessionCookie("", { maxAge: 0, secure: isSecureRequest(request) || IS_PRODUCTION }),
    });
  }

  // ---- admin ----
  const isAdmin = Boolean(current.is_admin);
  if (url.pathname.startsWith("/api/admin/")) {
    if (!isAdmin) throw forbidden("Administrator access is required.");
    if (method === "GET" && url.pathname === "/api/admin/overview") {
      return json(response, 200, {
        analytics: await store.analytics(),
        reports: await store.listReports(),
        health: {
          store: store.kind,
          smtp: smtpConfigured(),
          operatorConfigured: operatorConfigured(),
          paymentsOpen: PAYMENTS_OPEN,
        },
      });
    }
    if (method === "POST" && /^\/api\/admin\/reports\/[^/]+\/resolve$/.test(url.pathname)) {
      const data = await payload();
      await store.resolveReport(url.pathname.split("/")[4], clean(data.outcome, 255) || "Reviewed");
      return json(response, 200, { ok: true });
    }
  }

  return json(response, 404, { error: "That ARCA action does not exist." });
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

export function createArcaServer(options = {}) {
  const storePromise = options.store
    ? Promise.resolve(options.store).then(async (s) => {
        if (s.init) await s.init();
        return s;
      })
    : makeStore();
  const mailer = options.mailer || deliver;

  let indexHtml = null;

  async function shell() {
    if (indexHtml && IS_PRODUCTION) return indexHtml;
    indexHtml = await readFile(join(ROOT, "index.html"), "utf8");
    return indexHtml;
  }

  const server = createServer(async (request, response) => {
    const started = Date.now();
    setSecurityHeaders(response);

    try {
      // HTTPS redirect. Driven by the proxy header alone, so it works on
      // Hostinger whether or not NODE_ENV has been set in hPanel.
      const proto = clean(request.headers["x-forwarded-proto"], 20).split(",")[0].trim();
      if (proto && proto !== "https" && process.env.DISABLE_HTTPS_REDIRECT !== "true") {
        const host = /^[a-z0-9.-]+(?::\d+)?$/i.test(request.headers.host || "")
          ? request.headers.host
          : null;
        if (host) {
          response.writeHead(308, { Location: `https://${host}${request.url || "/"}` });
          return response.end();
        }
      }

      const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
      const store = await storePromise;

      // -- health ----------------------------------------------------------
      if (url.pathname === "/api/health") {
        const healthy = await store.healthy();
        return json(response, healthy ? 200 : 503, {
          ok: healthy,
          service: "arca",
          version: VERSION,
          storage: store.kind,
          smtp: smtpConfigured(),
          operatorConfigured: operatorConfigured(),
          uptime: Math.round(process.uptime()),
        });
      }

      // -- api ---------------------------------------------------------------
      if (url.pathname.startsWith("/api/")) {
        return await handleApi(request, response, store, url, { mailer });
      }

      if (!["GET", "HEAD"].includes(request.method || "")) {
        response.writeHead(405, { Allow: "GET, HEAD" });
        return response.end("Method not allowed");
      }

      const origin = originOf(request);

      // -- generated text files ---------------------------------------------
      if (url.pathname === "/robots.txt") {
        response.writeHead(200, { "Content-Type": TYPES[".txt"], "Cache-Control": "public, max-age=3600" });
        return response.end(robots(origin));
      }
      if (url.pathname === "/sitemap.xml") {
        response.writeHead(200, { "Content-Type": TYPES[".xml"], "Cache-Control": "public, max-age=3600" });
        return response.end(sitemap(origin));
      }

      // -- legal documents, server rendered ----------------------------------
      if (url.pathname === "/legal" || url.pathname === "/legal/") {
        response.writeHead(302, { Location: "/legal/terms" });
        return response.end();
      }
      if (url.pathname.startsWith("/legal/")) {
        const page = renderLegalPage(url.pathname.slice(7));
        if (page) {
          response.writeHead(200, {
            "Content-Type": TYPES[".html"],
            "Cache-Control": "public, max-age=300",
          });
          return response.end(request.method === "HEAD" ? undefined : page);
        }
      }

      // -- static assets -----------------------------------------------------
      let filePath = safeAssetPath(url.pathname);
      let status = 200;
      let isShell = false;
      let info = null;

      try {
        info = await stat(filePath);
        if (!info.isFile()) throw new Error("not a file");
      } catch {
        filePath = join(ROOT, "index.html");
        isShell = true;
        status = isKnownPath(url.pathname) ? 200 : 404;
        info = await stat(filePath).catch(() => null);
      }

      // Validator for conditional requests. There is no build step here, so
      // stylesheets and scripts must never be served `immutable` — a deploy
      // would otherwise never reach anyone who had already visited. They get
      // `no-cache` plus an ETag instead, so the common case is a cheap 304.
      const etag = info ? `W/"${info.size.toString(16)}-${info.mtimeMs.toString(36)}"` : null;
      if (etag && !isShell && request.headers["if-none-match"] === etag) {
        response.writeHead(304, { ETag: etag, "Cache-Control": "no-cache" });
        return response.end();
      }

      let data;
      const type = TYPES[extname(filePath).toLowerCase()] || "application/octet-stream";

      if (isShell) {
        // Inject per-route metadata so crawlers and link previews see the real
        // title and description without executing any JavaScript.
        const meta = metaFor(url.pathname);
        const canonical = `${origin}${url.pathname}`;
        data = Buffer.from(
          (await shell())
            .replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`)
            .replace(
              /<meta name="description" content="[^"]*"\s*\/?>/,
              `<meta name="description" content="${meta.description}" />`
            )
            .replace(
              /<meta name="robots" content="[^"]*"\s*\/?>/,
              `<meta name="robots" content="${meta.noindex ? "noindex, nofollow" : "index, follow"}" />`
            )
            .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${canonical}" />`)
            .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${meta.title}" />`)
            .replace(
              /<meta property="og:description" content="[^"]*"\s*\/?>/,
              `<meta property="og:description" content="${meta.description}" />`
            )
            .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${canonical}" />`),
          "utf8"
        );
      } else {
        data = await readFile(filePath);
      }

      // Fonts and images are content-stable: a changed image gets a changed
      // filename. Code is not, so it revalidates.
      const longLived = /\.(?:woff2|png|jpe?g|webp|ico)$/i.test(filePath) && !isShell;
      const headers = {
        "Content-Type": type,
        "Cache-Control": longLived ? "public, max-age=31536000, immutable" : "no-cache",
        "Server-Timing": `app;dur=${Date.now() - started}`,
      };
      if (etag && !isShell) headers.ETag = etag;
      if (filePath.includes(`${sep}uploads${sep}`)) {
        headers["Content-Security-Policy"] = "default-src 'none'; img-src 'self'; sandbox";
      }

      const compressible = /^(?:text\/|application\/(?:json|javascript|xml|manifest\+json)|image\/svg)/.test(type);
      if (
        compressible &&
        data.length > 1024 &&
        String(request.headers["accept-encoding"] || "").includes("gzip")
      ) {
        data = gzipSync(data, { level: 6 });
        headers["Content-Encoding"] = "gzip";
        headers.Vary = "Accept-Encoding";
      }

      response.writeHead(status, headers);
      response.end(request.method === "HEAD" ? undefined : data);
    } catch (error) {
      const status = error.status || 500;
      if (status >= 500) console.error("[error]", error);
      const message = error.expose ? error.message : "ARCA had trouble completing that request.";
      const extra = error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {};
      if (response.headersSent) return response.end();
      json(response, status, { error: message }, extra);
    }
  });

  server.closeStore = async () => {
    const store = await storePromise;
    if (store.close) await store.close();
  };

  // Daily retention sweep, if the store supports it.
  const sweep = setInterval(async () => {
    try {
      const store = await storePromise;
      if (store.purgeExpired) await store.purgeExpired();
    } catch (error) {
      console.error("[retention] sweep failed:", error.message);
    }
  }, 24 * 60 * 60_000);
  sweep.unref?.();
  server.retentionTimer = sweep;

  return server;
}
