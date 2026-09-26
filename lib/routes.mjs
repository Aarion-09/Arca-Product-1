// One route table drives the SPA router, page metadata, the 404 status, the
// sitemap and robots.txt. The previous build kept four separate lists and they
// drifted apart; adding a page here is the only step required.

import { LEGAL_ORDER, LEGAL_DOCS } from "./legal.mjs";

export const PUBLIC_PAGES = {
  "/": {
    title: "ARCA — Where serious people meet",
    description:
      "ARCA is the premium professional network for real profiles, focused communities and events worth clearing an evening for.",
    priority: "1.0",
    changefreq: "weekly",
  },
  "/communities": {
    title: "Communities — ARCA",
    description:
      "Twenty focused communities of consultants, founders, operators and creators. Find the room where your questions get real answers.",
    priority: "0.9",
    changefreq: "weekly",
  },
  "/events": {
    title: "Events — ARCA",
    description:
      "Online, in-person and hybrid events hosted by ARCA members. Small rooms, real conversation, no audience mode.",
    priority: "0.9",
    changefreq: "daily",
  },
  "/for-hosts": {
    title: "For hosts — ARCA",
    description:
      "Everything you need to run a room people remember: registration, capacity, formats and a workspace built for hosts.",
    priority: "0.8",
    changefreq: "monthly",
  },
  "/pricing": {
    title: "Membership — ARCA",
    description:
      "Free, Plus and Pro membership. The first 300 members receive Founding Pro for the life of their account, with no subscription charge.",
    priority: "0.9",
    changefreq: "monthly",
  },
  "/join": {
    title: "Join ARCA",
    description: "Create your ARCA account and claim a founding place while they remain.",
    priority: "0.7",
    changefreq: "monthly",
    noindex: true,
  },
  "/login": {
    title: "Log in — ARCA",
    description: "Sign in to your ARCA account.",
    noindex: true,
  },
  "/onboarding": {
    title: "Your profile — ARCA",
    description: "Set up the profile other members will see.",
    noindex: true,
  },
  "/verify-email": {
    title: "Verify your email — ARCA",
    description: "Confirm your email address to activate your ARCA account.",
    noindex: true,
  },
  "/forgot-password": {
    title: "Reset your password — ARCA",
    description: "Request a link to set a new ARCA password.",
    noindex: true,
  },
  "/reset-password": {
    title: "Choose a new password — ARCA",
    description: "Set a new password for your ARCA account.",
    noindex: true,
  },
};

// Member area. Rendered by the SPA, never indexed, always behind auth.
export const MEMBER_PAGES = {
  "/app": { title: "Your ARCA", description: "Your network at a glance." },
  "/app/discover": { title: "Discover — ARCA", description: "Find members worth knowing." },
  "/app/communities": { title: "Communities — ARCA", description: "The rooms you have joined." },
  "/app/events": { title: "Events — ARCA", description: "What is coming up." },
  "/app/host": { title: "Host an event — ARCA", description: "Create and manage your events." },
  "/app/network": { title: "Your network — ARCA", description: "The people you are connected with." },
  "/app/messages": { title: "Messages — ARCA", description: "Your conversations." },
  "/app/settings": { title: "Settings — ARCA", description: "Your account, data and privacy." },
  "/app/admin": { title: "Moderation — ARCA", description: "Reports and service health." },
};

export const LEGAL_PATHS = LEGAL_ORDER.map((slug) => `/legal/${slug}`);

// Every path the app is willing to answer with a 200.
export const KNOWN_PATHS = new Set([
  ...Object.keys(PUBLIC_PAGES),
  ...Object.keys(MEMBER_PAGES),
  ...LEGAL_PATHS,
  "/legal",
]);

export function isKnownPath(pathname) {
  if (KNOWN_PATHS.has(pathname)) return true;
  // Member sub-routes such as /app/messages/<id>
  return pathname.startsWith("/app/");
}

export function metaFor(pathname) {
  if (PUBLIC_PAGES[pathname]) return PUBLIC_PAGES[pathname];
  if (MEMBER_PAGES[pathname]) return { ...MEMBER_PAGES[pathname], noindex: true };
  if (pathname === "/legal") {
    return {
      title: "Trust centre — ARCA",
      description: "Every ARCA policy in one place: terms, privacy, acceptable use, security and more.",
      priority: "0.6",
      changefreq: "monthly",
    };
  }
  const slug = pathname.startsWith("/legal/") ? pathname.slice(7) : "";
  if (LEGAL_DOCS[slug]) {
    return {
      title: `${LEGAL_DOCS[slug].title} — ARCA`,
      description: LEGAL_DOCS[slug].summary,
      priority: "0.5",
      changefreq: "monthly",
    };
  }
  return { title: "Page not found — ARCA", description: "That page does not exist.", noindex: true };
}

export function sitemap(origin) {
  const entries = [];
  for (const [path, meta] of Object.entries(PUBLIC_PAGES)) {
    if (meta.noindex) continue;
    entries.push({ path, priority: meta.priority || "0.6", changefreq: meta.changefreq || "monthly" });
  }
  entries.push({ path: "/legal", priority: "0.6", changefreq: "monthly" });
  for (const slug of LEGAL_ORDER) {
    entries.push({ path: `/legal/${slug}`, priority: "0.5", changefreq: "monthly" });
  }
  const today = new Date().toISOString().slice(0, 10);
  const urls = entries
    .map(
      (entry) =>
        `  <url><loc>${origin}${entry.path}</loc><lastmod>${today}</lastmod>` +
        `<changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function robots(origin) {
  return [
    "User-agent: *",
    "Allow: /$",
    "Disallow: /app/",
    "Disallow: /api/",
    "Disallow: /join",
    "Disallow: /login",
    "Disallow: /onboarding",
    "Disallow: /verify-email",
    "Disallow: /forgot-password",
    "Disallow: /reset-password",
    "Disallow: /uploads/",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
}
