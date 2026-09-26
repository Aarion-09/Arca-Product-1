// MySQL store for Hostinger production. Every query is parameterised. Media is
// stored on disk and only its path is kept here — the previous build embedded
// base64 data URIs in LONGTEXT columns, which blows past shared-MySQL
// max_allowed_packet and makes every profile query enormous.

import { COMMUNITY_SEEDS, FOUNDING_LIMIT, PLANS } from "./config.mjs";
import { hash, newId, newToken, conflict, notFound, forbidden, badRequest } from "./security.mjs";
import { publicUser, memberUser } from "./store-memory.mjs";

const monthStart = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
};
const yearAgo = () => new Date(Date.now() - 365 * 86_400_000);
const toSqlDate = (value) => new Date(value).toISOString().slice(0, 19).replace("T", " ");

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS arca_counters (
     id TINYINT PRIMARY KEY,
     member_count INT NOT NULL DEFAULT 0
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS arca_users (
     id CHAR(36) PRIMARY KEY,
     email VARCHAR(180) NOT NULL UNIQUE,
     password_hash VARCHAR(255) NULL,
     name VARCHAR(120) NOT NULL,
     role VARCHAR(80) NOT NULL DEFAULT 'Member',
     plan ENUM('free','plus','pro','founding_pro') NOT NULL DEFAULT 'free',
     founding_number INT NULL UNIQUE,
     is_admin BOOLEAN NOT NULL DEFAULT FALSE,
     email_verified BOOLEAN NOT NULL DEFAULT FALSE,
     age_verified BOOLEAN NOT NULL DEFAULT FALSE,
     onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
     oauth_provider VARCHAR(30) NULL,
     oauth_subject VARCHAR(180) NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_oauth (oauth_provider, oauth_subject)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS arca_profiles (
     user_id CHAR(36) PRIMARY KEY,
     tagline VARCHAR(180) NULL,
     description TEXT NULL,
     website VARCHAR(500) NULL,
     linkedin VARCHAR(500) NULL,
     location VARCHAR(160) NULL,
     country CHAR(2) NOT NULL DEFAULT '',
     looking_for VARCHAR(255) NULL,
     photo VARCHAR(300) NULL,
     banner VARCHAR(300) NULL,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     FOREIGN KEY (user_id) REFERENCES arca_users(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS arca_sessions (
     token_hash CHAR(64) PRIMARY KEY,
     user_id CHAR(36) NOT NULL,
     expires_at DATETIME NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_user (user_id),
     INDEX idx_expiry (expires_at),
     FOREIGN KEY (user_id) REFERENCES arca_users(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS arca_auth_tokens (
     token_hash CHAR(64) PRIMARY KEY,
     user_id CHAR(36) NOT NULL,
     purpose ENUM('verify_email','password_reset') NOT NULL,
     expires_at DATETIME NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_user_purpose (user_id, purpose, expires_at),
     FOREIGN KEY (user_id) REFERENCES arca_users(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS arca_communities (
     id CHAR(36) PRIMARY KEY,
     slug VARCHAR(100) NOT NULL UNIQUE,
     name VARCHAR(120) NOT NULL,
     description VARCHAR(500) NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS arca_community_members (
     community_id CHAR(36) NOT NULL,
     user_id CHAR(36) NOT NULL,
     joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (community_id, user_id),
     FOREIGN KEY (community_id) REFERENCES arca_communities(id) ON DELETE CASCADE,
     FOREIGN KEY (user_id) REFERENCES arca_users(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS arca_events (
     id CHAR(36) PRIMARY KEY,
     host_id CHAR(36) NOT NULL,
     community_id CHAR(36) NULL,
     title VARCHAR(180) NOT NULL,
     description TEXT NULL,
     starts_at DATETIME NOT NULL,
     duration_minutes SMALLINT NOT NULL DEFAULT 60,
     format ENUM('online','in-person','hybrid') NOT NULL DEFAULT 'online',
     venue VARCHAR(255) NULL,
     meeting_url VARCHAR(500) NULL,
     price_pence INT NOT NULL DEFAULT 0,
     capacity INT NOT NULL DEFAULT 100,
     status ENUM('draft','published','cancelled','completed') NOT NULL DEFAULT 'published',
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_schedule (starts_at, status),
     INDEX idx_host (host_id, created_at),
     FOREIGN KEY (host_id) REFERENCES arca_users(id) ON DELETE CASCADE,
     FOREIGN KEY (community_id) REFERENCES arca_communities(id) ON DELETE SET NULL
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS arca_event_registrations (
     event_id CHAR(36) NOT NULL,
     user_id CHAR(36) NOT NULL,
     status ENUM('registered','cancelled') NOT NULL DEFAULT 'registered',
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (event_id, user_id),
     INDEX idx_user_created (user_id, status, created_at),
     FOREIGN KEY (event_id) REFERENCES arca_events(id) ON DELETE CASCADE,
     FOREIGN KEY (user_id) REFERENCES arca_users(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS arca_connections (
     requester_id CHAR(36) NOT NULL,
     recipient_id CHAR(36) NOT NULL,
     status ENUM('accepted') NOT NULL DEFAULT 'accepted',
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (requester_id, recipient_id),
     INDEX idx_recipient (recipient_id),
     FOREIGN KEY (requester_id) REFERENCES arca_users(id) ON DELETE CASCADE,
     FOREIGN KEY (recipient_id) REFERENCES arca_users(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS arca_messages (
     id CHAR(36) PRIMARY KEY,
     sender_id CHAR(36) NOT NULL,
     recipient_id CHAR(36) NOT NULL,
     body TEXT NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_pair (sender_id, recipient_id, created_at),
     FOREIGN KEY (sender_id) REFERENCES arca_users(id) ON DELETE CASCADE,
     FOREIGN KEY (recipient_id) REFERENCES arca_users(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS arca_blocks (
     blocker_id CHAR(36) NOT NULL,
     blocked_id CHAR(36) NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (blocker_id, blocked_id),
     INDEX idx_blocked (blocked_id),
     FOREIGN KEY (blocker_id) REFERENCES arca_users(id) ON DELETE CASCADE,
     FOREIGN KEY (blocked_id) REFERENCES arca_users(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS arca_reports (
     id CHAR(36) PRIMARY KEY,
     reporter_id CHAR(36) NULL,
     subject_user_id CHAR(36) NULL,
     reason VARCHAR(1000) NOT NULL,
     context VARCHAR(255) NULL,
     status ENUM('open','resolved') NOT NULL DEFAULT 'open',
     outcome VARCHAR(255) NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_status (status, created_at),
     FOREIGN KEY (reporter_id) REFERENCES arca_users(id) ON DELETE SET NULL,
     FOREIGN KEY (subject_user_id) REFERENCES arca_users(id) ON DELETE SET NULL
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS arca_page_views (
     id CHAR(36) PRIMARY KEY,
     path VARCHAR(180) NOT NULL,
     referrer_host VARCHAR(180) NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_created (created_at)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

export class MySQLStore {
  constructor(pool) {
    this.pool = pool;
    this.kind = "mysql";
  }

  async init() {
    for (const statement of SCHEMA) await this.pool.query(statement);
    await this.pool.query(`INSERT IGNORE INTO arca_counters (id, member_count) VALUES (1, 0)`);
    for (const [slug, name, description] of COMMUNITY_SEEDS) {
      await this.pool.execute(
        `INSERT INTO arca_communities (id, slug, name, description) VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description)`,
        [newId(), slug, name, description]
      );
    }
    await this.purgeExpired();
  }

  async close() {
    await this.pool.end();
  }

  async healthy() {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  // Retention enforcement. Called at boot and daily by the server.
  async purgeExpired() {
    await this.pool.query(`DELETE FROM arca_sessions WHERE expires_at < NOW()`);
    await this.pool.query(`DELETE FROM arca_auth_tokens WHERE expires_at < NOW()`);
    await this.pool.query(
      `DELETE FROM arca_page_views WHERE created_at < DATE_SUB(NOW(), INTERVAL 14 MONTH)`
    );
    await this.pool.query(
      `DELETE FROM arca_reports WHERE status='resolved' AND created_at < DATE_SUB(NOW(), INTERVAL 24 MONTH)`
    );
  }

  // -- counts ---------------------------------------------------------------
  async counts() {
    const [[members]] = await this.pool.query(`SELECT COUNT(*) c FROM arca_users`);
    const [[events]] = await this.pool.query(
      `SELECT COUNT(*) c FROM arca_events WHERE status='published' AND starts_at > NOW()`
    );
    const [[communities]] = await this.pool.query(`SELECT COUNT(*) c FROM arca_communities`);
    const [[counter]] = await this.pool.query(`SELECT member_count FROM arca_counters WHERE id=1`);
    return {
      members: Number(members.c),
      events: Number(events.c),
      communities: Number(communities.c),
      foundingRemaining: Math.max(0, FOUNDING_LIMIT - Number(counter?.member_count || 0)),
    };
  }

  // -- users ----------------------------------------------------------------
  async register(data) {
    const cx = await this.pool.getConnection();
    try {
      await cx.beginTransaction();
      const [existing] = await cx.execute(`SELECT id FROM arca_users WHERE email=? FOR UPDATE`, [
        data.email,
      ]);
      if (existing.length) throw conflict("An account with this email already exists.");

      await cx.execute(`UPDATE arca_counters SET member_count = member_count + 1 WHERE id=1`);
      const [[counter]] = await cx.query(`SELECT member_count FROM arca_counters WHERE id=1`);
      const rank = Number(counter.member_count);
      const founding = rank <= FOUNDING_LIMIT;
      const id = newId();

      await cx.execute(
        `INSERT INTO arca_users
           (id,email,password_hash,name,role,plan,founding_number,is_admin,email_verified,age_verified,oauth_provider,oauth_subject)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          id,
          data.email,
          data.password_hash ?? null,
          data.name,
          data.role || "Member",
          founding ? "founding_pro" : "free",
          founding ? rank : null,
          Boolean(data.is_admin),
          Boolean(data.email_verified),
          true,
          data.oauth_provider || null,
          data.oauth_subject || null,
        ]
      );
      await cx.execute(`INSERT INTO arca_profiles (user_id) VALUES (?)`, [id]);
      await cx.commit();
      return publicUser(await this.userById(id));
    } catch (error) {
      await cx.rollback();
      throw error;
    } finally {
      cx.release();
    }
  }

  async userByEmail(email) {
    const [rows] = await this.pool.execute(`SELECT * FROM arca_users WHERE email=?`, [email]);
    return rows[0] || null;
  }
  async userById(id) {
    const [rows] = await this.pool.execute(`SELECT * FROM arca_users WHERE id=?`, [id]);
    return rows[0] || null;
  }
  async setAdmin(id, value) {
    await this.pool.execute(`UPDATE arca_users SET is_admin=? WHERE id=?`, [Boolean(value), id]);
  }
  async markEmailVerified(id) {
    await this.pool.execute(`UPDATE arca_users SET email_verified=TRUE WHERE id=?`, [id]);
  }
  async updatePassword(id, passwordHash) {
    await this.pool.execute(`UPDATE arca_users SET password_hash=? WHERE id=?`, [passwordHash, id]);
  }

  // -- sessions -------------------------------------------------------------
  async createSession(userId, token, expires) {
    await this.pool.execute(
      `INSERT INTO arca_sessions (token_hash,user_id,expires_at) VALUES (?,?,?)`,
      [hash(token), userId, toSqlDate(expires)]
    );
  }
  async userFromSession(token) {
    if (!token) return null;
    const [rows] = await this.pool.execute(
      `SELECT u.* FROM arca_sessions s JOIN arca_users u ON u.id=s.user_id
       WHERE s.token_hash=? AND s.expires_at > NOW()`,
      [hash(token)]
    );
    return rows[0] || null;
  }
  async deleteSession(token) {
    await this.pool.execute(`DELETE FROM arca_sessions WHERE token_hash=?`, [hash(token)]);
  }
  async deleteSessionsForUser(userId) {
    await this.pool.execute(`DELETE FROM arca_sessions WHERE user_id=?`, [userId]);
  }

  // -- auth tokens ----------------------------------------------------------
  async createAuthToken(userId, purpose, ttl) {
    const token = newToken();
    await this.pool.execute(`DELETE FROM arca_auth_tokens WHERE user_id=? AND purpose=?`, [
      userId,
      purpose,
    ]);
    await this.pool.execute(
      `INSERT INTO arca_auth_tokens (token_hash,user_id,purpose,expires_at) VALUES (?,?,?,?)`,
      [hash(token), userId, purpose, toSqlDate(Date.now() + ttl)]
    );
    return token;
  }
  async consumeAuthToken(token, purpose) {
    const cx = await this.pool.getConnection();
    try {
      await cx.beginTransaction();
      const [rows] = await cx.execute(
        `SELECT user_id FROM arca_auth_tokens
         WHERE token_hash=? AND purpose=? AND expires_at > NOW() FOR UPDATE`,
        [hash(token), purpose]
      );
      if (!rows.length) {
        await cx.rollback();
        return null;
      }
      await cx.execute(`DELETE FROM arca_auth_tokens WHERE token_hash=?`, [hash(token)]);
      await cx.commit();
      return this.userById(rows[0].user_id);
    } catch (error) {
      await cx.rollback();
      throw error;
    } finally {
      cx.release();
    }
  }

  // -- profiles -------------------------------------------------------------
  async profile(id) {
    const [rows] = await this.pool.execute(`SELECT * FROM arca_profiles WHERE user_id=?`, [id]);
    return rows[0] || {};
  }
  async saveProfile(id, patch) {
    const fields = [
      "tagline", "description", "website", "linkedin",
      "location", "country", "looking_for", "photo", "banner",
    ].filter((key) => key in patch);
    if (fields.length) {
      const assignments = fields.map((f) => `${f}=?`).join(", ");
      await this.pool.execute(
        `INSERT INTO arca_profiles (user_id, ${fields.join(", ")})
         VALUES (?, ${fields.map(() => "?").join(", ")})
         ON DUPLICATE KEY UPDATE ${assignments}`,
        [id, ...fields.map((f) => patch[f]), ...fields.map((f) => patch[f])]
      );
    }
    await this.pool.execute(`UPDATE arca_users SET onboarding_complete=TRUE WHERE id=?`, [id]);
    return this.profile(id);
  }

  // -- communities ----------------------------------------------------------
  async listCommunities(userId) {
    const [rows] = await this.pool.execute(
      `SELECT c.id, c.slug, c.name, c.description,
              (SELECT COUNT(*) FROM arca_community_members m WHERE m.community_id=c.id) member_count,
              (SELECT COUNT(*) FROM arca_events e WHERE e.community_id=c.id AND e.status='published' AND e.starts_at>NOW()) event_count,
              EXISTS(SELECT 1 FROM arca_community_members m2 WHERE m2.community_id=c.id AND m2.user_id=?) joined
       FROM arca_communities c ORDER BY c.name`,
      [userId || ""]
    );
    return rows.map((r) => ({ ...r, joined: Boolean(r.joined) }));
  }
  async #communityId(key) {
    const [rows] = await this.pool.execute(
      `SELECT id FROM arca_communities WHERE id=? OR slug=? LIMIT 1`,
      [key, key]
    );
    if (!rows.length) throw notFound("Community not found.");
    return rows[0].id;
  }
  async joinCommunity(userId, key) {
    await this.pool.execute(
      `INSERT IGNORE INTO arca_community_members (community_id,user_id) VALUES (?,?)`,
      [await this.#communityId(key), userId]
    );
  }
  async leaveCommunity(userId, key) {
    await this.pool.execute(
      `DELETE FROM arca_community_members WHERE community_id=? AND user_id=?`,
      [await this.#communityId(key), userId]
    );
  }

  // -- events ---------------------------------------------------------------
  async listEvents(userId) {
    const viewer = userId || "";
    const [rows] = await this.pool.execute(
      `SELECT e.*, u.name host_name, c.name community_name,
              (SELECT COUNT(*) FROM arca_event_registrations r WHERE r.event_id=e.id AND r.status='registered') attending,
              EXISTS(SELECT 1 FROM arca_event_registrations r2 WHERE r2.event_id=e.id AND r2.user_id=? AND r2.status='registered') registered
       FROM arca_events e
       JOIN arca_users u ON u.id=e.host_id
       LEFT JOIN arca_communities c ON c.id=e.community_id
       WHERE e.status='published' AND e.starts_at > NOW()
       ORDER BY e.starts_at LIMIT 200`,
      [viewer]
    );
    return rows.map((row) => {
      const registered = Boolean(row.registered);
      const isHost = row.host_id === userId;
      const { meeting_url, ...visible } = row;
      return {
        ...visible,
        attending: Number(row.attending),
        registered,
        is_host: isHost,
        meeting_url: userId && (isHost || registered) ? meeting_url || "" : "",
      };
    });
  }

  async hostedSince(userId, since) {
    const [[row]] = await this.pool.execute(
      `SELECT COUNT(*) c FROM arca_events WHERE host_id=? AND created_at>=?`,
      [userId, toSqlDate(since)]
    );
    return Number(row.c);
  }

  async createEvent(user, data) {
    const actual = await this.userById(user.id);
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
    const id = newId();
    await this.pool.execute(
      `INSERT INTO arca_events
         (id,host_id,community_id,title,description,starts_at,duration_minutes,format,venue,meeting_url,price_pence,capacity)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        user.id,
        data.community_id || null,
        data.title,
        data.description,
        toSqlDate(data.starts_at),
        data.duration_minutes,
        data.format,
        data.venue || null,
        data.meeting_url || null,
        data.price_pence,
        data.capacity,
      ]
    );
    return id;
  }

  async registerEvent(userId, eventId) {
    const cx = await this.pool.getConnection();
    try {
      await cx.beginTransaction();
      const [events] = await cx.execute(
        `SELECT capacity, host_id FROM arca_events
         WHERE id=? AND status='published' AND starts_at > NOW() FOR UPDATE`,
        [eventId]
      );
      if (!events.length) throw notFound("This event is no longer available.");
      if (events[0].host_id === userId) throw badRequest("You are hosting this event.");

      const [users] = await cx.execute(`SELECT plan FROM arca_users WHERE id=?`, [userId]);
      if (!users.length) throw notFound("Member not found.");

      const allowance = PLANS[users[0].plan]?.monthlyRegistrations ?? 0;
      if (allowance !== Infinity) {
        const [[used]] = await cx.execute(
          `SELECT COUNT(*) c FROM arca_event_registrations
           WHERE user_id=? AND status='registered' AND created_at>=?`,
          [userId, toSqlDate(monthStart())]
        );
        if (Number(used.c) >= allowance) {
          throw forbidden(
            "Free membership includes two event registrations each month. Plus includes unlimited attendance."
          );
        }
      }

      const [[attending]] = await cx.execute(
        `SELECT COUNT(*) c FROM arca_event_registrations WHERE event_id=? AND status='registered'`,
        [eventId]
      );
      if (Number(attending.c) >= Number(events[0].capacity)) throw conflict("This event is now full.");

      await cx.execute(
        `INSERT INTO arca_event_registrations (event_id,user_id,status) VALUES (?,?,'registered')
         ON DUPLICATE KEY UPDATE status='registered', created_at=CURRENT_TIMESTAMP`,
        [eventId, userId]
      );
      await cx.commit();
    } catch (error) {
      await cx.rollback();
      throw error;
    } finally {
      cx.release();
    }
  }

  async cancelEvent(userId, eventId) {
    const cx = await this.pool.getConnection();
    try {
      await cx.beginTransaction();
      const [rows] = await cx.execute(`SELECT host_id FROM arca_events WHERE id=? FOR UPDATE`, [eventId]);
      if (!rows.length) throw notFound("Event not found.");
      if (rows[0].host_id !== userId) throw forbidden("Only the event host can cancel this event.");
      await cx.execute(`UPDATE arca_events SET status='cancelled' WHERE id=?`, [eventId]);
      await cx.execute(`UPDATE arca_event_registrations SET status='cancelled' WHERE event_id=?`, [eventId]);
      await cx.commit();
    } catch (error) {
      await cx.rollback();
      throw error;
    } finally {
      cx.release();
    }
  }

  async cancelRegistration(userId, eventId) {
    const [result] = await this.pool.execute(
      `UPDATE arca_event_registrations SET status='cancelled'
       WHERE event_id=? AND user_id=? AND status='registered'`,
      [eventId, userId]
    );
    if (!result.affectedRows) throw notFound("You are not registered for this event.");
  }

  // -- people ---------------------------------------------------------------
  async listMembers(userId, query = "") {
    const like = `%${query}%`;
    const search = query
      ? ` AND (u.name LIKE ? OR p.tagline LIKE ? OR p.location LIKE ? OR p.looking_for LIKE ?)`
      : "";
    const params = [userId, userId, userId, userId, userId];
    if (query) params.push(like, like, like, like);
    const [rows] = await this.pool.execute(
      `SELECT u.id,u.name,u.role,u.plan,u.founding_number,
              p.tagline,p.description,p.website,p.linkedin,p.location,p.country,p.looking_for,p.photo,p.banner,
              EXISTS(SELECT 1 FROM arca_connections c
                     WHERE (c.requester_id=? AND c.recipient_id=u.id)
                        OR (c.recipient_id=? AND c.requester_id=u.id)) connected
       FROM arca_users u
       JOIN arca_profiles p ON p.user_id=u.id
       WHERE u.id<>? AND u.onboarding_complete=TRUE
         AND NOT EXISTS (SELECT 1 FROM arca_blocks b
                         WHERE (b.blocker_id=? AND b.blocked_id=u.id)
                            OR (b.blocker_id=u.id AND b.blocked_id=?))${search}
       ORDER BY u.created_at DESC LIMIT 100`,
      params
    );
    return rows.map((r) => ({ ...r, connected: Boolean(r.connected) }));
  }

  async connect(from, to) {
    if (from === to) throw badRequest("You cannot connect with yourself.");
    if (!(await this.userById(to))) throw notFound("Member not found.");
    const [blocked] = await this.pool.execute(
      `SELECT 1 FROM arca_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?) LIMIT 1`,
      [from, to, to, from]
    );
    if (blocked.length) throw forbidden("This member is unavailable.");
    const [existing] = await this.pool.execute(
      `SELECT 1 FROM arca_connections
       WHERE (requester_id=? AND recipient_id=?) OR (requester_id=? AND recipient_id=?) LIMIT 1`,
      [from, to, to, from]
    );
    if (!existing.length) {
      await this.pool.execute(
        `INSERT IGNORE INTO arca_connections (requester_id,recipient_id) VALUES (?,?)`,
        [from, to]
      );
    }
  }
  async disconnect(from, to) {
    await this.pool.execute(
      `DELETE FROM arca_connections
       WHERE (requester_id=? AND recipient_id=?) OR (requester_id=? AND recipient_id=?)`,
      [from, to, to, from]
    );
  }
  async network(userId) {
    const [rows] = await this.pool.execute(
      `SELECT u.id,u.name,u.role,u.plan,p.tagline,p.location,p.country,p.photo
       FROM arca_connections c
       JOIN arca_users u ON u.id = IF(c.requester_id=?, c.recipient_id, c.requester_id)
       JOIN arca_profiles p ON p.user_id=u.id
       WHERE c.requester_id=? OR c.recipient_id=?
       ORDER BY c.created_at DESC`,
      [userId, userId, userId]
    );
    return rows.map((r) => ({ ...r, connected: true }));
  }

  async canMessage(a, b) {
    const [blocked] = await this.pool.execute(
      `SELECT 1 FROM arca_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?) LIMIT 1`,
      [a, b, b, a]
    );
    if (blocked.length) return false;
    const [rows] = await this.pool.execute(
      `SELECT 1 FROM arca_connections
       WHERE (requester_id=? AND recipient_id=?) OR (requester_id=? AND recipient_id=?) LIMIT 1`,
      [a, b, b, a]
    );
    return Boolean(rows.length);
  }
  async listMessages(a, b) {
    if (!(await this.canMessage(a, b))) throw forbidden("Connect with this member before messaging.");
    const [rows] = await this.pool.execute(
      `SELECT * FROM arca_messages
       WHERE (sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?)
       ORDER BY created_at LIMIT 500`,
      [a, b, b, a]
    );
    return rows;
  }
  async sendMessage(sender, recipient, body) {
    if (!(await this.userById(recipient))) throw notFound("Member not found.");
    if (!(await this.canMessage(sender, recipient)))
      throw forbidden("Connect with this member before messaging.");
    await this.pool.execute(
      `INSERT INTO arca_messages (id,sender_id,recipient_id,body) VALUES (?,?,?,?)`,
      [newId(), sender, recipient, body]
    );
  }
  async conversations(userId) {
    const [rows] = await this.pool.execute(
      `SELECT u.id,u.name,u.role,p.tagline,p.photo,
              m.body last, m.created_at at
       FROM arca_messages m
       JOIN arca_users u ON u.id = IF(m.sender_id=?, m.recipient_id, m.sender_id)
       JOIN arca_profiles p ON p.user_id=u.id
       WHERE (m.sender_id=? OR m.recipient_id=?)
         AND m.created_at = (
           SELECT MAX(m2.created_at) FROM arca_messages m2
           WHERE (m2.sender_id=m.sender_id AND m2.recipient_id=m.recipient_id)
              OR (m2.sender_id=m.recipient_id AND m2.recipient_id=m.sender_id))
         AND NOT EXISTS (SELECT 1 FROM arca_blocks b
                         WHERE (b.blocker_id=? AND b.blocked_id=u.id)
                            OR (b.blocker_id=u.id AND b.blocked_id=?))
       ORDER BY m.created_at DESC LIMIT 100`,
      [userId, userId, userId, userId, userId]
    );
    return rows;
  }

  async block(blocker, blocked) {
    if (blocker === blocked) throw badRequest("You cannot block yourself.");
    if (!(await this.userById(blocked))) throw notFound("Member not found.");
    await this.disconnect(blocker, blocked);
    await this.pool.execute(`INSERT IGNORE INTO arca_blocks (blocker_id,blocked_id) VALUES (?,?)`, [
      blocker,
      blocked,
    ]);
  }
  async unblock(blocker, blocked) {
    await this.pool.execute(`DELETE FROM arca_blocks WHERE blocker_id=? AND blocked_id=?`, [
      blocker,
      blocked,
    ]);
  }
  async listBlocks(userId) {
    const [rows] = await this.pool.execute(
      `SELECT u.id,u.name FROM arca_blocks b JOIN arca_users u ON u.id=b.blocked_id WHERE b.blocker_id=?`,
      [userId]
    );
    return rows;
  }

  async report(reporter, subject, reason, context = "") {
    if (reporter === subject) throw badRequest("You cannot report yourself.");
    if (!(await this.userById(subject))) throw notFound("Member not found.");
    await this.pool.execute(
      `INSERT INTO arca_reports (id,reporter_id,subject_user_id,reason,context) VALUES (?,?,?,?,?)`,
      [newId(), reporter, subject, reason, context || null]
    );
  }
  async listReports() {
    const [rows] = await this.pool.execute(
      `SELECT r.*, rep.name reporter_name, sub.name subject_name
       FROM arca_reports r
       LEFT JOIN arca_users rep ON rep.id=r.reporter_id
       LEFT JOIN arca_users sub ON sub.id=r.subject_user_id
       WHERE r.status='open' ORDER BY r.created_at DESC LIMIT 100`
    );
    return rows;
  }
  async resolveReport(id, outcome) {
    const [result] = await this.pool.execute(
      `UPDATE arca_reports SET status='resolved', outcome=? WHERE id=? AND status='open'`,
      [outcome, id]
    );
    if (!result.affectedRows) throw notFound("Report not found.");
  }

  // -- account --------------------------------------------------------------
  async deleteAccount(id) {
    // Foreign keys cascade; events the member hosted go with them.
    await this.pool.execute(`DELETE FROM arca_users WHERE id=?`, [id]);
  }

  async exportAccount(id) {
    const [user, profile] = [await this.userById(id), await this.profile(id)];
    const q = async (sql, params) => (await this.pool.execute(sql, params))[0];
    return {
      user: publicUser(user),
      profile,
      communities: await q(
        `SELECT c.slug,c.name FROM arca_community_members m JOIN arca_communities c ON c.id=m.community_id WHERE m.user_id=?`,
        [id]
      ),
      hostedEvents: await q(`SELECT * FROM arca_events WHERE host_id=?`, [id]),
      registrations: await q(`SELECT * FROM arca_event_registrations WHERE user_id=?`, [id]),
      connections: await q(
        `SELECT * FROM arca_connections WHERE requester_id=? OR recipient_id=?`,
        [id, id]
      ),
      messages: await q(
        `SELECT * FROM arca_messages WHERE sender_id=? OR recipient_id=? ORDER BY created_at`,
        [id, id]
      ),
      blocks: await q(`SELECT blocked_id,created_at FROM arca_blocks WHERE blocker_id=?`, [id]),
      reportsMade: await q(`SELECT id,reason,status,created_at FROM arca_reports WHERE reporter_id=?`, [id]),
    };
  }

  // -- analytics ------------------------------------------------------------
  async trackView(path, referrerHost) {
    await this.pool.execute(
      `INSERT INTO arca_page_views (id,path,referrer_host) VALUES (?,?,?)`,
      [newId(), path, referrerHost || null]
    );
  }
  async analytics() {
    const [[totals]] = await this.pool.query(
      `SELECT COUNT(*) total, SUM(created_at >= CURRENT_DATE) today FROM arca_page_views`
    );
    const [paths] = await this.pool.query(
      `SELECT path, COUNT(*) views FROM arca_page_views GROUP BY path ORDER BY views DESC LIMIT 8`
    );
    const [[reports]] = await this.pool.query(
      `SELECT COUNT(*) c FROM arca_reports WHERE status='open'`
    );
    const [[members]] = await this.pool.query(`SELECT COUNT(*) c FROM arca_users`);
    return {
      total: Number(totals.total) || 0,
      today: Number(totals.today) || 0,
      topPaths: paths.map((r) => ({ path: r.path, views: Number(r.views) })),
      openReports: Number(reports.c) || 0,
      members: Number(members.c) || 0,
    };
  }
}

export async function createMySQLStore() {
  const mysql = await import("mysql2/promise");
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL || 8),
    maxIdle: 4,
    idleTimeout: 60_000,
    enableKeepAlive: true,
    charset: "utf8mb4",
  });
  const store = new MySQLStore(pool);
  await store.init();
  return store;
}
