// In-memory store. Used for local development and tests when no database is
// configured, so `npm start` works on a clean machine with zero setup.

import { COMMUNITY_SEEDS, FOUNDING_LIMIT, PLANS } from "./config.mjs";
import { hash, newId, newToken, conflict, notFound, forbidden, badRequest } from "./security.mjs";

export const eventIsOpen = (event) =>
  (!event.status || event.status === "published") &&
  new Date(event.starts_at).getTime() + Number(event.duration_minutes || 60) * 60_000 > Date.now();

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    plan: row.plan,
    foundingNumber: row.founding_number ?? null,
    isAdmin: Boolean(row.is_admin),
    emailVerified: Boolean(row.email_verified),
    onboardingComplete: Boolean(row.onboarding_complete),
    createdAt: row.created_at,
  };
}

export function memberUser(row) {
  const { email, ...rest } = publicUser(row) || {};
  return rest;
}

const monthStart = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
};
const yearAgo = () => new Date(Date.now() - 365 * 86_400_000);

export class MemoryStore {
  constructor() {
    this.kind = "memory";
    this.memberCount = 0;
    this.users = new Map();
    this.profiles = new Map();
    this.sessions = new Map();
    this.authTokens = new Map();
    this.events = [];
    this.registrations = [];
    this.connections = [];
    this.messages = [];
    this.blocks = [];
    this.reports = [];
    this.pageViews = [];
    this.communities = COMMUNITY_SEEDS.map(([slug, name, description], i) => ({
      id: String(i + 1),
      slug,
      name,
      description,
      members: new Set(),
    }));
  }

  async init() {}
  async close() {}
  async healthy() {
    return true;
  }

  // -- counts ---------------------------------------------------------------
  async counts() {
    return {
      members: this.users.size,
      events: this.events.filter(eventIsOpen).length,
      communities: this.communities.length,
      foundingRemaining: Math.max(0, FOUNDING_LIMIT - this.memberCount),
    };
  }

  // -- users ----------------------------------------------------------------
  async register(data) {
    for (const user of this.users.values()) {
      if (user.email === data.email) throw conflict("An account with this email already exists.");
    }
    const rank = ++this.memberCount;
    const founding = rank <= FOUNDING_LIMIT;
    const row = {
      id: newId(),
      email: data.email,
      password_hash: data.password_hash ?? null,
      name: data.name,
      role: data.role || "Member",
      plan: founding ? "founding_pro" : "free",
      founding_number: founding ? rank : null,
      is_admin: Boolean(data.is_admin),
      email_verified: Boolean(data.email_verified),
      age_verified: true,
      onboarding_complete: false,
      oauth_provider: data.oauth_provider || null,
      oauth_subject: data.oauth_subject || null,
      created_at: new Date().toISOString(),
    };
    this.users.set(row.id, row);
    this.profiles.set(row.id, { user_id: row.id });
    return publicUser(row);
  }

  async userByEmail(email) {
    for (const user of this.users.values()) if (user.email === email) return user;
    return null;
  }
  async userById(id) {
    return this.users.get(id) || null;
  }
  async setAdmin(id, value) {
    const user = this.users.get(id);
    if (user) user.is_admin = value;
  }
  async markEmailVerified(id) {
    const user = this.users.get(id);
    if (user) user.email_verified = true;
  }
  async updatePassword(id, passwordHash) {
    const user = this.users.get(id);
    if (user) user.password_hash = passwordHash;
  }

  // -- sessions -------------------------------------------------------------
  async createSession(userId, token, expires) {
    this.sessions.set(hash(token), { userId, expires });
  }
  async userFromSession(token) {
    if (!token) return null;
    const session = this.sessions.get(hash(token));
    if (!session) return null;
    if (session.expires <= Date.now()) {
      this.sessions.delete(hash(token));
      return null;
    }
    return this.userById(session.userId);
  }
  async deleteSession(token) {
    this.sessions.delete(hash(token));
  }
  async deleteSessionsForUser(userId) {
    for (const [key, value] of this.sessions) if (value.userId === userId) this.sessions.delete(key);
  }

  // -- auth tokens ----------------------------------------------------------
  async createAuthToken(userId, purpose, ttl) {
    const token = newToken();
    for (const [key, value] of this.authTokens) {
      if (value.userId === userId && value.purpose === purpose) this.authTokens.delete(key);
    }
    this.authTokens.set(hash(token), { userId, purpose, expires: Date.now() + ttl });
    return token;
  }
  async consumeAuthToken(token, purpose) {
    const key = hash(token);
    const value = this.authTokens.get(key);
    if (!value || value.purpose !== purpose || value.expires <= Date.now()) return null;
    this.authTokens.delete(key);
    return this.userById(value.userId);
  }

  // -- profiles -------------------------------------------------------------
  async profile(id) {
    return this.profiles.get(id) || {};
  }
  async saveProfile(id, patch) {
    const next = { ...(this.profiles.get(id) || {}), ...patch, user_id: id };
    this.profiles.set(id, next);
    const user = this.users.get(id);
    if (user) user.onboarding_complete = true;
    return next;
  }

  // -- communities ----------------------------------------------------------
  async listCommunities(userId) {
    return this.communities.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      member_count: c.members.size,
      event_count: this.events.filter((e) => e.community_id === c.id && eventIsOpen(e)).length,
      joined: Boolean(userId && c.members.has(userId)),
    }));
  }
  async joinCommunity(userId, key) {
    const community = this.communities.find((c) => c.id === key || c.slug === key);
    if (!community) throw notFound("Community not found.");
    community.members.add(userId);
  }
  async leaveCommunity(userId, key) {
    const community = this.communities.find((c) => c.id === key || c.slug === key);
    if (!community) throw notFound("Community not found.");
    community.members.delete(userId);
  }

  // -- events ---------------------------------------------------------------
  #decorate(event, userId) {
    const attending = this.registrations.filter(
      (r) => r.eventId === event.id && r.status !== "cancelled"
    ).length;
    const registered = this.registrations.some(
      (r) => r.eventId === event.id && r.userId === userId && r.status !== "cancelled"
    );
    const community = this.communities.find((c) => c.id === event.community_id);
    const { meeting_url, ...visible } = event;
    return {
      ...visible,
      community_name: community?.name || null,
      attending,
      registered,
      is_host: event.host_id === userId,
      meeting_url: userId && (event.host_id === userId || registered) ? meeting_url || "" : "",
    };
  }

  async listEvents(userId) {
    return this.events
      .filter(eventIsOpen)
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
      .map((e) => this.#decorate(e, userId));
  }

  async hostedSince(userId, since) {
    return this.events.filter((e) => e.host_id === userId && new Date(e.created_at) >= since).length;
  }

  async createEvent(user, data) {
    const actual = this.users.get(user.id);
    if (!actual) throw notFound("Member not found.");
    const allowance = PLANS[actual.plan]?.eventsPerYear ?? 0;
    if (allowance !== Infinity) {
      const used = await this.hostedSince(user.id, yearAgo());
      if (used >= allowance) {
        throw forbidden(
          allowance === 0
            ? "Hosting is included with Plus and Pro membership."
            : "Plus includes one hosted event per year. Pro includes unlimited hosting."
        );
      }
    }
    if (data.community_id && !this.communities.some((c) => c.id === data.community_id)) {
      throw notFound("Community not found.");
    }
    const id = newId();
    this.events.unshift({
      id,
      host_id: user.id,
      host_name: actual.name,
      ...data,
      status: "published",
      created_at: new Date().toISOString(),
    });
    return id;
  }

  async registerEvent(userId, eventId) {
    const user = this.users.get(userId);
    if (!user) throw notFound("Member not found.");
    const event = this.events.find((e) => e.id === eventId && eventIsOpen(e));
    if (!event) throw notFound("This event is no longer available.");
    if (event.host_id === userId) throw badRequest("You are hosting this event.");

    const existing = this.registrations.find((r) => r.userId === userId && r.eventId === eventId);
    if (existing && existing.status !== "cancelled") return;

    const allowance = PLANS[user.plan]?.monthlyRegistrations ?? 0;
    if (allowance !== Infinity) {
      const used = this.registrations.filter(
        (r) => r.userId === userId && r.status !== "cancelled" && new Date(r.created_at) >= monthStart()
      ).length;
      if (used >= allowance) {
        throw forbidden(
          "Free membership includes two event registrations each month. Plus includes unlimited attendance."
        );
      }
    }
    const attending = this.registrations.filter(
      (r) => r.eventId === eventId && r.status !== "cancelled"
    ).length;
    if (attending >= event.capacity) throw conflict("This event is now full.");

    if (existing) Object.assign(existing, { status: "registered", created_at: new Date().toISOString() });
    else
      this.registrations.push({
        userId,
        eventId,
        status: "registered",
        created_at: new Date().toISOString(),
      });
  }

  async cancelEvent(userId, eventId) {
    const event = this.events.find((e) => e.id === eventId);
    if (!event) throw notFound("Event not found.");
    if (event.host_id !== userId) throw forbidden("Only the event host can cancel this event.");
    event.status = "cancelled";
    for (const row of this.registrations) if (row.eventId === eventId) row.status = "cancelled";
  }

  async cancelRegistration(userId, eventId) {
    const row = this.registrations.find(
      (r) => r.userId === userId && r.eventId === eventId && r.status !== "cancelled"
    );
    if (!row) throw notFound("You are not registered for this event.");
    row.status = "cancelled";
  }

  // -- people ---------------------------------------------------------------
  blockedPair(a, b) {
    return this.blocks.some(
      (x) =>
        (x.blocker_id === a && x.blocked_id === b) || (x.blocker_id === b && x.blocked_id === a)
    );
  }
  connectedPair(a, b) {
    return this.connections.some(
      (c) => (c.from === a && c.to === b) || (c.from === b && c.to === a)
    );
  }

  async listMembers(userId, query = "") {
    const q = query.toLowerCase();
    return [...this.users.values()]
      .filter((u) => u.id !== userId && u.onboarding_complete && !this.blockedPair(userId, u.id))
      .map((u) => ({
        ...memberUser(u),
        ...this.profiles.get(u.id),
        connected: this.connectedPair(userId, u.id),
      }))
      .filter((u) =>
        !q ||
        [u.name, u.tagline, u.location, u.looking_for].filter(Boolean).join(" ").toLowerCase().includes(q)
      )
      .slice(0, 100);
  }

  async connect(from, to) {
    if (from === to) throw badRequest("You cannot connect with yourself.");
    if (!this.users.has(to)) throw notFound("Member not found.");
    if (this.blockedPair(from, to)) throw forbidden("This member is unavailable.");
    if (!this.connectedPair(from, to)) this.connections.push({ from, to, created_at: Date.now() });
  }
  async disconnect(from, to) {
    this.connections = this.connections.filter(
      (c) => !((c.from === from && c.to === to) || (c.from === to && c.to === from))
    );
  }
  async network(userId) {
    return (await this.listMembers(userId)).filter((m) => m.connected);
  }

  async canMessage(a, b) {
    return !this.blockedPair(a, b) && this.connectedPair(a, b);
  }
  async listMessages(a, b) {
    if (!(await this.canMessage(a, b))) throw forbidden("Connect with this member before messaging.");
    return this.messages
      .filter(
        (m) =>
          (m.sender_id === a && m.recipient_id === b) || (m.sender_id === b && m.recipient_id === a)
      )
      .sort((x, y) => new Date(x.created_at) - new Date(y.created_at));
  }
  async sendMessage(sender, recipient, body) {
    if (!this.users.has(recipient)) throw notFound("Member not found.");
    if (!(await this.canMessage(sender, recipient)))
      throw forbidden("Connect with this member before messaging.");
    this.messages.push({
      id: newId(),
      sender_id: sender,
      recipient_id: recipient,
      body,
      created_at: new Date().toISOString(),
    });
  }
  async conversations(userId) {
    const partners = new Map();
    for (const m of this.messages) {
      if (m.sender_id !== userId && m.recipient_id !== userId) continue;
      const other = m.sender_id === userId ? m.recipient_id : m.sender_id;
      const existing = partners.get(other);
      if (!existing || new Date(m.created_at) > new Date(existing.created_at)) {
        partners.set(other, { created_at: m.created_at, body: m.body });
      }
    }
    const out = [];
    for (const [id, last] of partners) {
      const user = this.users.get(id);
      if (!user || this.blockedPair(userId, id)) continue;
      out.push({ ...memberUser(user), ...this.profiles.get(id), last: last.body, at: last.created_at });
    }
    return out.sort((a, b) => new Date(b.at) - new Date(a.at));
  }

  async block(blocker, blocked) {
    if (blocker === blocked) throw badRequest("You cannot block yourself.");
    if (!this.users.has(blocked)) throw notFound("Member not found.");
    if (!this.blocks.some((x) => x.blocker_id === blocker && x.blocked_id === blocked)) {
      this.blocks.push({ blocker_id: blocker, blocked_id: blocked });
    }
    await this.disconnect(blocker, blocked);
  }
  async unblock(blocker, blocked) {
    this.blocks = this.blocks.filter(
      (x) => !(x.blocker_id === blocker && x.blocked_id === blocked)
    );
  }
  async listBlocks(userId) {
    return this.blocks
      .filter((b) => b.blocker_id === userId)
      .map((b) => {
        const user = this.users.get(b.blocked_id);
        return user ? { id: user.id, name: user.name } : null;
      })
      .filter(Boolean);
  }

  async report(reporter, subject, reason, context = "") {
    if (reporter === subject) throw badRequest("You cannot report yourself.");
    if (!this.users.has(subject)) throw notFound("Member not found.");
    this.reports.push({
      id: newId(),
      reporter_id: reporter,
      subject_user_id: subject,
      reason,
      context,
      status: "open",
      created_at: new Date().toISOString(),
    });
  }
  async listReports() {
    return this.reports
      .filter((r) => r.status === "open")
      .map((r) => ({
        ...r,
        reporter_name: this.users.get(r.reporter_id)?.name || "Removed",
        subject_name: this.users.get(r.subject_user_id)?.name || "Removed",
      }));
  }
  async resolveReport(id, outcome) {
    const report = this.reports.find((r) => r.id === id);
    if (!report) throw notFound("Report not found.");
    report.status = "resolved";
    report.outcome = outcome;
  }

  // -- account --------------------------------------------------------------
  async deleteAccount(id) {
    const hosted = new Set(this.events.filter((e) => e.host_id === id).map((e) => e.id));
    this.events = this.events.filter((e) => e.host_id !== id);
    this.registrations = this.registrations.filter((r) => r.userId !== id && !hosted.has(r.eventId));
    this.connections = this.connections.filter((c) => c.from !== id && c.to !== id);
    this.messages = this.messages.filter((m) => m.sender_id !== id && m.recipient_id !== id);
    this.blocks = this.blocks.filter((b) => b.blocker_id !== id && b.blocked_id !== id);
    this.reports = this.reports.filter((r) => r.reporter_id !== id && r.subject_user_id !== id);
    for (const community of this.communities) community.members.delete(id);
    await this.deleteSessionsForUser(id);
    this.profiles.delete(id);
    this.users.delete(id);
  }

  async exportAccount(id) {
    return {
      user: publicUser(await this.userById(id)),
      profile: await this.profile(id),
      communities: this.communities
        .filter((c) => c.members.has(id))
        .map((c) => ({ slug: c.slug, name: c.name })),
      hostedEvents: this.events.filter((e) => e.host_id === id),
      registrations: this.registrations.filter((r) => r.userId === id),
      connections: this.connections.filter((c) => c.from === id || c.to === id),
      messages: this.messages.filter((m) => m.sender_id === id || m.recipient_id === id),
      blocks: this.blocks.filter((b) => b.blocker_id === id),
      reportsMade: this.reports.filter((r) => r.reporter_id === id),
    };
  }

  // -- analytics ------------------------------------------------------------
  async trackView(path, referrerHost) {
    this.pageViews.push({ path, referrerHost, createdAt: new Date().toISOString() });
    if (this.pageViews.length > 10_000) this.pageViews.shift();
  }
  async analytics() {
    const today = new Date().toISOString().slice(0, 10);
    const counts = new Map();
    for (const view of this.pageViews) counts.set(view.path, (counts.get(view.path) || 0) + 1);
    return {
      total: this.pageViews.length,
      today: this.pageViews.filter((v) => v.createdAt.startsWith(today)).length,
      topPaths: [...counts]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([path, views]) => ({ path, views })),
      openReports: this.reports.filter((r) => r.status === "open").length,
      members: this.users.size,
    };
  }
}
