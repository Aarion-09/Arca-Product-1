// ARCA client. Router, state, API and event handling.

import { createMarketing, CURRENCIES } from "./marketing.js";
import { createMember } from "./member.js";
import { esc, icon, passwordScore } from "./ui.js";
import {
  initMotionPreference, initPointerEffects, initHeaderState,
  observe, transition, setMotion, motionEnabled,
} from "./motion.js";

const root = document.querySelector("#app");
const overlay = document.querySelector("#overlay");
const toastEl = document.querySelector("#toast");

const read = (key, fallback = null) => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage blocked — preferences simply do not persist */
  }
};

function guessCurrency() {
  const region = (navigator.language.split("-")[1] || "").toUpperCase();
  return (
    {
      GB: "GBP", US: "USD", IE: "EUR", DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR",
      AU: "AUD", CA: "CAD", IN: "INR", AE: "AED", SG: "SGD", NZ: "NZD", CH: "CHF",
      JP: "JPY", CN: "CNY", HK: "HKD", ZA: "ZAR", BR: "BRL", MX: "MXN",
    }[region] || "GBP"
  );
}

const state = {
  me: null,
  profile: null,
  public: { counts: { members: 0, events: 0, communities: 20, foundingRemaining: 300 }, events: [], communities: [] },
  events: [],
  communities: [],
  members: [],
  network: [],
  conversations: [],
  messages: [],
  blocks: [],
  admin: null,
  activeThread: null,
  query: "",
  currency: CURRENCIES[read("arca-currency")] ? read("arca-currency") : guessCurrency(),
  billing: read("arca-billing") === "annual" ? "annual" : "monthly",
  busy: false,
  booted: false,
};

const marketing = createMarketing(state);
const member = createMember(state);

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

let toastTimer;
function notify(message, type = "ok") {
  toastEl.textContent = message;
  toastEl.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.className = "toast";
  }, 4200);
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: options.body ? { "Content-Type": "application/json" } : {},
    credentials: "same-origin",
    ...options,
  });
  let data = {};
  try {
    data = await response.json();
  } catch {
    /* empty body */
  }
  if (!response.ok) {
    const error = new Error(data.error || "Something went wrong. Please try again.");
    error.status = response.status;
    throw error;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

function go(path, { replace = false } = {}) {
  if (replace) history.replaceState({}, "", path);
  else history.pushState({}, "", path);
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
}

const PUBLIC_VIEWS = {
  "/": () => marketing.landing(),
  "/communities": () => marketing.communities(),
  "/events": () => marketing.events(),
  "/for-hosts": () => marketing.hosts(),
  "/pricing": () => marketing.pricing(),
  "/join": () => marketing.authPage("join"),
  "/login": () => marketing.authPage("login"),
  "/verify-email": () => marketing.utilityPage("verify"),
  "/forgot-password": () => marketing.utilityPage("forgot"),
  "/reset-password": () => marketing.utilityPage("reset"),
};

const MEMBER_VIEWS = {
  "/app": () => member.dashboard(),
  "/app/discover": () => member.discover(),
  "/app/communities": () => member.communities(),
  "/app/events": () => member.events(),
  "/app/host": () => member.host(),
  "/app/network": () => member.network(),
  "/app/messages": () => member.messages(),
  "/app/settings": () => member.settings(),
  "/app/admin": () => member.admin(),
};

function paint(html) {
  transition(() => {
    root.innerHTML = html;
    observe(root);
    renderCookiePanel();
  });
}

function render() {
  const path = location.pathname;

  if (path.startsWith("/app")) {
    if (!state.me) return go("/login", { replace: true });
    if (!state.me.onboardingComplete && path !== "/onboarding") return go("/onboarding", { replace: true });
    const view = MEMBER_VIEWS[path];
    return paint(view ? view() : marketing.notFound());
  }

  if (path === "/onboarding") {
    if (!state.me) return go("/login", { replace: true });
    return paint(member.onboarding());
  }

  // Signed-in members do not need the sign-up screens.
  if (state.me && (path === "/join" || path === "/login")) return go("/app", { replace: true });

  const view = PUBLIC_VIEWS[path];
  paint(view ? view() : marketing.notFound());

  if (path === "/verify-email") runVerification();
  updateMetaTitle(path);
}

function updateMetaTitle(path) {
  // The server already injects the correct tags on first load; this keeps the
  // title honest during client-side navigation.
  const titles = {
    "/": "ARCA — Where serious people meet",
    "/communities": "Communities — ARCA",
    "/events": "Events — ARCA",
    "/for-hosts": "For hosts — ARCA",
    "/pricing": "Membership — ARCA",
    "/join": "Join ARCA",
    "/login": "Log in — ARCA",
  };
  document.title = titles[path] || (path.startsWith("/app") ? "Your ARCA" : "Page not found — ARCA");
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

async function loadPublic() {
  try {
    state.public = await api("/api/public");
  } catch {
    /* keep the defaults; the marketing pages still render */
  }
}

async function loadMemberData() {
  if (!state.me) return;
  const [communities, events, members, network, conversations, blocks] = await Promise.allSettled([
    api("/api/communities"),
    api("/api/events"),
    api(`/api/members?q=${encodeURIComponent(state.query)}`),
    api("/api/network"),
    api("/api/conversations"),
    api("/api/blocks"),
  ]);
  if (communities.status === "fulfilled") state.communities = communities.value.communities;
  if (events.status === "fulfilled") state.events = events.value.events;
  if (members.status === "fulfilled") state.members = members.value.members;
  if (network.status === "fulfilled") state.network = network.value.members;
  if (conversations.status === "fulfilled") state.conversations = conversations.value.conversations;
  if (blocks.status === "fulfilled") state.blocks = blocks.value.blocks;
}

async function loadAdmin() {
  if (!state.me?.isAdmin) return;
  try {
    state.admin = await api("/api/admin/overview");
  } catch {
    state.admin = null;
  }
}

async function refresh({ admin = false } = {}) {
  await loadMemberData();
  if (admin) await loadAdmin();
  render();
}

// ---------------------------------------------------------------------------
// Cookie consent
// ---------------------------------------------------------------------------

function renderCookiePanel(force = false) {
  const choice = read("arca-consent");
  if (choice && !force) {
    overlay.innerHTML = "";
    return;
  }
  overlay.innerHTML = `<aside class="cookie-panel" role="region" aria-label="Cookie preferences">
    <h2>Choose how ARCA uses analytics</h2>
    <p>Essential storage keeps you signed in and remembers your choices — it cannot be turned off. With your permission, privacy-minimised page counts help us see which pages are useful. No advertising, no tracking across other sites. Read the <a href="/legal/cookies">Cookie Policy</a>.</p>
    <div class="cookie-actions">
      <button class="button ghost" data-consent="essential">Essential only</button>
      <button class="button primary" data-consent="analytics">Accept analytics</button>
    </div>
  </aside>`;
}

function trackView() {
  if (read("arca-consent") !== "analytics") return;
  const referrerHost = document.referrer ? new URL(document.referrer).host : "";
  navigator.sendBeacon?.(
    "/api/analytics",
    new Blob([JSON.stringify({ path: location.pathname, referrerHost })], { type: "application/json" })
  );
}

// ---------------------------------------------------------------------------
// Verification flow
// ---------------------------------------------------------------------------

async function runVerification() {
  const token = new URLSearchParams(location.search).get("token");
  if (!token) return;
  try {
    const result = await api("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
    state.me = result.user;
    notify("Your email is confirmed. Welcome to ARCA.");
    await loadMemberData();
    go(state.me.onboardingComplete ? "/app" : "/onboarding", { replace: true });
  } catch (error) {
    notify(error.message, "error");
    go("/login", { replace: true });
  }
}

// ---------------------------------------------------------------------------
// File reading
// ---------------------------------------------------------------------------

const pending = { photo: null, banner: null };

function readFile(file, maxBytes) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Choose a PNG, JPEG or WebP image."));
    if (file.size > maxBytes) {
      return reject(new Error(`That image is ${(file.size / 1_000_000).toFixed(1)}MB. The limit is ${maxBytes / 1_000_000}MB.`));
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("That file could not be read."));
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------

function modal(html) {
  overlay.innerHTML = `<div class="modal-backdrop" data-modal-backdrop><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
  overlay.querySelector(".modal")?.querySelector("input, button, textarea")?.focus();
}
const closeModal = () => {
  overlay.innerHTML = "";
  renderCookiePanel();
};

// ---------------------------------------------------------------------------
// Click handling
// ---------------------------------------------------------------------------

document.addEventListener("click", async (event) => {
  const target = event.target;

  // Internal navigation
  const link = target.closest?.("a[data-link]");
  if (link && link.origin === location.origin) {
    event.preventDefault();
    document.querySelector(".site-header")?.classList.remove("open");
    go(link.pathname + link.search);
    return;
  }

  // Mobile menu
  if (target.closest?.("[data-action='nav-toggle']")) {
    const header = document.querySelector(".site-header");
    const open = header.classList.toggle("open");
    target.closest("[data-action='nav-toggle']").setAttribute("aria-expanded", String(open));
    return;
  }

  // Cookie consent
  const consent = target.closest?.("[data-consent]");
  if (consent) {
    write("arca-consent", consent.dataset.consent);
    overlay.innerHTML = "";
    notify(consent.dataset.consent === "analytics" ? "Thank you — analytics enabled." : "Analytics stay off.");
    if (consent.dataset.consent === "analytics") trackView();
    return;
  }
  if (target.closest?.("[data-action='cookie-settings']")) {
    renderCookiePanel(true);
    return;
  }

  // Modal dismissal
  if (target.matches?.("[data-modal-backdrop]") || target.closest?.("[data-close-modal]")) {
    closeModal();
    return;
  }

  // Pricing controls
  const billing = target.closest?.("[data-billing]");
  if (billing) {
    state.billing = billing.dataset.billing;
    write("arca-billing", state.billing);
    render();
    return;
  }

  // Sign out
  if (target.closest?.("[data-action='logout']")) {
    event.preventDefault();
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    state.me = null;
    state.profile = null;
    notify("Signed out.");
    go("/");
    return;
  }

  // OAuth requires consent on the join screen
  const oauth = target.closest?.("[data-oauth]");
  if (oauth && oauth.dataset.oauthJoin) {
    const box = document.querySelector('#auth-form input[name="accept_terms"]');
    if (box && !box.checked) {
      event.preventDefault();
      notify("Please confirm your age and accept the Terms first.", "error");
      return;
    }
  }

  // --- member actions ---
  const connect = target.closest?.("[data-connect]");
  if (connect) return act(connect, async () => {
    await api(`/api/connections/${connect.dataset.connect}`, { method: "POST" });
    notify("Connected. You can message each other now.");
    await refresh();
  });

  const community = target.closest?.("[data-community]");
  if (community) return act(community, async () => {
    const joined = community.dataset.joined;
    await api(`/api/communities/${community.dataset.community}/${joined ? "leave" : "join"}`, { method: "POST" });
    notify(joined ? "Left the community." : "Joined.");
    await refresh();
  });

  const register = target.closest?.("[data-register]");
  if (register) return act(register, async () => {
    await api(`/api/events/${register.dataset.register}/register`, { method: "POST" });
    notify("You are registered. The joining details are on the event.");
    await refresh();
  });

  const withdraw = target.closest?.("[data-withdraw]");
  if (withdraw) return act(withdraw, async () => {
    await api(`/api/events/${withdraw.dataset.withdraw}/withdraw`, { method: "POST" });
    notify("Registration withdrawn.");
    await refresh();
  });

  const cancelEvent = target.closest?.("[data-cancel-event]");
  if (cancelEvent) {
    const id = cancelEvent.dataset.cancelEvent;
    return modal(`<h2>Cancel this event?</h2>
      <p>Every registration will be cancelled. Please tell your attendees directly as well — it is your event.</p>
      <div class="modal-actions">
        <button class="button ghost" data-close-modal>Keep it</button>
        <button class="button danger" data-confirm-cancel="${esc(id)}">Cancel event</button>
      </div>`);
  }

  const confirmCancel = target.closest?.("[data-confirm-cancel]");
  if (confirmCancel) return act(confirmCancel, async () => {
    await api(`/api/events/${confirmCancel.dataset.confirmCancel}/cancel`, { method: "POST" });
    closeModal();
    notify("Event cancelled.");
    await refresh();
  });

  const thread = target.closest?.("[data-thread]");
  if (thread) {
    state.activeThread = thread.dataset.thread;
    try {
      const result = await api(`/api/messages/${state.activeThread}`);
      state.messages = result.messages;
    } catch (error) {
      notify(error.message, "error");
      state.messages = [];
    }
    render();
    document.querySelector("#thread-body")?.scrollTo({ top: 99999 });
    return;
  }

  const block = target.closest?.("[data-block]");
  if (block) {
    const id = block.dataset.block;
    return modal(`<h2>Block this member?</h2>
      <p>They will not be able to see your profile, connect with you or message you. Any existing connection is removed. You can undo this in Settings.</p>
      <div class="modal-actions">
        <button class="button ghost" data-close-modal>Cancel</button>
        <button class="button danger" data-confirm-block="${esc(id)}">Block</button>
      </div>`);
  }
  const confirmBlock = target.closest?.("[data-confirm-block]");
  if (confirmBlock) return act(confirmBlock, async () => {
    await api(`/api/blocks/${confirmBlock.dataset.confirmBlock}`, { method: "POST" });
    closeModal();
    notify("Member blocked.");
    await refresh();
  });

  const report = target.closest?.("[data-report]");
  if (report) {
    return modal(`<h2>Report a member</h2>
      <p>Tell us what happened. Reports are read by a person, and we aim to respond within 72 hours. If someone is in immediate danger, contact your local emergency services first.</p>
      <form id="report-form" data-subject="${esc(report.dataset.report)}">
        <label class="field"><span>What happened?</span>
          <textarea name="reason" required minlength="10" maxlength="1000" placeholder="Be as specific as you can."></textarea>
        </label>
        <div class="modal-actions">
          <button class="button ghost" type="button" data-close-modal>Cancel</button>
          <button class="button primary" type="submit">Send report</button>
        </div>
      </form>`);
  }

  const resolve = target.closest?.("[data-resolve]");
  if (resolve) return act(resolve, async () => {
    await api(`/api/admin/reports/${resolve.dataset.resolve}/resolve`, {
      method: "POST",
      body: JSON.stringify({ outcome: "Reviewed" }),
    });
    notify("Report marked as reviewed.");
    await refresh({ admin: true });
  });

  if (target.closest?.("[data-action='manage-blocks']")) {
    return modal(`<h2>Blocked members</h2>
      <p>Unblocking lets this person see your profile again. It does not restore a previous connection.</p>
      ${state.blocks
        .map(
          (b) => `<div class="setting-row"><div><h4>${esc(b.name)}</h4></div>
            <button class="button ghost small" data-unblock="${esc(b.id)}">Unblock</button></div>`
        )
        .join("")}
      <div class="modal-actions"><button class="button ghost" data-close-modal>Done</button></div>`);
  }
  const unblock = target.closest?.("[data-unblock]");
  if (unblock) return act(unblock, async () => {
    await api(`/api/blocks/${unblock.dataset.unblock}`, { method: "DELETE" });
    closeModal();
    notify("Member unblocked.");
    await refresh();
  });

  if (target.closest?.("[data-action='delete-account']")) {
    const hasPassword = true;
    return modal(`<h2>Close your account</h2>
      <p>This permanently deletes your profile, messages, connections and any events you host. It cannot be undone.</p>
      <form id="delete-form">
        ${hasPassword ? `<label class="field"><span>Your password</span><input name="password" type="password" autocomplete="current-password" /></label>` : ""}
        <label class="field"><span>Type DELETE to confirm</span><input name="confirm" type="text" required autocomplete="off" placeholder="DELETE" /></label>
        <div class="modal-actions">
          <button class="button ghost" type="button" data-close-modal>Keep my account</button>
          <button class="button danger" type="submit">Close my account</button>
        </div>
      </form>`);
  }
});

/** Runs an action with a busy state on the triggering button. */
async function act(button, fn) {
  if (state.busy) return;
  state.busy = true;
  const original = button.innerHTML;
  button.innerHTML = `<span class="spinner"></span>`;
  button.setAttribute("aria-disabled", "true");
  try {
    await fn();
  } catch (error) {
    notify(error.message, "error");
    button.innerHTML = original;
    button.removeAttribute("aria-disabled");
  } finally {
    state.busy = false;
  }
}

// ---------------------------------------------------------------------------
// Form handling
// ---------------------------------------------------------------------------

document.addEventListener("submit", async (event) => {
  const form = event.target;
  event.preventDefault();
  if (state.busy) return;

  const submit = form.querySelector('[type="submit"]');
  const original = submit?.innerHTML;
  const busy = (on) => {
    state.busy = on;
    if (!submit) return;
    submit.innerHTML = on ? `<span class="spinner"></span>` : original;
    submit.setAttribute("aria-disabled", String(on));
    if (!on) submit.removeAttribute("aria-disabled");
  };

  const data = Object.fromEntries(new FormData(form));
  busy(true);

  try {
    if (form.id === "auth-form") {
      if (form.dataset.mode === "join") {
        data.accept_terms = form.querySelector('[name="accept_terms"]').checked;
        if (!data.accept_terms) throw new Error("Please confirm your age and accept the Terms.");
        const result = await api("/api/auth/register", { method: "POST", body: JSON.stringify(data) });
        notify(result.message || "Check your email for a confirmation link.");
        paint(marketing.utilityPage("sent"));
      } else {
        if (form.querySelector('[name="remember"]')?.checked) write("arca-email", data.email);
        const result = await api("/api/auth/login", { method: "POST", body: JSON.stringify(data) });
        state.me = result.user;
        await loadMemberData();
        if (state.me.isAdmin) await loadAdmin();
        notify(`Welcome back, ${state.me.name.split(" ")[0]}.`);
        go(state.me.onboardingComplete ? "/app" : "/onboarding");
      }
    }

    else if (form.id === "forgot-form") {
      await api("/api/auth/password-reset/request", { method: "POST", body: JSON.stringify(data) });
      paint(marketing.utilityPage("sent"));
    }

    else if (form.id === "reset-form") {
      const token = new URLSearchParams(location.search).get("token") || "";
      const result = await api("/api/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({ token, password: data.password }),
      });
      state.me = result.user;
      await loadMemberData();
      notify("Password updated. You are signed in.");
      go("/app");
    }

    else if (form.id === "profile-form") {
      const payload = {
        ...data,
        photo: pending.photo ?? state.profile?.photo ?? "",
        banner: pending.banner ?? state.profile?.banner ?? "",
      };
      const result = await api("/api/profile", { method: "PUT", body: JSON.stringify(payload) });
      state.profile = result.profile;
      state.me = { ...state.me, onboardingComplete: true };
      pending.photo = null;
      pending.banner = null;
      notify("Profile saved.");
      if (location.pathname === "/onboarding") {
        await loadMemberData();
        go("/app");
      } else {
        await refresh();
      }
    }

    else if (form.id === "event-form") {
      data.accept_host_terms = form.querySelector('[name="accept_host_terms"]').checked;
      if (!data.accept_host_terms) throw new Error("Please confirm you accept the host responsibilities.");
      data.price_pence = 0;
      data.starts_at = new Date(data.starts_at).toISOString();
      await api("/api/events", { method: "POST", body: JSON.stringify(data) });
      notify("Your event is published.");
      await refresh();
    }

    else if (form.id === "message-form") {
      const to = form.dataset.to;
      await api(`/api/messages/${to}`, { method: "POST", body: JSON.stringify({ body: data.body }) });
      const result = await api(`/api/messages/${to}`);
      state.messages = result.messages;
      form.reset();
      render();
      document.querySelector("#thread-body")?.scrollTo({ top: 99999 });
    }

    else if (form.id === "report-form") {
      await api("/api/reports", {
        method: "POST",
        body: JSON.stringify({ subject_id: form.dataset.subject, reason: data.reason }),
      });
      closeModal();
      notify("Thank you. Our team will review this.");
    }

    else if (form.id === "delete-form") {
      await api("/api/account", {
        method: "DELETE",
        body: JSON.stringify({ confirm: data.confirm, password: data.password || "" }),
      });
      state.me = null;
      state.profile = null;
      closeModal();
      notify("Your account is closed. We are sorry to see you go.");
      go("/");
    }
  } catch (error) {
    notify(error.message, "error");
  } finally {
    busy(false);
  }
});

// ---------------------------------------------------------------------------
// Input handling
// ---------------------------------------------------------------------------

let searchTimer;
document.addEventListener("input", async (event) => {
  const target = event.target;

  if (target.id === "member-search") {
    clearTimeout(searchTimer);
    state.query = target.value;
    searchTimer = setTimeout(async () => {
      try {
        const result = await api(`/api/members?q=${encodeURIComponent(state.query)}`);
        state.members = result.members;
        const grid = document.querySelector(".member-grid");
        if (grid) {
          grid.innerHTML = state.members.map(member.memberCard).join("");
          observe(grid);
        }
      } catch {
        /* keep what is on screen */
      }
    }, 260);
    return;
  }

  if (target.name === "password") {
    const meter = target.parentElement?.querySelector(".password-meter");
    if (meter) {
      const score = passwordScore(target.value);
      [...meter.children].forEach((bar, i) => {
        bar.className = i < score ? `on-${score}` : "";
      });
    }
  }
});

document.addEventListener("change", async (event) => {
  const target = event.target;

  if (target.id === "currency") {
    state.currency = target.value;
    write("arca-currency", state.currency);
    render();
    return;
  }

  if (target.id === "motion-toggle") {
    setMotion(!target.checked);
    notify(target.checked ? "Animation reduced." : "Animation enabled.");
    return;
  }

  // Venue becomes required for non-online formats.
  if (target.id === "event-format") {
    const venue = document.querySelector('[name="venue"]');
    if (venue) venue.required = target.value !== "online";
    return;
  }

  const drop = target.closest?.("[data-upload]");
  if (drop && target.files?.[0]) {
    const kind = drop.dataset.upload;
    const max = kind === "photo" ? 2_000_000 : 4_000_000;
    try {
      const dataUri = await readFile(target.files[0], max);
      pending[kind] = dataUri;
      drop.innerHTML = `<img class="upload-preview" src="${dataUri}" alt="" />`;
      drop.append(target);
    } catch (error) {
      notify(error.message, "error");
      target.value = "";
    }
  }
});

// Drag and drop for uploads
document.addEventListener("dragover", (event) => {
  const drop = event.target.closest?.("[data-upload]");
  if (drop) {
    event.preventDefault();
    drop.classList.add("drag");
  }
});
document.addEventListener("dragleave", (event) => {
  event.target.closest?.("[data-upload]")?.classList.remove("drag");
});
document.addEventListener("drop", (event) => {
  const drop = event.target.closest?.("[data-upload]");
  if (!drop) return;
  event.preventDefault();
  drop.classList.remove("drag");
  const input = drop.querySelector("input[type=file]");
  if (input && event.dataTransfer.files.length) {
    input.files = event.dataTransfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
});

// Escape closes modals and the mobile menu
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (overlay.querySelector(".modal-backdrop")) closeModal();
  document.querySelector(".site-header")?.classList.remove("open");
});

window.addEventListener("popstate", () => render());

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function boot() {
  initMotionPreference();
  initPointerEffects();
  initHeaderState();

  await loadPublic();

  try {
    const result = await api("/api/me");
    state.me = result.user;
    state.profile = result.profile;
    await loadMemberData();
    if (state.me.isAdmin) await loadAdmin();
  } catch {
    // Not signed in — entirely normal.
  }

  state.booted = true;
  render();
  trackView();

  // Prefill a remembered email on the sign-in form.
  const remembered = read("arca-email");
  if (remembered) {
    const field = document.querySelector('#auth-form input[name="email"]');
    if (field && !field.value) {
      field.value = remembered;
      const box = document.querySelector('#auth-form input[name="remember"]');
      if (box) box.checked = true;
    }
  }
}

boot().catch((error) => {
  console.error(error);
  root.innerHTML = `<div class="notfound">
    <h1>ARCA could not start</h1>
    <p style="color:var(--muted)">Please refresh the page. If this keeps happening, our policies remain available.</p>
    <div class="hero-actions" style="justify-content:center">
      <a class="button primary" href="/">Reload</a>
      <a class="button ghost" href="/legal/terms">Trust centre</a>
    </div>
  </div>`;
});
