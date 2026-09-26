// Product behaviour: plan limits, pricing integrity, membership flows.

import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryStore } from "../lib/store-memory.mjs";
import { CURRENCIES, PLANS, FOUNDING_LIMIT, COMPARISON_ROWS } from "../lib/config.mjs";
import { LEGAL_DOCS, LEGAL_ORDER, renderLegalPage } from "../lib/legal.mjs";
import { sitemap, robots, metaFor, PUBLIC_PAGES } from "../lib/routes.mjs";

const future = (days = 7) => new Date(Date.now() + days * 86_400_000);

async function seedUser(store, overrides = {}) {
  return store.register({
    name: "Member",
    email: `u${Math.random().toString(36).slice(2)}@example.com`,
    password_hash: null,
    role: "Member",
    email_verified: true,
    ...overrides,
  });
}

// --- pricing ---------------------------------------------------------------

test("the pricing table matches the previous product exactly", () => {
  assert.equal(CURRENCIES.GBP.plus, 29);
  assert.equal(CURRENCIES.GBP.pro, 149);
  assert.equal(CURRENCIES.USD.plus, 49);
  assert.equal(CURRENCIES.USD.pro, 199);
  assert.equal(CURRENCIES.EUR.plus, 39);
  assert.equal(CURRENCIES.EUR.pro, 179);
  assert.equal(CURRENCIES.INR.pro, 14999);
  assert.equal(CURRENCIES.JPY.plus, 5900);
  assert.equal(Object.keys(CURRENCIES).length, 16);
});

test("every currency has a symbol and both tiers priced", () => {
  for (const [code, value] of Object.entries(CURRENCIES)) {
    assert.ok(value.symbol, `${code} symbol`);
    assert.ok(value.plus > 0, `${code} plus`);
    assert.ok(value.pro > value.plus, `${code} pro should exceed plus`);
  }
});

test("plan allowances match what the pricing page advertises", () => {
  assert.equal(PLANS.free.monthlyRegistrations, 2);
  assert.equal(PLANS.free.eventsPerYear, 0);
  assert.equal(PLANS.plus.eventsPerYear, 1);
  assert.equal(PLANS.plus.monthlyRegistrations, Infinity);
  assert.equal(PLANS.pro.eventsPerYear, Infinity);
  assert.equal(PLANS.founding_pro.eventsPerYear, Infinity);

  const hosted = COMPARISON_ROWS.find((row) => row[0] === "Hosted events");
  assert.deepEqual(hosted, ["Hosted events", "—", "1 per year", "Unlimited"]);
  const attendance = COMPARISON_ROWS.find((row) => row[0] === "Event attendance");
  assert.deepEqual(attendance, ["Event attendance", "2 per month", "Unlimited", "Unlimited"]);
});

// --- founding members ------------------------------------------------------

test("the first members receive Founding Pro and a founding number", async () => {
  const store = new MemoryStore();
  const first = await seedUser(store);
  assert.equal(first.plan, "founding_pro");
  assert.equal(first.foundingNumber, 1);

  const counts = await store.counts();
  assert.equal(counts.foundingRemaining, FOUNDING_LIMIT - 1);
});

test("a new member starts with nothing", async () => {
  const store = new MemoryStore();
  const user = await seedUser(store);
  assert.deepEqual(await store.network(user.id), []);
  assert.deepEqual(await store.listMembers(user.id), []);
  assert.deepEqual(await store.conversations(user.id), []);
});

// --- plan enforcement ------------------------------------------------------

test("free members are capped at two event registrations a month", async () => {
  const store = new MemoryStore();
  const host = await seedUser(store);
  const guest = await seedUser(store);
  store.users.get(guest.id).plan = "free";

  const ids = [];
  for (let i = 0; i < 3; i += 1) {
    ids.push(
      await store.createEvent(host, {
        title: `Event ${i}`, description: "", starts_at: future(i + 1),
        duration_minutes: 60, format: "online", venue: "", meeting_url: "",
        price_pence: 0, capacity: 50,
      })
    );
  }

  await store.registerEvent(guest.id, ids[0]);
  await store.registerEvent(guest.id, ids[1]);
  await assert.rejects(() => store.registerEvent(guest.id, ids[2]), /two event registrations/);
});

test("plus members may host once a year; pro is unlimited", async () => {
  const store = new MemoryStore();
  const plus = await seedUser(store);
  store.users.get(plus.id).plan = "plus";

  const draft = (title) => ({
    title, description: "", starts_at: future(3), duration_minutes: 60,
    format: "online", venue: "", meeting_url: "", price_pence: 0, capacity: 20,
  });

  await store.createEvent(plus, draft("First"));
  await assert.rejects(() => store.createEvent(plus, draft("Second")), /one hosted event per year/);

  store.users.get(plus.id).plan = "pro";
  await store.createEvent(plus, draft("Third"));
  await store.createEvent(plus, draft("Fourth"));
});

test("capacity is enforced", async () => {
  const store = new MemoryStore();
  const host = await seedUser(store);
  const a = await seedUser(store);
  const b = await seedUser(store);

  const id = await store.createEvent(host, {
    title: "Tiny room", description: "", starts_at: future(2), duration_minutes: 60,
    format: "online", venue: "", meeting_url: "", price_pence: 0, capacity: 2,
  });
  await store.registerEvent(a.id, id);
  await store.registerEvent(b.id, id);

  const c = await seedUser(store);
  await assert.rejects(() => store.registerEvent(c.id, id), /now full/);
});

test("a host cannot register for their own event", async () => {
  const store = new MemoryStore();
  const host = await seedUser(store);
  const id = await store.createEvent(host, {
    title: "My own event", description: "", starts_at: future(2), duration_minutes: 60,
    format: "online", venue: "", meeting_url: "", price_pence: 0, capacity: 10,
  });
  await assert.rejects(() => store.registerEvent(host.id, id), /hosting this event/);
});

test("meeting links are hidden from members who have not registered", async () => {
  const store = new MemoryStore();
  const host = await seedUser(store);
  const guest = await seedUser(store);
  await store.createEvent(host, {
    title: "Private link", description: "", starts_at: future(2), duration_minutes: 60,
    format: "online", venue: "", meeting_url: "https://meet.example/abc",
    price_pence: 0, capacity: 10,
  });

  const [asGuest] = await store.listEvents(guest.id);
  assert.equal(asGuest.meeting_url, "", "link must be hidden before registering");

  const [asHost] = await store.listEvents(host.id);
  assert.equal(asHost.meeting_url, "https://meet.example/abc");
});

// --- safety ----------------------------------------------------------------

test("messaging requires a mutual connection", async () => {
  const store = new MemoryStore();
  const a = await seedUser(store);
  const b = await seedUser(store);
  await assert.rejects(() => store.sendMessage(a.id, b.id, "hello"), /Connect with this member/);

  await store.connect(a.id, b.id);
  await store.sendMessage(a.id, b.id, "hello");
  assert.equal((await store.listMessages(a.id, b.id)).length, 1);
});

test("blocking removes the connection and stops messaging both ways", async () => {
  const store = new MemoryStore();
  const a = await seedUser(store);
  const b = await seedUser(store);
  await store.connect(a.id, b.id);
  await store.block(a.id, b.id);

  assert.equal(await store.canMessage(a.id, b.id), false);
  assert.equal(await store.canMessage(b.id, a.id), false);
  await assert.rejects(() => store.sendMessage(b.id, a.id, "hi"), /Connect with this member/);
});

test("blocked members disappear from discovery in both directions", async () => {
  const store = new MemoryStore();
  const a = await seedUser(store);
  const b = await seedUser(store);
  await store.saveProfile(a.id, { tagline: "A" });
  await store.saveProfile(b.id, { tagline: "B" });

  assert.equal((await store.listMembers(a.id)).length, 1);
  await store.block(a.id, b.id);
  assert.equal((await store.listMembers(a.id)).length, 0);
  assert.equal((await store.listMembers(b.id)).length, 0);
});

test("you cannot connect with, block or report yourself", async () => {
  const store = new MemoryStore();
  const a = await seedUser(store);
  await assert.rejects(() => store.connect(a.id, a.id), /yourself/);
  await assert.rejects(() => store.block(a.id, a.id), /yourself/);
  await assert.rejects(() => store.report(a.id, a.id, "reason enough"), /yourself/);
});

// --- data rights -----------------------------------------------------------

test("export returns every category of personal data", async () => {
  const store = new MemoryStore();
  const a = await seedUser(store);
  const b = await seedUser(store);
  await store.saveProfile(a.id, { tagline: "Exporter" });
  await store.connect(a.id, b.id);
  await store.sendMessage(a.id, b.id, "hello there");
  await store.joinCommunity(a.id, "founders");

  const dump = await store.exportAccount(a.id);
  for (const key of [
    "user", "profile", "communities", "hostedEvents",
    "registrations", "connections", "messages", "blocks", "reportsMade",
  ]) {
    assert.ok(key in dump, `export missing ${key}`);
  }
  assert.equal(dump.messages.length, 1);
  assert.equal(dump.communities.length, 1);
  assert.equal(dump.profile.tagline, "Exporter");
});

test("closing an account removes the member and their traces", async () => {
  const store = new MemoryStore();
  const a = await seedUser(store);
  const b = await seedUser(store);
  await store.connect(a.id, b.id);
  await store.sendMessage(a.id, b.id, "hello");
  await store.joinCommunity(a.id, "founders");

  await store.deleteAccount(a.id);

  assert.equal(await store.userById(a.id), null);
  assert.equal(store.messages.length, 0);
  assert.equal(store.connections.length, 0);
  assert.equal((await store.listCommunities(b.id)).find((c) => c.slug === "founders").member_count, 0);
});

// --- legal -----------------------------------------------------------------

test("every document in the order list exists and renders", () => {
  for (const slug of LEGAL_ORDER) {
    assert.ok(LEGAL_DOCS[slug], `missing document: ${slug}`);
    const html = renderLegalPage(slug);
    assert.ok(html && html.includes("<h1>"), `${slug} failed to render`);
  }
  assert.equal(LEGAL_ORDER.length, Object.keys(LEGAL_DOCS).length);
});

test("an unknown legal slug renders nothing rather than an empty page", () => {
  assert.equal(renderLegalPage("does-not-exist"), null);
});

test("each document has a title, summary and at least three sections", () => {
  for (const [slug, doc] of Object.entries(LEGAL_DOCS)) {
    assert.ok(doc.title, `${slug} title`);
    assert.ok(doc.summary.length > 30, `${slug} summary`);
    assert.ok(doc.sections.length >= 3, `${slug} needs more sections`);
    for (const section of doc.sections) {
      assert.ok(section.h, `${slug} section heading`);
      assert.ok(section.p || section.list || section.table, `${slug}/${section.h} has no body`);
    }
  }
});

// --- routing ---------------------------------------------------------------

test("the sitemap contains public pages and excludes private ones", () => {
  const xml = sitemap("https://arca.test");
  assert.match(xml, /<loc>https:\/\/arca\.test\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/arca\.test\/pricing<\/loc>/);
  for (const slug of LEGAL_ORDER) {
    assert.ok(xml.includes(`/legal/${slug}`), `sitemap missing ${slug}`);
  }
  for (const path of ["/join", "/login", "/onboarding", "/app"]) {
    assert.ok(!xml.includes(`<loc>https://arca.test${path}</loc>`), `${path} must not be indexed`);
  }
});

test("robots points at the sitemap on the same origin", () => {
  assert.match(robots("https://arca.test"), /Sitemap: https:\/\/arca\.test\/sitemap\.xml/);
});

test("every public page has a distinct title and description", () => {
  const titles = new Set();
  const descriptions = new Set();
  for (const [path, meta] of Object.entries(PUBLIC_PAGES)) {
    assert.ok(meta.title, `${path} title`);
    assert.ok(meta.description?.length > 20, `${path} description`);
    assert.ok(!titles.has(meta.title), `duplicate title on ${path}`);
    assert.ok(!descriptions.has(meta.description), `duplicate description on ${path}`);
    titles.add(meta.title);
    descriptions.add(meta.description);
  }
});

test("auth pages are marked noindex and the member area too", () => {
  assert.equal(metaFor("/login").noindex, true);
  assert.equal(metaFor("/app/settings").noindex, true);
  assert.equal(metaFor("/nonsense").noindex, true);
  assert.ok(!metaFor("/pricing").noindex);
});
