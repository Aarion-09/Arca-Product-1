// Central configuration. Everything reads process.env directly so the app works
// with Hostinger's hPanel environment variables — there is no dotenv dependency
// and no .env file is required in production.

export const VERSION = "3.0.0";

// ---------------------------------------------------------------------------
// Operator identity
// ---------------------------------------------------------------------------
// LEGAL: these values appear verbatim in the Terms, Privacy Policy and every
// other published document. They must name a real, contactable operator before
// the site accepts a single member. See DEPLOY-HOSTINGER.md > "Before you launch".
export const OPERATOR = {
  entity: process.env.OPERATOR_ENTITY || "ARCA (unincorporated project)",
  responsible: process.env.OPERATOR_RESPONSIBLE || "[ADULT RESPONSIBLE PERSON — NOT SET]",
  address: process.env.OPERATOR_ADDRESS || "[POSTAL ADDRESS — NOT SET]",
  country: process.env.OPERATOR_COUNTRY || "United Kingdom",
  email: (process.env.CONTACT_EMAIL || "hello@arca.network").toLowerCase(),
  privacyEmail: (process.env.PRIVACY_EMAIL || process.env.CONTACT_EMAIL || "privacy@arca.network").toLowerCase(),
  safetyEmail: (process.env.SAFETY_EMAIL || process.env.CONTACT_EMAIL || "safety@arca.network").toLowerCase(),
  icoRegistration: process.env.ICO_REGISTRATION || "",
};

// True only when a real operator has been configured. The server refuses to
// serve sign-up in production until this is satisfied, so the project can never
// silently collect personal data under a placeholder identity.
export const operatorConfigured = () =>
  !OPERATOR.responsible.includes("NOT SET") && !OPERATOR.address.includes("NOT SET");

export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").toLowerCase();

// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------
export const PORT = Number(process.env.PORT || 3000);
export const IS_PRODUCTION = process.env.NODE_ENV === "production";

// APP_ORIGIN is only a fallback. Email links are built from the live request
// host wherever one is available, so changing domain never breaks verification
// links — a failure mode the previous build had.
export const APP_ORIGIN = (process.env.APP_ORIGIN || "").replace(/\/+$/, "");

export const SESSION_DAYS = 30;
export const FOUNDING_LIMIT = 300;

// Upload ceilings. Deliberately conservative: Hostinger's reverse proxy commonly
// rejects request bodies above ~10MB before they ever reach Node, and shared
// MySQL `max_allowed_packet` is frequently 16MB. Files are written to disk, not
// embedded in the database, so these limits only govern the HTTP request.
export const UPLOAD = {
  maxRequestBytes: 6_000_000,
  maxImageBytes: 4_000_000,
  maxAvatarBytes: 2_000_000,
  imageTypes: new Set(["image/png", "image/jpeg", "image/webp"]),
  dir: process.env.UPLOAD_DIR || "public/uploads",
};

// ---------------------------------------------------------------------------
// Pricing — carried across unchanged from the previous product.
// Yearly billing is charged at ten monthly payments (two months free).
// ---------------------------------------------------------------------------
export const CURRENCIES = {
  GBP: { symbol: "£", plus: 29, pro: 149 },
  USD: { symbol: "$", plus: 49, pro: 199 },
  EUR: { symbol: "€", plus: 39, pro: 179 },
  AUD: { symbol: "A$", plus: 59, pro: 299 },
  CAD: { symbol: "C$", plus: 55, pro: 269 },
  INR: { symbol: "₹", plus: 3299, pro: 14999 },
  AED: { symbol: "د.إ", plus: 149, pro: 749 },
  SGD: { symbol: "S$", plus: 55, pro: 269 },
  NZD: { symbol: "NZ$", plus: 65, pro: 329 },
  CHF: { symbol: "CHF ", plus: 35, pro: 169 },
  JPY: { symbol: "¥", plus: 5900, pro: 29900 },
  CNY: { symbol: "¥", plus: 279, pro: 1399 },
  HKD: { symbol: "HK$", plus: 299, pro: 1599 },
  ZAR: { symbol: "R", plus: 699, pro: 3499 },
  BRL: { symbol: "R$", plus: 199, pro: 999 },
  MXN: { symbol: "MX$", plus: 699, pro: 3499 },
};

export const ANNUAL_MULTIPLIER = 10;

export const PLANS = {
  free: {
    name: "Free",
    tagline: "A place in the network. A reason to say hello.",
    features: [
      "A profile, links and intro video",
      "Access to focused communities",
      "Up to 2 event registrations per month",
      "Member connections and messages",
    ],
    monthlyRegistrations: 2,
    eventsPerYear: 0,
  },
  plus: {
    name: "Plus",
    tagline: "For the naturally curious and well connected.",
    features: [
      "Unlimited event attendance",
      "1 hosted event per year",
      "Your own event workspace",
      "All your conversations in one place",
    ],
    monthlyRegistrations: Infinity,
    eventsPerYear: 1,
  },
  pro: {
    name: "Pro",
    tagline: "For the people who bring people together.",
    features: [
      "Unlimited event hosting",
      "Event registration and capacity controls",
      "Online, in-person and hybrid formats",
      "Your community, your conversations",
    ],
    monthlyRegistrations: Infinity,
    eventsPerYear: Infinity,
  },
  founding_pro: {
    name: "Founding Pro",
    tagline: "All of Pro, for the life of your account.",
    features: [
      "Everything in Pro",
      "No recurring subscription charge",
      "Your founding number, kept permanently",
      "First sight of what we build next",
    ],
    monthlyRegistrations: Infinity,
    eventsPerYear: Infinity,
  },
};

export const COMPARISON_ROWS = [
  ["Profile, photos & intro video", "Included", "Included", "Included"],
  ["Communities", "Included", "Included", "Included"],
  ["Member connections & messages", "Included", "Included", "Included"],
  ["Event attendance", "2 per month", "Unlimited", "Unlimited"],
  ["Hosted events", "—", "1 per year", "Unlimited"],
  ["Event workspace", "—", "Included", "Included"],
];

// Paid checkout is deliberately closed. Until this is true the server rejects
// any event with a non-zero price and the UI never asks for card details, which
// keeps the project clear of payment-services and consumer-contract obligations.
export const PAYMENTS_OPEN = process.env.PAYMENTS_OPEN === "true";

// ---------------------------------------------------------------------------
// Communities
// ---------------------------------------------------------------------------
export const COMMUNITY_SEEDS = [
  ["consultants", "Consultants", "Independent experts turning knowledge into trusted work."],
  ["coaches", "Coaches", "Coaches exchanging better practices for meaningful client progress."],
  ["authors", "Authors", "Writers developing ideas, audiences and work that travels."],
  ["founders", "Founders", "People building companies and sharing the decisions behind them."],
  ["business-owners", "Business Owners", "Owners growing resilient businesses without growing alone."],
  ["ceos-executives", "CEOs & Executives", "Senior leaders comparing notes on people, strategy and responsibility."],
  ["agency-owners", "Agency Owners", "A practical circle for building healthier, more valuable agencies."],
  ["saas-founders", "SaaS Founders", "Builders sharing the decisions behind durable software companies."],
  ["operators", "Operators", "People turning ambitious plans into reliable systems and results."],
  ["speakers", "Speakers", "Experts developing ideas, finding stages and creating memorable rooms."],
  ["fractional-leaders", "Fractional Leaders", "Experienced leaders helping several teams make better decisions."],
  ["trainers", "Trainers", "Practitioners designing learning that changes what people can do."],
  ["actors", "Actors", "Performers connecting around craft, opportunity and sustainable careers."],
  ["artists-designers", "Artists & Designers", "Creative people making distinctive work and useful collaborations."],
  ["photographers", "Photographers", "Image-makers discussing commissions, craft and creative business."],
  ["filmmakers", "Filmmakers", "Directors, producers and crew bringing ambitious stories to life."],
  ["youtubers", "YouTubers", "Video creators building useful channels, formats and audiences."],
  ["sales-leaders", "Sales Leaders", "Revenue leaders sharing responsible ways to build effective teams."],
  ["podcasters", "Podcasters", "Hosts and producers making conversations people choose to hear."],
  ["investors", "Investors", "Thoughtful capital, candid conversations and founder-friendly insight."],
];

// ISO 3166-1 alpha-2. Comprehensive sanctioned-territory handling is a legal
// question, not a code one; this list simply keeps stored values well-formed.
export const COUNTRY_CODES = new Set(
  ("AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BQ BR BS BT BW BZ CA CD CF CG CH CI CK CL CM CN CO CR CV CW CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IQ IS IT JE JM JO JP KE KG KH KI KM KN KR KW KY KZ LA LB LC LI LK LR LS LT LU LV MA MC MD ME MG MH MK ML MM MN MO MQ MR MS MT MU MV MW MX MY MZ NA NC NE NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PR PS PT PW PY QA RE RO RS RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SX SZ TC TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WS XK YE YT ZA ZM ZW")
    .split(" ")
);

export const cleanCountry = (value) => {
  const code = String(value ?? "").trim().toUpperCase();
  return COUNTRY_CODES.has(code) ? code : "";
};

// Minimum age. ARCA processes professional profiles, hosts in-person events and
// offers member-to-member messaging, none of which we operate for children.
export const MINIMUM_AGE = 18;
