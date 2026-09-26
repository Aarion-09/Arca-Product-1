# Deploying ARCA to Hostinger

## Before anything else: check your plan

**Hostinger's standard shared Web Hosting plans are PHP-only and cannot run
Node.js.** You need **Cloud Hosting** or a **VPS**. If hPanel has no "Node.js"
section, you are on the wrong plan and nothing below will work.

---

## Before you launch — the legal checklist

The app refuses to accept sign-ups in production until the operator identity is
configured. This is deliberate: the Terms and Privacy Policy name a real,
contactable person, and collecting personal data under a placeholder identity is
the thing most likely to cause you an actual problem.

- [ ] `OPERATOR_ENTITY`, `OPERATOR_RESPONSIBLE`, `OPERATOR_ADDRESS` set to real values
- [ ] `OPERATOR_RESPONSIBLE` is **an adult** who accepts legal responsibility for the service
- [ ] `CONTACT_EMAIL`, `PRIVACY_EMAIL`, `SAFETY_EMAIL` are monitored inboxes
- [ ] Register with the ICO if required, then set `ICO_REGISTRATION`
- [ ] Read `/legal/terms` and `/legal/privacy` end to end and confirm they describe what you actually do
- [ ] Have a qualified adviser review them before you take any money

`GET /api/health` reports `operatorConfigured: true` once this is done.

### Why this matters for you specifically

Neither founder being 18 does not stop you building or running the site, but it
does affect three things:

1. **Contracts.** A contract with a minor is generally voidable by the minor.
   Your Terms need an adult entity or an adult responsible person on the other
   side of the agreement, or they are weak against a member who wants out.
2. **Data protection.** The ICO expects an identifiable controller. Name the
   adult or the company, not "two students".
3. **Payments.** Payment processors require an adult account holder and, usually,
   a registered business. This is why `PAYMENTS_OPEN` is `false` by default and
   why the app collects no card details at all. Leave it that way until there is
   a company and an adult director.

---

## 1. Create the database

hPanel → **Databases** → **MySQL Databases**. Create a database and user, and
note the name, user and password. They will be prefixed, e.g. `u123456789_arca`.

If the database is on the same server as the app, `DB_HOST` is `localhost`.

## 2. Upload the code

Either connect the Git repository in hPanel → **Git**, or upload the folder via
**File Manager**. Do not upload `node_modules` — Hostinger installs from
`package-lock.json`.

## 3. Configure the Node app

hPanel → **Node.js**:

| Setting | Value |
|---|---|
| Node version | 20 or newer |
| Application root | the folder containing `package.json` |
| Startup file | `server.mjs` |
| Start command | `npm start` |
| Build command | *(leave empty — there is no build step)* |

Do **not** set `PORT`. Hostinger injects it and `server.mjs` reads it.

## 4. Environment variables

hPanel → **Node.js** → **Environment variables**. Copy from `.env.example`.
A `.env` file is not read in production; the app reads `process.env` directly.

Minimum for a working launch:

```
NODE_ENV=production
APP_ORIGIN=https://yourdomain.com
OPERATOR_ENTITY=...
OPERATOR_RESPONSIBLE=...
OPERATOR_ADDRESS=...
CONTACT_EMAIL=...
ADMIN_EMAIL=...
DB_HOST=localhost
DB_NAME=u123456789_arca
DB_USER=u123456789_arca
DB_PASSWORD=...
SMTP_USER=...
SMTP_PASS=...
```

### Email

Sign-up works without SMTP — the account is created and the confirmation link is
written to the server log instead of being sent. That is fine for testing and
unacceptable in production, because members cannot confirm their own address.

For Gmail you must use an **App Password**, not your account password, with
`SMTP_PORT=465` and `SMTP_SECURE=true`. Hostinger blocks outbound port 25; 465
and 587 are fine.

## 5. Install and start

Hostinger runs `npm install` then your start command. Watch the log — the app
prints its configuration on boot:

```
ARCA 3.0.0 listening on http://0.0.0.0:xxxxx
  storage : mysql
  email   : configured
```

Tables are created automatically on first start.

## 6. Verify

```bash
curl https://yourdomain.com/api/health
```

Expect `{"ok":true,"storage":"mysql","smtp":true,"operatorConfigured":true,...}`.

Then check by hand:

- `/` loads and the fonts are the serif/sans pair, not Times New Roman
- `/legal/terms` loads **with JavaScript disabled**
- `/robots.txt` and `/sitemap.xml` return your real domain
- A nonsense URL returns a real 404, not a 200
- Sign up with a real address and confirm the email arrives

---

## Operational notes

**File uploads.** Profile images are written to `public/uploads/` on disk, not
into MySQL. Make sure that directory persists across deploys — if your deploy
wipes the application root, move it by setting `UPLOAD_DIR` to a path outside it.
Image limits are 2MB for avatars and 4MB for banners, deliberately below
Hostinger's proxy body limit and MySQL `max_allowed_packet`.

**Restarts.** Hostinger restarts the app on deploy and when it idles. Sessions
survive because they live in MySQL. The in-process rate limiter resets, which is
acceptable. If you ever run more than one instance, move rate limiting into the
database — it is per-process today.

**HTTPS.** The app redirects to HTTPS based on the `X-Forwarded-Proto` header
alone, so it works whether or not you set `NODE_ENV`. Set
`DISABLE_HTTPS_REDIRECT=true` only if you are terminating TLS somewhere unusual.

**Caching.** Stylesheets and scripts are served `no-cache` with an ETag, so a
deploy reaches returning visitors immediately and costs one cheap 304. Fonts and
images are immutable for a year. There is no build step and therefore no
filename hashing, so do not change this without adding cache busting.

**Backups.** hPanel → Backups. The retention schedule you publish at
`/legal/retention` promises backups roll off within 35 days — make your actual
backup policy match, or change the document.

---

## Turning payments on later

1. Form a company with an adult director.
2. Open a Stripe (or similar) account under that company.
3. Build the checkout flow, including VAT handling and the cancellation terms
   already promised in section 8 of the Terms.
4. Update `/legal/terms` section 8 and add a refunds policy **before** taking
   the first payment.
5. Set `PAYMENTS_OPEN=true`.

Until step 5, the server rejects any event with a non-zero price and the UI never
asks for card details.
