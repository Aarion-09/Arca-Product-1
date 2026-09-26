// Shared UI primitives: escaping, icons, formatting, countries.

export const esc = (value = "") =>
  String(value ?? "").replace(/[&<>'"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c])
  );

export const initials = (name = "ARCA") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase() || "A";

const PATHS = {
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  home: '<path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z"/>',
  discover: '<circle cx="12" cy="12" r="9"/><path d="m15 9-2 4-4 2 2-4z"/>',
  events: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0m1-9a5 5 0 0 1 5 5"/>',
  network: '<circle cx="5" cy="12" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="m7.5 11 9-4m-9 6 9 4"/>',
  messages: '<path d="M4 5h16v12H8l-4 4z"/>',
  host: '<rect x="3" y="6" width="14" height="12" rx="2"/><path d="m17 10 4-2v8l-4-2z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13a7.7 7.7 0 0 0 0-2l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L15 3.5H9l-.3 2.6a8 8 0 0 0-1.7 1l-2.4-1-2 3.4L4.6 11a7.7 7.7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.3 2.6h6l.3-2.6a8 8 0 0 0 1.7-1l2.4 1 2-3.4z"/>',
  shield: '<path d="M12 3 5 6v5.5c0 4.3 2.9 8.2 7 9.5 4.1-1.3 7-5.2 7-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
  spark: '<path d="M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
  lock: '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  logout: '<path d="M10 5H4v14h6m4-3 4-4-4-4m4 4H9"/>',
  upload: '<path d="M12 16V4m-4 4 4-4 4 4M4 15v5h16v-5"/>',
  download: '<path d="M12 4v12m-4-4 4 4 4-4M4 19v1h16v-1"/>',
  flag: '<path d="M5 21V4m0 0h11l-2 4 2 4H5"/>',
  block: '<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>',
  star: '<path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6.1L12 16.8 6.6 19.7l1.2-6.1L3.3 9.4l6.1-.8z"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.3A8 8 0 1 1 21 12z"/>',
  users: '<circle cx="8" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M2 19a6 6 0 0 1 12 0m3-5a5 5 0 0 1 5 5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18"/><circle cx="8.5" cy="14.5" r="1"/>',
};

export const icon = (name, extra = "") =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}>${PATHS[name] || PATHS.arrow}</svg>`;

export const avatar = (person = {}, size = "") => {
  const cls = `avatar${size ? ` ${size}` : ""}`;
  return person.photo
    ? `<span class="${cls}"><img src="${esc(person.photo)}" alt="" loading="lazy" /></span>`
    : `<span class="${cls}">${esc(initials(person.name))}</span>`;
};

export const empty = (title, copy, action = "") =>
  `<div class="empty"><h3>${esc(title)}</h3><p>${esc(copy)}</p>${action ? `<div style="margin-top:1.3rem">${action}</div>` : ""}</div>`;

export const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

// --- dates -----------------------------------------------------------------

export function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(date);
}

export function shortDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return { day: "–", month: "" };
  return {
    day: String(date.getDate()),
    month: new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date).toUpperCase(),
  };
}

export function relativeTime(value) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const minute = 60_000, hour = 3_600_000, day = 86_400_000;
  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(then);
}

// --- countries -------------------------------------------------------------

export const COUNTRIES = {
  AE: "United Arab Emirates", AR: "Argentina", AT: "Austria", AU: "Australia", BE: "Belgium",
  BG: "Bulgaria", BR: "Brazil", CA: "Canada", CH: "Switzerland", CL: "Chile", CN: "China",
  CO: "Colombia", CZ: "Czechia", DE: "Germany", DK: "Denmark", EE: "Estonia", EG: "Egypt",
  ES: "Spain", FI: "Finland", FR: "France", GB: "United Kingdom", GH: "Ghana", GR: "Greece",
  HK: "Hong Kong", HR: "Croatia", HU: "Hungary", ID: "Indonesia", IE: "Ireland", IL: "Israel",
  IN: "India", IS: "Iceland", IT: "Italy", JP: "Japan", KE: "Kenya", KR: "South Korea",
  LT: "Lithuania", LU: "Luxembourg", LV: "Latvia", MA: "Morocco", MT: "Malta", MX: "Mexico",
  MY: "Malaysia", NG: "Nigeria", NL: "Netherlands", NO: "Norway", NZ: "New Zealand",
  PE: "Peru", PH: "Philippines", PK: "Pakistan", PL: "Poland", PT: "Portugal", QA: "Qatar",
  RO: "Romania", RS: "Serbia", SA: "Saudi Arabia", SE: "Sweden", SG: "Singapore",
  SI: "Slovenia", SK: "Slovakia", TH: "Thailand", TR: "Türkiye", TW: "Taiwan",
  UA: "Ukraine", US: "United States", UY: "Uruguay", VN: "Vietnam", ZA: "South Africa",
};

export const countryName = (code) => COUNTRIES[String(code || "").toUpperCase()] || "";

export function countryOptions(selected = "") {
  const entries = Object.entries(COUNTRIES).sort((a, b) => a[1].localeCompare(b[1]));
  return (
    `<option value="">Select a country</option>` +
    entries
      .map(
        ([code, name]) =>
          `<option value="${code}"${code === selected ? " selected" : ""}>${esc(name)}</option>`
      )
      .join("")
  );
}

export const placeOf = (profile = {}) =>
  [profile.location, countryName(profile.country)].filter(Boolean).join(", ");

// --- money -----------------------------------------------------------------

export function formatMoney(amount, code, symbol) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${symbol}${amount}`;
  }
}

// --- password strength -----------------------------------------------------

export function passwordScore(value = "") {
  let score = 0;
  if (value.length >= 10) score += 1;
  if (value.length >= 14) score += 1;
  if (/[^A-Za-z0-9]/.test(value) || /\d/.test(value)) score += 1;
  return Math.min(3, score);
}
