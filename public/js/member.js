// Signed-in member area.

import {
  esc, icon, avatar, empty, formatDate, shortDate, relativeTime,
  countryOptions, placeOf, plural,
} from "./ui.js";

const NAV = [
  ["/app", "home", "Home"],
  ["/app/discover", "discover", "Discover"],
  ["/app/communities", "people", "Communities"],
  ["/app/events", "events", "Events"],
  ["/app/host", "host", "Host"],
  ["/app/network", "network", "Network"],
  ["/app/messages", "messages", "Messages"],
  ["/app/settings", "settings", "Settings"],
];

export function createMember(state) {
  const me = () => state.me || {};
  const profile = () => state.profile || {};

  function sidebar() {
    const path = location.pathname;
    const nav = [...NAV];
    if (me().isAdmin) nav.push(["/app/admin", "shield", "Moderation"]);

    return `<aside class="sidebar">
      <a class="brand" href="/" data-link><img src="/images/logo.svg" width="28" height="28" alt="" /><span>ARCA</span></a>
      <div>
        <p class="sidebar-label">Your network</p>
        <nav aria-label="Member">
          ${nav
            .map(
              ([href, ico, label]) =>
                `<a href="${href}" data-link${path === href ? ' class="active" aria-current="page"' : ""}>${icon(ico)}<span>${label}</span></a>`
            )
            .join("")}
        </nav>
      </div>
      <div class="sidebar-foot">
        <div class="sidebar-me">
          ${avatar({ name: me().name, photo: profile().photo }, "sm")}
          <span><strong>${esc(me().name || "")}</strong><span>${esc(planLabel(me().plan))}</span></span>
        </div>
        <a class="button ghost small on-dark" href="#" data-action="logout">${icon("logout")} Sign out</a>
      </div>
    </aside>`;
  }

  const planLabel = (plan) =>
    ({ free: "Free", plus: "Plus", pro: "Pro", founding_pro: "Founding Pro" }[plan] || "Member");

  const shell = (content) =>
    `<div class="app-shell">${sidebar()}<main id="main" class="app-main page-enter"><div class="app-inner">${content}</div></main></div>`;

  const head = (eyebrow, title, copy = "", actions = "") =>
    `<div class="page-head reveal">
      <div><span class="eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1>${copy ? `<p>${esc(copy)}</p>` : ""}</div>
      ${actions ? `<div>${actions}</div>` : ""}
    </div>`;

  // -- dashboard -----------------------------------------------------------

  function dashboard() {
    const counts = state.public.counts;
    const upcoming = state.events.filter((e) => e.registered || e.is_host).slice(0, 3);
    const suggestions = state.members.filter((m) => !m.connected).slice(0, 3);
    const founding = me().foundingNumber;

    return shell(`
      ${head("Welcome back", (me().name || "").split(" ")[0] || "Hello", "Here is where things stand today.")}

      ${
        founding
          ? `<div class="founding-strip reveal" style="margin-bottom:1.2rem">
               <p><strong>Founding member #${founding}</strong>Founding Pro is attached to your account for life.</p>
             </div>`
          : ""
      }

      ${
        !profile().tagline
          ? `<div class="panel reveal" style="border-color:var(--orange);background:var(--orange-tint)">
               <h2>Your profile is not finished</h2>
               <p>Members with a tagline and a photo get far more connections. It takes two minutes.</p>
               <a class="button primary" href="/onboarding" data-link>Finish my profile ${icon("arrow", 'class="arrow"')}</a>
             </div>`
          : ""
      }

      <div class="stat-row stagger">
        <div class="stat"><b class="counter" data-count="${state.network.length}">0</b><span>Connections</span></div>
        <div class="stat"><b class="counter" data-count="${state.events.filter((e) => e.registered).length}">0</b><span>Events booked</span></div>
        <div class="stat"><b class="counter" data-count="${state.communities.filter((c) => c.joined).length}">0</b><span>Communities joined</span></div>
        <div class="stat"><b class="counter" data-count="${counts.members}">0</b><span>Members on ARCA</span></div>
      </div>

      <div class="panel reveal">
        <h2>Your next rooms</h2>
        <p>Events you are hosting or attending.</p>
        ${
          upcoming.length
            ? `<div class="event-list">${upcoming.map(eventCard).join("")}</div>`
            : empty("Nothing booked yet", "Browse what is coming up and claim a seat.", `<a class="button primary" href="/app/events" data-link>See events</a>`)
        }
      </div>

      <div class="panel reveal">
        <h2>People worth meeting</h2>
        <p>Recently joined members you have not connected with.</p>
        ${
          suggestions.length
            ? `<div class="member-grid stagger">${suggestions.map(memberCard).join("")}</div>`
            : empty("No suggestions right now", "As ARCA grows, this is where new members will appear.")
        }
      </div>
    `);
  }

  // -- discover ------------------------------------------------------------

  function memberCard(member) {
    return `<article class="member-card">
      <div class="member-top">
        ${avatar(member)}
        <span>
          <strong>${esc(member.name)}${member.founding_number ? ` <span class="founding-chip">#${member.founding_number}</span>` : ""}</strong>
          <span>${esc(member.role || "Member")}${placeOf(member) ? ` · ${esc(placeOf(member))}` : ""}</span>
        </span>
      </div>
      ${member.tagline ? `<p>${esc(member.tagline)}</p>` : ""}
      ${member.looking_for ? `<p style="font-size:.84rem;color:var(--muted)"><strong style="color:var(--ink)">Looking for:</strong> ${esc(member.looking_for)}</p>` : ""}
      <div class="member-actions">
        ${
          member.connected
            ? `<a class="button small ghost" href="/app/messages?to=${esc(member.id)}" data-link>${icon("chat")} Message</a>`
            : `<button class="button small primary" data-connect="${esc(member.id)}">Connect</button>`
        }
        <button class="button small ghost" data-report="${esc(member.id)}" aria-label="Report ${esc(member.name)}">${icon("flag")}</button>
        <button class="button small ghost" data-block="${esc(member.id)}" aria-label="Block ${esc(member.name)}">${icon("block")}</button>
      </div>
    </article>`;
  }

  function discover() {
    const list = state.members;
    return shell(`
      ${head("Discover", "Find your people", "Search by name, role, city or what someone is looking for.")}
      <div class="panel reveal">
        <label class="field">
          <span class="sr-only">Search members</span>
          <input type="search" id="member-search" placeholder="Try “operations”, “London” or “investor”" value="${esc(state.query || "")}" />
        </label>
      </div>
      ${
        list.length
          ? `<div class="member-grid stagger">${list.map(memberCard).join("")}</div>`
          : empty("No members match", "Try a different search, or check back as ARCA grows.")
      }
    `);
  }

  // -- communities ---------------------------------------------------------

  function communities() {
    return shell(`
      ${head("Communities", "Your rooms", "Join the communities where your questions belong.")}
      <div class="community-grid stagger">
        ${state.communities
          .map(
            (c) => `<article class="community-card">
              <h3>${esc(c.name)}</h3>
              <p>${esc(c.description)}</p>
              <span class="meta">${c.member_count > 0 ? plural(c.member_count, "member", "members") : "Open to new members"}${c.event_count ? ` · ${plural(c.event_count, "event", "events")}` : ""}</span>
              <button class="button small ${c.joined ? "ghost" : "primary"}" data-community="${esc(c.slug)}" data-joined="${c.joined ? "1" : ""}">
                ${c.joined ? "Leave" : "Join"}
              </button>
            </article>`
          )
          .join("")}
      </div>
    `);
  }

  // -- events --------------------------------------------------------------

  function eventCard(event) {
    const date = shortDate(event.starts_at);
    const full = event.attending >= event.capacity;
    return `<article class="event-card">
      <div class="event-date"><b>${date.day}</b><span>${date.month}</span></div>
      <div class="event-body">
        <h3>${esc(event.title)}</h3>
        <div class="event-meta">
          <span>${icon("clock")} ${esc(formatDate(event.starts_at))}</span>
          <span>${icon("globe")} ${esc(event.format)}</span>
          ${event.venue ? `<span>${icon("pin")} ${esc(event.venue)}</span>` : ""}
          <span>${icon("users")} ${event.attending}/${event.capacity}</span>
          ${event.community_name ? `<span class="pill">${esc(event.community_name)}</span>` : ""}
        </div>
        ${event.meeting_url ? `<p style="margin-top:.6rem;font-size:.85rem"><a href="${esc(event.meeting_url)}" rel="noopener noreferrer" target="_blank">Join link</a></p>` : ""}
      </div>
      <div style="display:grid;gap:.4rem">
        ${
          event.is_host
            ? `<span class="pill pill-orange">You are hosting</span>
               <button class="button small ghost" data-cancel-event="${esc(event.id)}">Cancel event</button>`
            : event.registered
            ? `<span class="pill pill-ok">${icon("check")} Registered</span>
               <button class="button small ghost" data-withdraw="${esc(event.id)}">Withdraw</button>`
            : full
            ? `<span class="pill">Full</span>`
            : `<button class="button small primary" data-register="${esc(event.id)}">Register</button>`
        }
      </div>
    </article>`;
  }

  function events() {
    return shell(`
      ${head("Events", "What is coming up", "Small rooms, hosted by members.", `<a class="button primary" href="/app/host" data-link>Host an event ${icon("arrow", 'class="arrow"')}</a>`)}
      <div class="panel reveal" style="background:var(--bone)">
        <p style="font-size:.88rem;color:var(--muted);margin:0">
          ${icon("shield")} Events are organised by members, not by ARCA. We do not vet hosts, venues or attendees.
          Read the details, use your judgement, and see the <a href="/legal/terms">Terms</a>.
        </p>
      </div>
      ${
        state.events.length
          ? `<div class="event-list stagger">${state.events.map(eventCard).join("")}</div>`
          : empty("No events scheduled", "Be the first to host one.", `<a class="button primary" href="/app/host" data-link>Host an event</a>`)
      }
    `);
  }

  // -- host ----------------------------------------------------------------

  function host() {
    const mine = state.events.filter((e) => e.is_host);
    const plan = me().plan;
    const canHost = plan !== "free";
    const minDate = new Date(Date.now() + 3_600_000).toISOString().slice(0, 16);

    return shell(`
      ${head("Host", "Run the room", "Registration, capacity and formats, handled.")}

      ${
        canHost
          ? `<div class="panel reveal">
        <h2>Create an event</h2>
        <p>${plan === "plus" ? "Plus includes one hosted event per year." : "Your membership includes unlimited hosting."}</p>
        <form id="event-form" novalidate>
          <label class="field"><span>Title</span><input name="title" type="text" required minlength="5" maxlength="180" placeholder="Pricing models for agencies — small dinner" /></label>
          <label class="field"><span>Description</span><textarea name="description" maxlength="5000" placeholder="Who it is for, what you will cover, and what you expect from people in the room."></textarea></label>
          <div class="field-row">
            <label class="field"><span>Starts</span><input name="starts_at" type="datetime-local" required min="${minDate}" /></label>
            <label class="field"><span>Minutes</span><input name="duration_minutes" type="number" min="15" max="480" step="15" value="60" /></label>
          </div>
          <div class="field-row">
            <label class="field"><span>Format</span>
              <select name="format" id="event-format">
                <option value="online">Online</option>
                <option value="in-person">In person</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </label>
            <label class="field"><span>Capacity</span><input name="capacity" type="number" min="2" max="10000" value="20" /></label>
          </div>
          <label class="field"><span>Community (optional)</span>
            <select name="community_id">
              <option value="">No community</option>
              ${state.communities.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("")}
            </select>
          </label>
          <label class="field"><span>Venue</span><input name="venue" type="text" maxlength="255" placeholder="Required for in-person and hybrid events" /></label>
          <label class="field"><span>Meeting link</span><input name="meeting_url" type="url" maxlength="500" placeholder="https://…" />
            <p class="field-help">Only shown to you and to people who have registered.</p>
          </label>
          <input type="hidden" name="price_pence" value="0" />
          <p class="field-help" style="margin-bottom:1rem">Events are free to attend while payments are closed. Any direct venue or catering cost is between you and that provider, and must be described above.</p>

          <div class="legal-consent">
            <label class="check">
              <input type="checkbox" name="accept_host_terms" required />
              <span>I understand that <strong>I am the organiser of this event, not ARCA</strong>. I am responsible for its lawfulness and safety, for any venue, licence and insurance, and for the wellbeing of attendees, as set out in <a href="/legal/terms">section 5 of the Terms</a>.</span>
            </label>
          </div>
          <button class="button primary large full" type="submit">Publish event ${icon("arrow", 'class="arrow"')}</button>
        </form>
      </div>`
          : `<div class="panel reveal">
               <h2>Hosting is a Plus feature</h2>
               <p>Plus includes one hosted event per year. Pro and Founding Pro include unlimited hosting.</p>
               <a class="button primary" href="/pricing" data-link>See membership ${icon("arrow", 'class="arrow"')}</a>
             </div>`
      }

      <div class="panel reveal">
        <h2>Your events</h2>
        ${mine.length ? `<div class="event-list">${mine.map(eventCard).join("")}</div>` : empty("You have not hosted yet", "Your published events will appear here.")}
      </div>
    `);
  }

  // -- network -------------------------------------------------------------

  function network() {
    return shell(`
      ${head("Network", "Your connections", `${plural(state.network.length, "person", "people")} you can message.`)}
      ${
        state.network.length
          ? `<div class="member-grid stagger">${state.network.map(memberCard).join("")}</div>`
          : empty("No connections yet", "Connect with members from Discover — messaging opens once you do.", `<a class="button primary" href="/app/discover" data-link>Find people</a>`)
      }
    `);
  }

  // -- messages ------------------------------------------------------------

  function messages() {
    const active = state.activeThread;
    const partner = state.network.find((m) => m.id === active) || state.conversations.find((c) => c.id === active);

    return shell(`
      ${head("Messages", "Conversations", "You can message anyone you are connected with.")}
      <div class="messages-layout">
        <div class="conversation-list">
          ${
            state.conversations.length || state.network.length
              ? [...state.conversations, ...state.network.filter((n) => !state.conversations.some((c) => c.id === n.id))]
                  .map(
                    (person) => `<button class="conversation${person.id === active ? " active" : ""}" data-thread="${esc(person.id)}">
                      ${avatar(person, "sm")}
                      <span><strong>${esc(person.name)}</strong><span>${esc(person.last || person.tagline || "Say hello")}</span></span>
                    </button>`
                  )
                  .join("")
              : `<p style="font-size:.88rem;color:var(--muted);padding:1rem">Connect with someone to start talking.</p>`
          }
        </div>
        <div>
          ${
            partner
              ? `<div class="thread">
                  <div class="thread-head">${avatar(partner, "sm")}<div><strong>${esc(partner.name)}</strong></div></div>
                  <div class="thread-body" id="thread-body">
                    ${
                      state.messages.length
                        ? state.messages
                            .map(
                              (m) => `<div class="bubble${m.sender_id === me().id ? " mine" : ""}">${esc(m.body)}<time>${esc(relativeTime(m.created_at))}</time></div>`
                            )
                            .join("")
                        : `<p style="color:var(--muted);font-size:.9rem;margin:auto;text-align:center">No messages yet. Keep the first one short and specific.</p>`
                    }
                  </div>
                  <form class="thread-form" id="message-form" data-to="${esc(partner.id)}">
                    <label class="sr-only" for="message-input">Message</label>
                    <input id="message-input" name="body" type="text" maxlength="3000" placeholder="Write a message…" autocomplete="off" required />
                    <button class="button primary" type="submit">Send</button>
                  </form>
                </div>`
              : empty("Choose a conversation", "Pick someone on the left to see your messages.")
          }
        </div>
      </div>
    `);
  }

  // -- settings ------------------------------------------------------------

  function settings() {
    const motionOff = document.documentElement.dataset.motion === "off";
    return shell(`
      ${head("Settings", "Your account", "Your profile, your data, and your privacy choices.")}

      <div class="panel reveal">
        <h2>Profile</h2>
        <p>This is what other members see.</p>
        ${profileForm()}
      </div>

      <div class="panel reveal">
        <h2>Membership</h2>
        <div class="setting-row">
          <div><h4>${esc(planLabel(me().plan))}</h4><p>${me().foundingNumber ? `Founding member #${me().foundingNumber}. Pro features for the life of your account, with no subscription charge.` : "Paid subscriptions are not open yet. You will always be asked before any charge."}</p></div>
          <a class="button ghost small" href="/pricing" data-link>Compare plans</a>
        </div>
      </div>

      <div class="panel reveal">
        <h2>Privacy and accessibility</h2>
        <div class="setting-row">
          <div><h4>Reduce animation</h4><p>Turns off motion across ARCA. We also respect your system setting automatically.</p></div>
          <label class="switch"><input type="checkbox" id="motion-toggle" ${motionOff ? "checked" : ""} /><i></i></label>
        </div>
        <div class="setting-row">
          <div><h4>Analytics</h4><p>Privacy-minimised page counts, only if you opted in. You can change this at any time.</p></div>
          <button class="button ghost small" data-action="cookie-settings">Cookie settings</button>
        </div>
        <div class="setting-row">
          <div><h4>Blocked members</h4><p>${state.blocks.length ? state.blocks.map((b) => esc(b.name)).join(", ") : "You have not blocked anyone."}</p></div>
          ${state.blocks.length ? `<button class="button ghost small" data-action="manage-blocks">Manage</button>` : ""}
        </div>
      </div>

      <div class="panel reveal">
        <h2>Your data</h2>
        <div class="setting-row">
          <div><h4>Export everything</h4><p>A complete machine-readable copy of the personal data ARCA holds about you, immediately.</p></div>
          <a class="button ghost small" href="/api/account/export" download>${icon("download")} Export</a>
        </div>
        <div class="setting-row">
          <div><h4>How long we keep things</h4><p>Every retention period is published, from session tokens to backups.</p></div>
          <a class="button ghost small" href="/legal/retention">View schedule</a>
        </div>
      </div>

      <div class="panel danger-zone reveal">
        <h2>Close your account</h2>
        <p style="color:var(--muted);font-size:.9rem;margin-bottom:1.2rem">This deletes your profile, messages, connections and any events you host. It cannot be undone. Data is removed from live systems immediately and from backups within 35 days.</p>
        <button class="button danger" data-action="delete-account">Close my account</button>
      </div>
    `);
  }

  function profileForm(onboarding = false) {
    const p = profile();
    return `<form id="profile-form" novalidate>
      <div class="field-row">
        <label class="field"><span>Tagline</span><input name="tagline" type="text" maxlength="180" value="${esc(p.tagline || "")}" placeholder="Fractional COO for scaling teams" /></label>
        <label class="field"><span>Looking for</span><input name="looking_for" type="text" maxlength="255" value="${esc(p.looking_for || "")}" placeholder="Operators who have scaled past 50 people" /></label>
      </div>
      <label class="field"><span>About you</span><textarea name="description" maxlength="3000" placeholder="A few honest sentences.">${esc(p.description || "")}</textarea></label>
      <div class="field-row">
        <label class="field"><span>City</span><input name="location" type="text" maxlength="160" value="${esc(p.location || "")}" placeholder="London" /></label>
        <label class="field"><span>Country</span><select name="country">${countryOptions(p.country || "")}</select></label>
      </div>
      <div class="field-row">
        <label class="field"><span>Website</span><input name="website" type="url" maxlength="500" value="${esc(p.website || "")}" placeholder="https://" /></label>
        <label class="field"><span>LinkedIn</span><input name="linkedin" type="url" maxlength="500" value="${esc(p.linkedin || "")}" placeholder="https://www.linkedin.com/in/…" /></label>
      </div>

      <div class="field-row">
        <div class="field">
          <span class="field-label">Profile photo</span>
          <label class="upload-drop" data-upload="photo">
            <input type="file" accept="image/png,image/jpeg,image/webp" />
            ${p.photo ? `<img class="upload-preview" src="${esc(p.photo)}" alt="" />` : `${icon("upload")}<span>PNG, JPEG or WebP · up to 2MB</span>`}
          </label>
        </div>
        <div class="field">
          <span class="field-label">Banner</span>
          <label class="upload-drop" data-upload="banner">
            <input type="file" accept="image/png,image/jpeg,image/webp" />
            ${p.banner ? `<img class="upload-preview" src="${esc(p.banner)}" alt="" />` : `${icon("upload")}<span>PNG, JPEG or WebP · up to 4MB</span>`}
          </label>
        </div>
      </div>

      <p class="field-help" style="margin-bottom:1rem">Only upload images you have the right to use. Your completed profile is visible to other signed-in members.</p>
      <button class="button primary large${onboarding ? " full" : ""}" type="submit">${onboarding ? "Finish and enter ARCA" : "Save profile"} ${icon("arrow", 'class="arrow"')}</button>
    </form>`;
  }

  function onboarding() {
    const p = profile();
    const done = [Boolean(p.tagline), Boolean(p.description), Boolean(p.photo)];
    return `<main id="main" class="page-enter"><div class="onboarding-shell">
      <div class="reveal">
        <a class="brand" href="/" data-link style="margin-bottom:2rem"><img src="/images/logo.svg" width="30" height="30" alt="" /><span>ARCA</span></a>
        <div class="progress-track">${done.map((d) => `<i class="${d ? "done" : ""}"></i>`).join("")}</div>
        <span class="eyebrow">Welcome${me().foundingNumber ? ` — founding member #${me().foundingNumber}` : ""}</span>
        <h1 style="margin-bottom:.7rem">Let people know<br /><em>who they are meeting.</em></h1>
        <p style="color:var(--muted);margin-bottom:2rem">A profile takes two minutes and decides whether anyone replies. You can change all of it later.</p>
        ${profileForm(true)}
      </div>
    </div></main>`;
  }

  // -- admin ---------------------------------------------------------------

  function admin() {
    const data = state.admin;
    if (!data) return shell(`<div class="panel"><span class="spinner"></span> Loading…</div>`);
    const { analytics, reports, health } = data;

    return shell(`
      ${head("Moderation", "Service health", "Reports, usage and configuration.")}
      <div class="panel reveal">
        <h2>Configuration</h2>
        <div class="health-grid">
          <div class="health-item"><span>Storage</span><strong>${esc(health.store)}</strong></div>
          <div class="health-item"><span>Email</span><strong>${health.smtp ? "Configured" : "Not configured"}</strong></div>
          <div class="health-item"><span>Operator identity</span><strong>${health.operatorConfigured ? "Set" : "NOT SET"}</strong></div>
          <div class="health-item"><span>Payments</span><strong>${health.paymentsOpen ? "Open" : "Closed"}</strong></div>
        </div>
        ${!health.operatorConfigured ? `<p class="field-error" style="margin-top:1rem">Operator identity is not configured. Set OPERATOR_RESPONSIBLE and OPERATOR_ADDRESS before launch — sign-up is blocked in production until you do.</p>` : ""}
      </div>

      <div class="stat-row stagger">
        <div class="stat"><b>${analytics.members}</b><span>Members</span></div>
        <div class="stat"><b>${analytics.today}</b><span>Views today</span></div>
        <div class="stat"><b>${analytics.total}</b><span>Views total</span></div>
        <div class="stat"><b>${analytics.openReports}</b><span>Open reports</span></div>
      </div>

      <div class="panel reveal">
        <h2>Open reports</h2>
        ${
          reports.length
            ? reports
                .map(
                  (r) => `<div class="report-card">
                    <p class="meta">${esc(r.reporter_name || "Removed")} reported ${esc(r.subject_name || "Removed")} · ${esc(relativeTime(r.created_at))}</p>
                    <p>${esc(r.reason)}</p>
                    <button class="button small ghost" data-resolve="${esc(r.id)}">Mark reviewed</button>
                  </div>`
                )
                .join("")
            : empty("Nothing to review", "Open reports will appear here.")
        }
      </div>

      <div class="panel reveal">
        <h2>Most visited</h2>
        ${
          analytics.topPaths.length
            ? `<div class="table-scroll"><table><thead><tr><th>Path</th><th>Views</th></tr></thead><tbody>
                ${analytics.topPaths.map((p) => `<tr><td>${esc(p.path)}</td><td>${p.views}</td></tr>`).join("")}
              </tbody></table></div>`
            : empty("No analytics yet", "Page views appear once members opt in.")
        }
      </div>
    `);
  }

  return { shell, dashboard, discover, communities, events, host, network, messages, settings, onboarding, admin, memberCard, eventCard };
}
