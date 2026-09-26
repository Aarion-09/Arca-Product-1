# ARCA

A premium professional network: real profiles, focused communities, and live
events. Plain Node, no build step, deployable to Hostinger as-is.

```bash
npm install
npm start          # http://localhost:3000
npm run check      # syntax check + full test suite
```

Without `DB_NAME` the app runs on in-memory storage, so a clean checkout starts
and works immediately. Data is lost on restart — that is for development only.

Deployment: **[DEPLOY-HOSTINGER.md](DEPLOY-HOSTINGER.md)**. Read the launch
checklist at the top before you accept a single sign-up.

---

## Layout

```
server.mjs              Entry point. Reads PORT, binds 0.0.0.0, graceful shutdown.
lib/
  config.mjs            Env, operator identity, pricing, plans, communities.
  security.mjs          Hashing, tokens, validation, rate limiting, cookies.
  legal.mjs             Every legal document, and the renderer for them.
  routes.mjs            Route table → SPA router, metadata, sitemap, robots.
  store-memory.mjs      Development store.
  store-mysql.mjs       Production store. Schema, transactions, retention sweep.
  mailer.mjs            SMTP with graceful degradation.
  uploads.mjs           Image validation by file signature; writes to disk.
  server-core.mjs       HTTP server, API, static serving, security headers.
public/
  index.html            App shell. Server rewrites metadata per route.
  css/                  tokens → base → motion → marketing → app → legal
  js/                   app (router) · marketing · member · ui · motion
  fonts/                Self-hosted variable fonts.
test/
  hardening.test.mjs    Security guarantees. If one fails, do not deploy.
  product.test.mjs      Plan limits, pricing integrity, legal completeness.
```

---

## What is enforced in code

Each of these has a test. `npm test` runs 47 of them.

**Identity and age.** Sign-up requires a date of birth and refuses anyone under
18. Only the result of the check is stored, never the date. Sign-up is blocked
entirely in production until the operator identity is configured.

**Passwords.** scrypt with per-password salts, compared in constant time, run
asynchronously so a burst of sign-ins cannot block the event loop. Minimum ten
characters, with the genuinely weak cases rejected — common passwords, repeated
characters, and anything containing the member's own name or email.

**Sessions.** A random token, stored only as a SHA-256 hash. The cookie is
HttpOnly, SameSite=Lax, capped at 30 days, and `Secure` everywhere except plain
HTTP localhost. Changing a password invalidates every other session.

**Email flows never destroy data.** A failure to send never rolls back the
account that was just created — the member is told plainly and can request
another link. Verification and reset tokens are single-use, hashed, and expire
in 24 hours and 1 hour respectively.

**Enumeration.** Sign-in returns an identical response whether or not the
address exists. Password reset and resend always return the same 202.

**CSRF.** Origin is checked on every state-changing request, on top of
SameSite=Lax.

**Rate limiting.** Per-IP, per-endpoint, with `Retry-After`: sign-up 5/hour,
sign-in 10/15min, reset 4/15min, messaging 60/min, reports 10/hour.

**Uploads.** Validated by actual file signature against the declared type, size
capped below the proxy and MySQL limits, written to disk with a generated name,
and served from a path robots.txt excludes under a locked-down CSP.

**Headers.** HSTS, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, nosniff,
Referrer-Policy, Permissions-Policy, COOP, CORP, and a CSP with no inline
scripts. HTTPS redirect keys off `X-Forwarded-Proto`, so it works without
`NODE_ENV` being set.

**Real 404s.** Unknown URLs return status 404 while still rendering the app's own
404 page, so search engines do not index infinite copies of the homepage.

**Retention.** Expired sessions, tokens, old analytics and resolved reports are
purged at boot and daily thereafter, matching the published schedule.

---

## Legal documents

Ten documents live in `lib/legal.mjs` and are served as **real server-rendered
HTML** at `/legal/<slug>` — not SPA routes. A policy that vanishes when a
JavaScript bundle breaks is not a published policy.

Terms of Service · Privacy Policy · Acceptable Use · Community Guidelines ·
Cookie Policy · Data Retention Schedule · Sub-processors · IP & Takedown ·
Security & Disclosure · Complaints Procedure

They are written to describe what the code actually does. **If you change what
data is collected, who can see it, or how long it is kept, update the policy in
the same commit** and bump `LEGAL_UPDATED`.

They are a careful starting point in plain English, not legal advice.

### The liability positions that matter

- ARCA is a **platform**. It does not vet, endorse or supervise members.
- ARCA is **not the organiser** of member events. Hosts are, and must confirm
  that in the product before they can publish — the server rejects the event
  otherwise.
- **Nothing on ARCA is professional advice.**
- Liability is capped, with the non-excludable carve-outs (death or personal
  injury by negligence, fraud) left intact.
- 18+, enforced at sign-up rather than merely asserted.

---

## Pricing

Carried across unchanged from the previous product, and asserted in
`test/product.test.mjs` so it cannot drift:

| | Free | Plus | Pro |
|---|---|---|---|
| GBP / month | Free | £29 | £149 |
| Event attendance | 2 per month | Unlimited | Unlimited |
| Hosted events | — | 1 per year | Unlimited |

Sixteen currencies. Yearly is ten monthly payments, i.e. two months free. The
first 300 accounts receive **Founding Pro** for the life of the account.

Plan limits are enforced server-side, not just displayed.

**Paid checkout is closed** (`PAYMENTS_OPEN=false`). The server rejects any event
with a non-zero price and no card details are collected anywhere.

---

## Motion

The animation system lives in `public/css/motion.css` and `public/js/motion.js`:
scroll reveals, staggered children, word-by-word headline reveals, animated
counters and meters, drifting aurora gradients, marquees, tilt and glow on
pointer, page transitions, and skeleton loaders.

Three things keep it safe rather than merely busy:

1. `prefers-reduced-motion` collapses everything to zero duration.
2. Members can force that themselves in Settings — it persists.
3. If JavaScript never runs, `.no-js` makes every animated element fully
   visible. Nothing is ever hidden by animation alone.

---

## Accessibility

Verified in the browser, not assumed: **zero WCAG AA contrast failures**, no text
below 11px, no horizontal scroll at 375px, no tap target below 24px, visible
focus rings throughout, a skip link, correct heading order, and labelled form
controls.

The colour system exists to make that repeatable. `--orange` (#e9590c) is a brand
fill for large display type only — at 3.56:1 it is not AA for body text.
`--orange-text` (#c1450a) is 5.09:1 both as text on white and behind white text,
and is what small text and buttons use.
