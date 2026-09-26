// Public marketing pages and authentication screens.

import {
  esc, icon, avatar, empty, formatDate, shortDate, formatMoney, countryOptions,
} from "./ui.js";

// Pricing carried across unchanged from the previous product.
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

const NAV = [
  ["/communities", "Communities"],
  ["/events", "Events"],
  ["/for-hosts", "For hosts"],
  ["/pricing", "Membership"],
];

const aurora = () => `<div class="aurora" aria-hidden="true"><span></span><span></span><span></span></div><div class="grain" aria-hidden="true"></div>`;

export function createMarketing(state) {
  const here = () => location.pathname;
  const memberHref = () => (state.me ? "/app" : "/join");
  const memberLabel = () => (state.me ? "Open ARCA" : "Claim your place");

  // -- shell ---------------------------------------------------------------

  function header() {
    return `<header class="site-header">
      <div class="wrap header-inner">
        <a class="brand" href="/" data-link aria-label="ARCA home">
          <img src="/images/logo.svg" width="30" height="30" alt="" />
          <span>ARCA</span>
        </a>
        <button class="nav-toggle" type="button" data-action="nav-toggle" aria-label="Menu" aria-expanded="false">
          ${icon("menu")}
        </button>
        <nav class="site-nav" aria-label="Main">
          ${NAV.map(
            ([href, label]) =>
              `<a href="${href}" data-link${here() === href ? ' class="active" aria-current="page"' : ""}>${label}</a>`
          ).join("")}
        </nav>
        <div class="header-actions">
          ${
            state.me
              ? `<a class="button primary small" href="/app" data-link>Open ARCA ${icon("arrow", 'class="arrow"')}</a>`
              : `<a class="button ghost small" href="/login" data-link>Log in</a>
                 <a class="button primary small" href="/join" data-link>Join ARCA</a>`
          }
        </div>
      </div>
    </header>`;
  }

  function footer() {
    const year = new Date().getFullYear();
    return `<footer class="site-footer">
      <div class="wrap">
        <div class="footer-top">
          <div class="footer-brand">
            <a class="brand" href="/" data-link>
              <img src="/images/logo.svg" width="30" height="30" alt="" />
              <span>ARCA</span>
            </a>
            <p>A professional network built on real profiles, focused communities and rooms worth turning up to.</p>
          </div>
          <div class="footer-col">
            <h4>Network</h4>
            <ul>
              ${NAV.map(([href, label]) => `<li><a href="${href}" data-link>${label}</a></li>`).join("")}
              <li><a href="/join" data-link>Join</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>Trust centre</h4>
            <ul>
              <li><a href="/legal/terms">Terms of Service</a></li>
              <li><a href="/legal/privacy">Privacy Policy</a></li>
              <li><a href="/legal/acceptable-use">Acceptable use</a></li>
              <li><a href="/legal/community-guidelines">Community guidelines</a></li>
              <li><a href="/legal/security">Security</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>Your data</h4>
            <ul>
              <li><a href="/legal/cookies">Cookie policy</a></li>
              <li><a href="/legal/retention">Data retention</a></li>
              <li><a href="/legal/subprocessors">Sub-processors</a></li>
              <li><a href="/legal/complaints">Complaints</a></li>
              <li><button type="button" data-action="cookie-settings">Cookie settings</button></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${year} ARCA. All rights reserved.</span>
          <span><span class="pulse-dot" aria-hidden="true"></span> &nbsp;Operating in the United Kingdom</span>
          <p class="footer-legal-note">
            ARCA provides a platform only. We do not vet, endorse or supervise members, and we are not the organiser
            of member events. Nothing on ARCA is professional advice. See our
            <a href="/legal/terms">Terms of Service</a> for the full position.
          </p>
        </div>
      </div>
    </footer>`;
  }

  const shell = (content) => `${header()}<main id="main" class="page-enter">${content}</main>${footer()}`;

  // -- shared blocks -------------------------------------------------------

  const heading = (eyebrow, title, copy = "", center = false) =>
    `<div class="section-head${center ? " center" : ""} reveal">
      <span class="eyebrow">${esc(eyebrow)}</span>
      <h2>${title}</h2>
      ${copy ? `<p>${copy}</p>` : ""}
    </div>`;

  const faq = (items) =>
    `<div class="faq stagger">${items
      .map(
        ([q, a]) =>
          `<details><summary>${esc(q)}</summary><div class="answer"><p>${esc(a)}</p></div></details>`
      )
      .join("")}</div>`;

  function ctaBlock() {
    const remaining = state.public.counts.foundingRemaining;
    return `<section class="section"><div class="wrap">
      <div class="cta reveal">
        ${aurora()}
        <h2>The room is forming.<br /><em>Take your seat.</em></h2>
        <p>${
          remaining > 0
            ? `${remaining} founding places remain. Founding Pro stays with your account for life.`
            : "Create your account and find the people worth knowing."
        }</p>
        <div class="hero-actions">
          <a class="button on-dark large" href="${memberHref()}" data-link>${memberLabel()} ${icon("arrow", 'class="arrow"')}</a>
          <a class="button on-dark ghost large" href="/pricing" data-link>See membership</a>
        </div>
      </div>
    </div></section>`;
  }

  // -- landing -------------------------------------------------------------

  function landing() {
    const { counts, communities, events } = state.public;
    const remaining = counts.foundingRemaining;
    const claimed = Math.max(0, 300 - remaining);

    return shell(`
      <section class="hero">
        ${aurora()}
        <div class="wrap">
          <div class="hero-grid">
            <div>
              ${
                remaining > 0
                  ? `<div class="founding-badge reveal">
                       <span><b>${remaining}</b> founding places left</span>
                       <span class="chip">Pro, free for life</span>
                     </div>`
                  : ""
              }
              <h1><span class="words">Where serious people</span> <em>meet.</em></h1>
              <p class="hero-sub">Real profiles. Focused communities. Events worth clearing an evening for. No feed, no noise, no performance.</p>
              <div class="hero-actions reveal" style="--reveal-delay:120ms">
                <a class="button primary large" href="${memberHref()}" data-link>${memberLabel()} ${icon("arrow", 'class="arrow"')}</a>
                <a class="button ghost large" href="/communities" data-link>Look around first</a>
              </div>
              <div class="hero-trust reveal" style="--reveal-delay:220ms">
                <span>${icon("check")} No card required</span>
                <span>${icon("check")} No advertising, ever</span>
                <span>${icon("check")} Your data, exportable</span>
              </div>
            </div>
            <div class="hero-stack" aria-hidden="true">
              <div class="hero-card">
                <div class="hero-card-top">
                  <span class="avatar">EM</span>
                  <span><strong>Elena M.</strong><span>Fractional COO</span></span>
                </div>
                <p>“Looking for operators who have scaled past 50 people without losing the plot.”</p>
                <span class="pill pill-orange">Operators</span>
              </div>
              <div class="hero-card">
                <div class="hero-card-top">
                  <span class="avatar">JK</span>
                  <span><strong>James K.</strong><span>Agency founder</span></span>
                </div>
                <p>“Hosting a small dinner on pricing models. Eight seats, no pitching.”</p>
                <span class="pill pill-blue">Hosting Thursday</span>
              </div>
              <div class="hero-card">
                <div class="hero-card-top">
                  <span class="avatar">PR</span>
                  <span><strong>Priya R.</strong><span>Investor</span></span>
                </div>
                <p>“Happy to look at early decks from technical founders.”</p>
                <span class="pill">Investors</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section-tight"><div class="wrap">
        <div class="stat-band reveal">
          <div><strong class="counter" data-count="${counts.communities}">0</strong><span>Focused communities</span></div>
          <div><strong class="counter" data-count="${counts.members}">0</strong><span>Members</span></div>
          <div><strong class="counter" data-count="${counts.events}">0</strong><span>Upcoming events</span></div>
          <div><strong>${remaining > 0 ? `<span class="counter" data-count="${claimed}">0</span>/300` : "300/300"}</strong><span>Founding places claimed</span></div>
        </div>
      </div></section>

      <section class="section"><div class="wrap">
        ${heading("Why ARCA exists", "Networking broke.<br /><em>We rebuilt the room.</em>", "Professional networks became broadcast channels. ARCA is built for the opposite: fewer people, better context, and a reason to actually speak.")}
        <div class="grid-3 stagger">
          <article class="card feature glow">
            <div class="icon-box">${icon("users")}</div>
            <h3>Real people only</h3>
            <p>Every member completes a profile with a face, a role and what they are actually looking for. One person, one account.</p>
          </article>
          <article class="card feature glow">
            <div class="icon-box">${icon("spark")}</div>
            <h3>Rooms, not feeds</h3>
            <p>Twenty focused communities instead of one endless timeline. You choose the rooms; the rooms stay on topic.</p>
          </article>
          <article class="card feature glow">
            <div class="icon-box">${icon("calendar")}</div>
            <h3>Events that earn the evening</h3>
            <p>Small, hosted, online or in person. Capacity limits keep conversation possible and pitching impossible.</p>
          </article>
        </div>
      </div></section>

      <section class="section on-ink">
        ${aurora()}
        <div class="wrap">
          ${heading("How it works", "Four steps.<br /><em>Then a conversation.</em>")}
          <div class="steps stagger">
            <div class="step"><h3>Create your profile</h3><p>Your face, your role, and one honest line about what you are looking for.</p></div>
            <div class="step"><h3>Join your rooms</h3><p>Pick the communities where your questions belong. Leave any time.</p></div>
            <div class="step"><h3>Attend or host</h3><p>Register for events, or run your own with proper registration and capacity control.</p></div>
            <div class="step"><h3>Connect and talk</h3><p>Connect with members you have met. Messaging opens only once you both do.</p></div>
          </div>
        </div>
      </section>

      <section class="section"><div class="wrap">
        ${heading("The communities", "Twenty rooms.<br /><em>Find yours.</em>", `Showing four of ${counts.communities}.`)}
        <div class="community-grid stagger">
          ${communities
            .slice(0, 4)
            .map(
              (c) => `<a class="community-card" href="/communities" data-link>
                <h3>${esc(c.name)}</h3>
                <p>${esc(c.description)}</p>
                <span class="meta">${c.member_count > 0 ? `${c.member_count} members` : "Open to new members"}</span>
              </a>`
            )
            .join("")}
        </div>
        <div style="margin-top:1.6rem" class="reveal">
          <a class="link-arrow" href="/communities" data-link>See all ${counts.communities} communities ${icon("arrow")}</a>
        </div>
      </div></section>

      ${
        events.length
          ? `<section class="section"><div class="wrap">
              ${heading("Coming up", "Rooms forming<br /><em>this month.</em>")}
              <div class="event-list stagger">${events.slice(0, 3).map(eventRow).join("")}</div>
            </div></section>`
          : ""
      }

      <section class="section"><div class="wrap">
        ${heading("Built to be trusted", "Quietly serious about<br /><em>your privacy.</em>", "Trust is a feature, not a page. Here is what that means in practice.", true)}
        <div class="grid-3 stagger">
          <article class="card feature"><div class="icon-box">${icon("shield")}</div><h3>No advertising</h3><p>We do not sell your data, share it for advertising, or run behavioural tracking. There is no ad product here to protect.</p></article>
          <article class="card feature"><div class="icon-box">${icon("lock")}</div><h3>Security by default</h3><p>Salted scrypt password hashing, hashed session tokens, strict CSP, and rate limiting on everything that matters.</p></article>
          <article class="card feature"><div class="icon-box">${icon("download")}</div><h3>Your data, yours</h3><p>Export a complete copy whenever you like, and close your account in two clicks. No retention games.</p></article>
        </div>
        <div style="margin-top:2rem;text-align:center" class="reveal">
          <a class="link-arrow" href="/legal/privacy">Read the privacy policy ${icon("arrow")}</a>
        </div>
      </div></section>

      ${ctaBlock()}
    `);
  }

  // -- communities ---------------------------------------------------------

  function communities() {
    const list = state.public.communities;
    return shell(`
      <section class="hero" style="padding-block:clamp(3rem,2rem+4vw,5rem)">
        ${aurora()}
        <div class="wrap">
          <span class="eyebrow reveal">Communities</span>
          <h1 class="reveal">Twenty rooms.<br /><em>One in your name.</em></h1>
          <p class="hero-sub reveal">Each community is a working group, not an audience. Join the ones where your questions belong.</p>
        </div>
      </section>
      <section class="section"><div class="wrap">
        <h2 class="sr-only">All communities</h2>
        <div class="community-grid stagger">
          ${list
            .map(
              (c) => `<a class="community-card glow" href="${memberHref()}" data-link>
                <h3>${esc(c.name)}</h3>
                <p>${esc(c.description)}</p>
                <span class="meta">${c.member_count > 0 ? `${c.member_count} members` : "Open to new members"}</span>
              </a>`
            )
            .join("")}
        </div>
      </div></section>
      ${ctaBlock()}
    `);
  }

  // -- events --------------------------------------------------------------

  function eventRow(event) {
    const date = shortDate(event.starts_at);
    return `<article class="event-card">
      <div class="event-date"><b>${date.day}</b><span>${date.month}</span></div>
      <div class="event-body">
        <h3>${esc(event.title)}</h3>
        <div class="event-meta">
          <span>${icon("clock")} ${esc(formatDate(event.starts_at))}</span>
          <span>${icon("globe")} ${esc(event.format || "online")}</span>
          ${event.community_name ? `<span>${icon("users")} ${esc(event.community_name)}</span>` : ""}
          <span>${Number(event.price_pence) ? `£${(Number(event.price_pence) / 100).toFixed(2)}` : "Free"}</span>
        </div>
      </div>
      <a class="button ghost small" href="${memberHref()}" data-link>Details</a>
    </article>`;
  }

  function events() {
    const list = state.public.events;
    return shell(`
      <section class="hero" style="padding-block:clamp(3rem,2rem+4vw,5rem)">
        ${aurora()}
        <div class="wrap">
          <span class="eyebrow reveal">Events</span>
          <h1 class="reveal">Small rooms.<br /><em>Real conversation.</em></h1>
          <p class="hero-sub reveal">Online, in person and hybrid. Hosted by members, capped so that everyone can speak.</p>
        </div>
      </section>
      <section class="section"><div class="wrap">
        ${
          list.length
            ? `<div class="event-list stagger">${list.map(eventRow).join("")}</div>`
            : empty(
                "No events scheduled yet",
                "ARCA is new. The first rooms are being planned now — join and you will see them before anyone else.",
                `<a class="button primary" href="${memberHref()}" data-link>${memberLabel()}</a>`
              )
        }
        <div class="card" style="margin-top:2rem;background:var(--bone)">
          <h3 style="margin-bottom:.5rem">${icon("shield")} Before you attend</h3>
          <p style="font-size:.9rem;color:var(--muted)">Events are organised by members, not by ARCA. We do not vet hosts, venues or attendees. Read the event details, use your judgement, and see our <a href="/legal/terms">Terms</a> for how responsibility works.</p>
        </div>
      </div></section>
      ${ctaBlock()}
    `);
  }

  // -- for hosts -----------------------------------------------------------

  function hosts() {
    return shell(`
      <section class="hero" style="padding-block:clamp(3rem,2rem+4vw,5rem)">
        ${aurora()}
        <div class="wrap">
          <span class="eyebrow reveal">For hosts</span>
          <h1 class="reveal">Run the room<br /><em>people remember.</em></h1>
          <p class="hero-sub reveal">Registration, capacity, formats and a workspace built for the person doing the organising.</p>
          <div class="hero-actions reveal">
            <a class="button primary large" href="${memberHref()}" data-link>Start hosting ${icon("arrow", 'class="arrow"')}</a>
          </div>
        </div>
      </section>

      <section class="section"><div class="wrap">
        ${heading("What you get", "Everything the evening<br /><em>actually needs.</em>")}
        <div class="grid-3 stagger">
          <article class="card feature"><div class="icon-box">${icon("calendar")}</div><h3>Proper registration</h3><p>Capacity limits, a live attendee count, and cancellation handled for you.</p></article>
          <article class="card feature"><div class="icon-box">${icon("globe")}</div><h3>Any format</h3><p>Online, in person or hybrid. Meeting links stay private until someone registers.</p></article>
          <article class="card feature"><div class="icon-box">${icon("users")}</div><h3>The right room</h3><p>Attach your event to a community so it reaches people who actually care.</p></article>
        </div>
      </div></section>

      <section class="section on-ink">
        ${aurora()}
        <div class="wrap">
          ${heading("Host responsibilities", "The part<br /><em>worth reading.</em>", "Hosting on ARCA means taking real responsibility. We are the listing; you are the organiser.")}
          <div class="grid-2 stagger">
            <article class="card"><h3>You are the organiser</h3><p>ARCA provides the tooling. The event is yours — its lawfulness, safety and suitability are your responsibility.</p></article>
            <article class="card"><h3>Venues and insurance</h3><p>For in-person events you are responsible for the venue, any licences, and holding appropriate public liability insurance.</p></article>
            <article class="card"><h3>Safeguard your attendees</h3><p>Describe the event honestly, moderate the room, and act on concerns. Report anything serious to us immediately.</p></article>
            <article class="card"><h3>Costs are yours to declare</h3><p>Any venue, catering or third-party cost must be shown on the listing. ARCA does not handle event money.</p></article>
          </div>
          <p style="margin-top:2rem"><a class="link-arrow" style="color:#fff;border-color:rgba(255,255,255,.3)" href="/legal/terms">Read section 5 of the Terms ${icon("arrow")}</a></p>
        </div>
      </section>

      <section class="section"><div class="wrap">
        ${heading("Host questions", "Asked and<br /><em>answered.</em>")}
        ${faq([
          ["Who can host?", "Plus includes one hosted event per year. Pro and Founding Pro include unlimited hosting, subject to ARCA's community standards."],
          ["Can I charge for tickets?", "Not yet. Paid ticketing is not open, so all events are currently free to attend. Any direct third-party cost must be disclosed on the listing and settled between you and that provider."],
          ["What if I need to cancel?", "Cancel from your host workspace and every registration is cancelled at the same time. Tell your attendees directly as well — it is your event."],
          ["Does ARCA vet my attendees?", "No. We do not vet, background-check or endorse any member. You are responsible for who you admit and for the safety of your event."],
        ])}
      </div></section>

      ${ctaBlock()}
    `);
  }

  // -- pricing -------------------------------------------------------------

  function plan(name, amount, tagline, features, featured = false) {
    const annual = state.billing === "annual";
    const code = state.currency;
    const symbol = CURRENCIES[code].symbol;
    const displayed = amount ? formatMoney(amount * (annual ? 10 : 1), code, symbol) : "Free";
    const period = amount ? (annual ? "/ year" : "/ month") : "always";
    const note = amount
      ? annual
        ? `${formatMoney(Math.round((amount * 10) / 12), code, symbol)} a month, billed annually`
        : `${formatMoney(amount * 12, code, symbol)} per year when paid monthly`
      : "A good place to begin. No card required.";
    const label = name === "Free" ? "Start with Free" : state.public.counts.foundingRemaining > 0 && name === "Pro" ? "Claim Founding Pro" : `Choose ${name}`;

    return `<article class="plan${featured ? " featured" : ""}">
      <p class="plan-name">${esc(name)}</p>
      <div class="plan-price"><strong>${esc(displayed)}</strong><span>${esc(period)}</span></div>
      <p class="plan-note">${esc(note)}</p>
      <p class="plan-tagline">${esc(tagline)}</p>
      <ul>${features.map((f) => `<li>${icon("check")}<span>${esc(f)}</span></li>`).join("")}</ul>
      <a class="button ${featured ? "primary" : "ghost"}" href="${memberHref()}" data-link>${esc(label)}</a>
      ${amount ? `<span class="plan-coming">Paid checkout is not open yet.</span>` : ""}
    </article>`;
  }

  function pricing() {
    const code = CURRENCIES[state.currency] ? state.currency : "GBP";
    const p = CURRENCIES[code];
    const annual = state.billing === "annual";
    const remaining = state.public.counts.foundingRemaining;
    const claimed = Math.max(0, 300 - remaining);

    return shell(`
      <section class="hero" style="padding-block:clamp(3rem,2rem+4vw,5rem)">
        ${aurora()}
        <div class="wrap" style="text-align:center">
          <span class="eyebrow reveal">Your membership</span>
          <h1 class="reveal">A little investment.<br /><em>A world of possibility.</em></h1>
          <p class="hero-sub reveal" style="margin-inline:auto;max-width:44ch">Find your people. Make time for connection. Choose the membership that makes room for both.</p>
        </div>
      </section>

      <section class="section" style="padding-top:0"><div class="wrap">
        <div class="pricing-controls reveal">
          <div class="billing-toggle" role="group" aria-label="Billing period">
            <button type="button" data-billing="monthly" class="${!annual ? "active" : ""}" aria-pressed="${!annual}">Monthly</button>
            <button type="button" data-billing="annual" class="${annual ? "active" : ""}" aria-pressed="${annual}">Yearly <span>2 months free</span></button>
          </div>
          <label class="currency-select">
            <span>Currency</span>
            <select id="currency" aria-label="Pricing currency">
              ${Object.keys(CURRENCIES)
                .map((c) => `<option value="${c}"${c === code ? " selected" : ""}>${c}</option>`)
                .join("")}
            </select>
          </label>
        </div>

        ${
          remaining > 0
            ? `<div class="founding-strip reveal">
                 <p><strong>You are early. That means something.</strong>The first 300 members get Pro for life, free. ${remaining} places remain.</p>
                 <a class="button primary small" href="${memberHref()}" data-link>Claim your place ${icon("arrow", 'class="arrow"')}</a>
               </div>
               <div class="meter reveal" style="margin-bottom:2rem"><i data-fill="${(claimed / 300) * 100}"></i></div>`
            : ""
        }

        <div class="plan-grid stagger">
          ${plan("Free", 0, "A place in the network. A reason to say hello.", [
            "A profile, links and intro video",
            "Access to focused communities",
            "Up to 2 event registrations per month",
            "Member connections and messages",
          ])}
          ${plan("Plus", p.plus, "For the naturally curious and well connected.", [
            "Unlimited event attendance",
            "1 hosted event per year",
            "Your own event workspace",
            "All your conversations in one place",
          ], true)}
          ${plan("Pro", p.pro, "For the people who bring people together.", [
            "Unlimited event hosting",
            "Event registration and capacity controls",
            "Online, in-person and hybrid formats",
            "Your community, your conversations",
          ])}
        </div>

        <div class="price-footnotes reveal">
          <span>${icon("check")} No card for founding membership</span>
          <span>${icon("check")} No advertising</span>
          <span>${icon("check")} Direct event costs agreed first</span>
        </div>
        <p class="price-disclosure">Prices are shown in ${esc(code)}. Yearly membership is billed as one annual amount at the price of ten monthly payments. Paid subscriptions are not currently available — no card details are collected. Final charges, applicable taxes and cancellation terms will be shown before checkout ever opens. Direct third-party event costs are separate.</p>
      </div></section>

      <section class="section"><div class="wrap">
        ${heading("The details, simply", "One network.<br /><em>Your way to be part of it.</em>")}
        <div class="table-scroll" tabindex="0" role="region" aria-label="Membership comparison">
          <table class="comparison">
            <thead><tr><th scope="col">What is included</th><th scope="col">Free</th><th scope="col">Plus</th><th scope="col">Pro</th></tr></thead>
            <tbody>
              ${[
                ["Profile, photos & intro video", "Included", "Included", "Included"],
                ["Communities", "Included", "Included", "Included"],
                ["Member connections & messages", "Included", "Included", "Included"],
                ["Event attendance", "2 per month", "Unlimited", "Unlimited"],
                ["Hosted events", "—", "1 per year", "Unlimited"],
                ["Event workspace", "—", "Included", "Included"],
              ]
                .map(
                  (row) =>
                    `<tr><th scope="row">${esc(row[0])}</th>${row
                      .slice(1)
                      .map(
                        (cell) =>
                          `<td>${
                            cell === "Included"
                              ? `<span class="included">${icon("check")}<span class="sr-only">Included</span></span>`
                              : esc(cell)
                          }</td>`
                      )
                      .join("")}</tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
        <p class="price-disclosure">Founding Pro includes all Pro features with no recurring subscription charge for the life of your account.</p>
      </div></section>

      <section class="section"><div class="wrap">
        ${heading("Membership, explained", "A little<br /><em>clarity.</em>")}
        ${faq([
          ["How does Founding Pro work?", "The first 300 members get Pro for the life of their account, with no subscription fee. Your founding status is attached to your account. The number of places still available is shown above."],
          ["What does yearly billing save?", "A yearly membership costs the equivalent of ten monthly payments, giving you two months free compared with paying monthly for a full year. The full annual amount is displayed when you choose Yearly."],
          ["Can I pay for a membership now?", "No — paid checkout is not open and we collect no card details. You can create your account now and receive Founding Pro while places remain. We will clearly show the charge, billing period and cancellation terms before offering paid subscriptions."],
          ["Are all events free?", "Membership gives you the attendance and hosting allowance shown above. A venue, catering, a third-party platform or another direct event cost may be separate. Review an event's details before registering."],
          ["Can I host with Plus?", "Yes. Plus includes one hosted event per year. Pro and Founding Pro include unlimited hosting, subject to ARCA's community standards."],
          ["What happens to my data if I leave?", "You can export everything at any time, and closing your account deletes your personal data within 30 days. The full schedule is on our data retention page."],
        ])}
      </div></section>

      ${ctaBlock()}
    `);
  }

  // -- auth ----------------------------------------------------------------

  const asideBlock = () => `<aside class="auth-aside">
    ${aurora()}
    <blockquote>“The best introductions happen in small rooms, between people who actually showed up.”</blockquote>
    <cite>Why we built ARCA</cite>
    <ul>
      <li>${icon("check")}<span>Real profiles, one account per person</span></li>
      <li>${icon("check")}<span>No advertising and no data selling</span></li>
      <li>${icon("check")}<span>Export or delete your data whenever you like</span></li>
      <li>${icon("check")}<span>Founding Pro free for the first 300 members</span></li>
    </ul>
  </aside>`;

  function authPage(mode) {
    const join = mode === "join";
    const remaining = state.public.counts.foundingRemaining;
    const maxDob = new Date(Date.now() - 18 * 365.25 * 86_400_000).toISOString().slice(0, 10);

    return `${header()}<main id="main" class="page-enter"><div class="auth-shell">
      <div class="auth-form-side">
        <div class="auth-card reveal">
          ${join && remaining > 0 ? `<span class="pill pill-orange" style="margin-bottom:1rem">${remaining} founding places left</span>` : ""}
          <h1>${join ? "Create your account" : "Welcome back"}</h1>
          <p>${join ? "A profile, a few rooms, and people worth knowing." : "Sign in to pick up where you left off."}</p>

          <form id="auth-form" method="post" action="/api/auth/${join ? "register" : "login"}" data-mode="${mode}" novalidate>
            ${
              join
                ? `<label class="field"><span>Full name</span>
                     <input name="name" type="text" autocomplete="name" required minlength="2" maxlength="120" placeholder="Elena Marsh" />
                   </label>
                   <label class="field"><span>What you do</span>
                     <input name="role" type="text" autocomplete="organization-title" maxlength="80" placeholder="Fractional COO" />
                   </label>`
                : ""
            }
            <label class="field"><span>Email address</span>
              <input name="email" type="email" autocomplete="email" required placeholder="you@company.com" />
            </label>
            <label class="field"><span>Password</span>
              <input name="password" type="password" autocomplete="${join ? "new-password" : "current-password"}" required minlength="${join ? 10 : 1}" placeholder="${join ? "At least 10 characters" : ""}" />
              ${join ? `<div class="password-meter" aria-hidden="true"><i></i><i></i><i></i></div><p class="field-help">At least 10 characters. Avoid your name or email address.</p>` : ""}
            </label>
            ${
              join
                ? `<label class="field"><span>Date of birth</span>
                     <input name="date_of_birth" type="date" required max="${maxDob}" />
                     <p class="field-help">ARCA is for adults aged 18 and over. We keep only the confirmation, never the date.</p>
                   </label>
                   <div class="legal-consent">
                     <label class="check">
                       <input type="checkbox" name="accept_terms" required />
                       <span>I am 18 or over, and I agree to the <a href="/legal/terms">Terms of Service</a>, the <a href="/legal/acceptable-use">Acceptable Use Policy</a> and the <a href="/legal/privacy">Privacy Policy</a>.</span>
                     </label>
                   </div>
                   <div class="hp" aria-hidden="true">
                     <label>Company website<input name="company_website" type="text" tabindex="-1" autocomplete="off" /></label>
                   </div>`
                : `<label class="check"><input type="checkbox" name="remember" /><span>Remember my email address on this device</span></label>`
            }
            <button class="button primary large full" type="submit">${join ? "Create my account" : "Log in"} ${icon("arrow", 'class="arrow"')}</button>
          </form>

          <div class="or"><span>or</span></div>
          <a class="oauth-button" href="/api/oauth/google/start" data-oauth${join ? ' data-oauth-join="1"' : ""}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6z"/><path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A11.9 11.9 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.6 14.7a7.1 7.1 0 0 1 0-4.6v-3H1.8a12 12 0 0 0 0 10.6z"/><path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.2-3.2A11.6 11.6 0 0 0 12 0 11.9 11.9 0 0 0 1.8 6.1l3.8 3a7.1 7.1 0 0 1 6.4-4.3z"/></svg>
            Continue with Google
          </a>

          <p class="form-switch">
            ${
              join
                ? `Already a member? <a href="/login" data-link>Log in</a>`
                : `New to ARCA? <a href="/join" data-link>Create an account</a> · <a href="/forgot-password" data-link>Forgot password</a>`
            }
          </p>
        </div>
      </div>
      ${asideBlock()}
    </div></main>`;
  }

  function utilityPage(kind) {
    const copy = {
      verify: ["Confirming your email", "One moment while we activate your account."],
      forgot: ["Reset your password", "Enter your email address and we will send you a link."],
      reset: ["Choose a new password", "Pick something you have not used elsewhere."],
      sent: ["Check your email", "If that address has an ARCA account, a link is on its way."],
    }[kind] || ["ARCA", ""];

    const form = {
      forgot: `<form id="forgot-form" novalidate>
          <label class="field"><span>Email address</span><input name="email" type="email" autocomplete="email" required /></label>
          <button class="button primary large full" type="submit">Send the link ${icon("arrow", 'class="arrow"')}</button>
        </form>`,
      reset: `<form id="reset-form" novalidate>
          <label class="field"><span>New password</span>
            <input name="password" type="password" autocomplete="new-password" required minlength="10" />
            <div class="password-meter" aria-hidden="true"><i></i><i></i><i></i></div>
          </label>
          <button class="button primary large full" type="submit">Save and sign in</button>
        </form>`,
      verify: `<div style="display:flex;align-items:center;gap:.7rem;color:var(--muted)"><span class="spinner"></span> Verifying…</div>`,
      sent: `<a class="button ghost large full" href="/login" data-link>Back to sign in</a>`,
    }[kind] || "";

    return `${header()}<main id="main" class="page-enter"><div class="auth-shell">
      <div class="auth-form-side">
        <div class="auth-card reveal">
          <h1>${esc(copy[0])}</h1>
          <p>${esc(copy[1])}</p>
          ${form}
          <p class="form-switch"><a href="/login" data-link>Return to sign in</a></p>
        </div>
      </div>
      ${asideBlock()}
    </div></main>`;
  }

  function notFound() {
    return shell(`<div class="notfound">
      <div class="code" aria-hidden="true">404</div>
      <h1>This room does not exist</h1>
      <p style="color:var(--muted)">The page you were looking for has moved, or never existed.</p>
      <div class="hero-actions" style="justify-content:center">
        <a class="button primary" href="/" data-link>Back to the entrance ${icon("arrow", 'class="arrow"')}</a>
        <a class="button ghost" href="/communities" data-link>Browse communities</a>
      </div>
    </div>`);
  }

  return { shell, header, footer, landing, communities, events, hosts, pricing, authPage, utilityPage, notFound, eventRow };
}
