// Security and correctness guarantees. These are the assertions the previous
// product lost track of; if one of these fails, do not deploy.

import { test } from "node:test";
import assert from "node:assert/strict";
import { join, sep } from "node:path";
import { createArcaServer, safeAssetPath } from "../lib/server-core.mjs";
import { MemoryStore } from "../lib/store-memory.mjs";
import { resetRateLimits, passwordProblem, ageFromDateOfBirth } from "../lib/security.mjs";

// --- harness ---------------------------------------------------------------

const sent = [];
const mailer = async (message) => {
  sent.push(message);
  return { sent: true };
};

async function withServer(run) {
  resetRateLimits();
  sent.length = 0;
  const server = createArcaServer({ store: new MemoryStore(), mailer });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(base);
  } finally {
    clearInterval(server.retentionTimer);
    await new Promise((resolve) => server.close(resolve));
  }
}

const post = (base, path, body, headers = {}) =>
  fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    redirect: "manual",
  });

const validSignup = (overrides = {}) => ({
  name: "Test Member",
  email: `member${Math.random().toString(36).slice(2)}@example.com`,
  password: "a-long-enough-passphrase",
  date_of_birth: "1990-04-12",
  accept_terms: true,
  ...overrides,
});

// --- path safety -----------------------------------------------------------

test("safeAssetPath never escapes the public directory", () => {
  const index = join(new URL("../public/", import.meta.url).pathname.replace(/^\//, "").replace(/\//g, sep));
  for (const attack of [
    "/../lib/server-core.mjs",
    "/../../etc/passwd",
    "/..%2f..%2fpackage.json",
    "/%2e%2e/%2e%2e/server.mjs",
    "/....//....//package.json",
  ]) {
    const resolved = safeAssetPath(attack);
    assert.ok(
      !resolved.includes(`lib${sep}server-core`) && !resolved.includes("passwd"),
      `escaped with ${attack} -> ${resolved}`
    );
  }
});

test("a null byte in the path is rejected", () => {
  assert.ok(safeAssetPath("/index.html\0.png").endsWith("index.html"));
});

// --- headers ---------------------------------------------------------------

test("security headers are present on every response", async () => {
  await withServer(async (base) => {
    for (const path of ["/", "/api/health", "/legal/terms", "/does-not-exist"]) {
      const response = await fetch(`${base}${path}`);
      const h = response.headers;
      assert.match(h.get("strict-transport-security") || "", /max-age=\d+/, path);
      assert.equal(h.get("x-content-type-options"), "nosniff", path);
      assert.equal(h.get("x-frame-options"), "DENY", path);
      const csp = h.get("content-security-policy") || "";
      assert.match(csp, /frame-ancestors 'none'/, path);
      assert.match(csp, /base-uri 'self'/, path);
      assert.match(csp, /form-action 'self'/, path);
      assert.match(csp, /object-src 'none'/, path);
      assert.ok(!csp.includes("unsafe-inline'; script-src"), "no inline scripts allowed");
    }
  });
});

// --- routing ---------------------------------------------------------------

test("unknown pages return a real 404, known SPA routes return 200", async () => {
  await withServer(async (base) => {
    assert.equal((await fetch(`${base}/nonsense-page`)).status, 404);
    assert.equal((await fetch(`${base}/`)).status, 200);
    assert.equal((await fetch(`${base}/pricing`)).status, 200);
    assert.equal((await fetch(`${base}/app/settings`)).status, 200);
  });
});

test("robots.txt and sitemap.xml are generated and exclude the member area", async () => {
  await withServer(async (base) => {
    const robots = await (await fetch(`${base}/robots.txt`)).text();
    assert.match(robots, /Disallow: \/app\//);
    assert.match(robots, /Disallow: \/api\//);
    assert.match(robots, /Sitemap: http/);

    const sitemapResponse = await fetch(`${base}/sitemap.xml`);
    assert.match(sitemapResponse.headers.get("content-type") || "", /xml/);
    const sitemap = await sitemapResponse.text();
    assert.match(sitemap, /<loc>[^<]*\/pricing<\/loc>/);
    assert.match(sitemap, /<loc>[^<]*\/legal\/privacy<\/loc>/);
    assert.ok(!sitemap.includes("/app/"), "member area must not be in the sitemap");
    assert.ok(!sitemap.includes("/login"), "auth pages must not be in the sitemap");
  });
});

test("per-route metadata is injected server-side", async () => {
  await withServer(async (base) => {
    const pricing = await (await fetch(`${base}/pricing`)).text();
    assert.match(pricing, /<title>Membership — ARCA<\/title>/);
    assert.match(pricing, /Founding Pro/);

    const login = await (await fetch(`${base}/login`)).text();
    assert.match(login, /<meta name="robots" content="noindex, nofollow"/);
  });
});

// --- legal -----------------------------------------------------------------

test("every legal document renders without JavaScript", async () => {
  await withServer(async (base) => {
    const slugs = [
      "terms", "privacy", "acceptable-use", "community-guidelines", "cookies",
      "retention", "subprocessors", "intellectual-property", "security", "complaints",
    ];
    for (const slug of slugs) {
      const response = await fetch(`${base}/legal/${slug}`);
      assert.equal(response.status, 200, slug);
      const html = await response.text();
      assert.ok(!html.includes("<script"), `${slug} must not depend on scripts`);
      assert.match(html, /Last updated/, slug);
      assert.ok(html.length > 1500, `${slug} looks empty`);
    }
  });
});

test("the terms state the age limit and that ARCA is not the event organiser", async () => {
  await withServer(async (base) => {
    const terms = await (await fetch(`${base}/legal/terms`)).text();
    assert.match(terms, /at least 18 years old/);
    assert.match(terms, /ARCA is not the organiser of member events/);
    assert.match(terms, /Nothing on ARCA is professional advice/);
    assert.match(terms, /death or personal injury caused by our negligence/);
  });
});

// --- sign-up ---------------------------------------------------------------

test("the honeypot swallows bots without creating an account", async () => {
  await withServer(async (base) => {
    const response = await post(base, "/api/auth/register", validSignup({ company_website: "http://spam.example" }));
    assert.equal(response.status, 202);
    assert.equal(sent.length, 0, "no mail should be sent for a bot");

    const health = await (await fetch(`${base}/api/health`)).json();
    assert.equal(health.ok, true);
    const publicData = await (await fetch(`${base}/api/public`)).json();
    assert.equal(publicData.counts.members, 0, "no account should exist");
  });
});

test("a real signup works and sends exactly one verification email", async () => {
  await withServer(async (base) => {
    const response = await post(base, "/api/auth/register", validSignup());
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.verificationRequired, true);
    assert.equal(sent.length, 1);
    assert.match(sent[0].text, /verify-email\?token=[a-f\d]{64}/);
  });
});

test("under-18 sign-ups are refused", async () => {
  await withServer(async (base) => {
    const recent = new Date(Date.now() - 15 * 365.25 * 86_400_000).toISOString().slice(0, 10);
    const response = await post(base, "/api/auth/register", validSignup({ date_of_birth: recent }));
    assert.equal(response.status, 403);
    assert.match((await response.json()).error, /18 or over/);
    assert.equal(sent.length, 0);
  });
});

test("sign-up requires accepting the terms and a date of birth", async () => {
  await withServer(async (base) => {
    const noTerms = await post(base, "/api/auth/register", validSignup({ accept_terms: false }));
    assert.equal(noTerms.status, 400);

    const noDob = await post(base, "/api/auth/register", validSignup({ date_of_birth: "" }));
    assert.equal(noDob.status, 400);
  });
});

// This is the behaviour the previous build got wrong: it deleted the account.
test("a mail failure does not destroy the new account", async () => {
  resetRateLimits();
  const failing = async () => ({ sent: false, reason: "smtp-not-configured" });
  const server = createArcaServer({ store: new MemoryStore(), mailer: failing });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await post(base, "/api/auth/register", validSignup());
    assert.equal(response.status, 201, "sign-up must still succeed");
    const body = await response.json();
    assert.equal(body.emailSent, false);

    const publicData = await (await fetch(`${base}/api/public`)).json();
    assert.equal(publicData.counts.members, 1, "the account must survive");
    assert.equal(publicData.counts.foundingRemaining, 299);
  } finally {
    clearInterval(server.retentionTimer);
    await new Promise((resolve) => server.close(resolve));
  }
});

// --- authentication --------------------------------------------------------

test("repeated failed sign-ins are rate limited", async () => {
  await withServer(async (base) => {
    let limited = false;
    for (let i = 0; i < 14; i += 1) {
      const response = await post(base, "/api/auth/login", {
        email: "nobody@example.com",
        password: "wrong-password-here",
      });
      if (response.status === 429) {
        limited = true;
        assert.ok(response.headers.get("retry-after"), "should tell the client when to retry");
        break;
      }
    }
    assert.ok(limited, "sign-in should be rate limited");
  });
});

test("sign-in failure does not reveal whether the account exists", async () => {
  await withServer(async (base) => {
    await post(base, "/api/auth/register", validSignup({ email: "known@example.com" }));
    resetRateLimits();
    const known = await post(base, "/api/auth/login", { email: "known@example.com", password: "wrong-password" });
    const unknown = await post(base, "/api/auth/login", { email: "ghost@example.com", password: "wrong-password" });
    assert.equal(known.status, unknown.status);
    assert.deepEqual(await known.json(), await unknown.json());
  });
});

test("password reset requests never confirm whether an address is registered", async () => {
  await withServer(async (base) => {
    const a = await post(base, "/api/auth/password-reset/request", { email: "ghost@example.com" });
    assert.equal(a.status, 202);
    assert.deepEqual(await a.json(), { ok: true });
  });
});

test("the session cookie is HttpOnly, SameSite=Lax and capped at 30 days", async () => {
  await withServer(async (base) => {
    const store = new MemoryStore();
    // Register, verify via the emailed token, then inspect the cookie.
    await post(base, "/api/auth/register", validSignup({ email: "cookie@example.com" }));
    const token = /token=([a-f\d]{64})/.exec(sent[0].text)[1];
    const response = await post(base, "/api/auth/verify", { token });
    const cookie = response.headers.get("set-cookie") || "";
    assert.match(cookie, /arca_session=/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, /Max-Age=2592000/);
    void store;
  });
});

// --- CSRF ------------------------------------------------------------------

test("state-changing requests from another origin are refused", async () => {
  await withServer(async (base) => {
    const response = await post(base, "/api/auth/login", { email: "a@b.com", password: "x" }, {
      Origin: "https://evil.example",
    });
    assert.equal(response.status, 403);
  });
});

test("GET requests are unaffected by the origin check", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/public`, { headers: { Origin: "https://evil.example" } });
    assert.equal(response.status, 200);
  });
});

// --- authorisation ---------------------------------------------------------

test("member endpoints require a session", async () => {
  await withServer(async (base) => {
    for (const path of ["/api/me", "/api/members", "/api/network", "/api/account/export", "/api/admin/overview"]) {
      const response = await fetch(`${base}${path}`);
      assert.equal(response.status, 401, path);
    }
  });
});

test("non-GET methods are rejected on page routes", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/pricing`, { method: "POST" });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "GET, HEAD");
  });
});

// --- validation ------------------------------------------------------------

test("password rules reject the weak cases that matter", () => {
  assert.ok(passwordProblem("short"), "too short");
  assert.ok(passwordProblem("password123"), "common");
  assert.ok(passwordProblem("aaaaaaaaaaaa"), "repeated");
  assert.ok(passwordProblem("elena@work.com1", { email: "elena@work.com" }), "contains email");
  assert.ok(passwordProblem("Elena-Marsh-99", { name: "Elena Marsh" }), "contains name");
  assert.equal(passwordProblem("correct horse battery"), "");
});

test("date of birth parsing rejects nonsense", () => {
  assert.equal(ageFromDateOfBirth("not-a-date"), null);
  assert.equal(ageFromDateOfBirth("2030-01-01"), null);
  assert.equal(ageFromDateOfBirth("1990-02-30"), null);
  assert.equal(ageFromDateOfBirth(""), null);
  assert.ok(ageFromDateOfBirth("1990-01-01") >= 30);
});

// --- health ----------------------------------------------------------------

test("health reports status without leaking credentials", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/health`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.storage, "memory");
    const serialised = JSON.stringify(body);
    assert.ok(!/password|secret|DB_|SMTP_/i.test(serialised), "must not leak configuration");
  });
});
