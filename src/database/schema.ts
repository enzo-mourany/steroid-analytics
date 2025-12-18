import Database from 'better-sqlite3';
import { StoredEvent } from '../types/event';

export function initializeDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  
  // Table des sites (pour autorisation par domaine)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      website_id TEXT NOT NULL UNIQUE,
      domain TEXT NOT NULL,
      allowed_hosts TEXT, -- JSON array of allowed hostnames
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Table principale des événements
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      website_id TEXT NOT NULL,
      domain TEXT NOT NULL,
      type TEXT NOT NULL,
      href TEXT NOT NULL,
      path TEXT NOT NULL,
      referrer TEXT,
      viewport TEXT,
      visitor_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      ad_click_ids TEXT,
      extra_data TEXT,
      user_agent TEXT,
      ip TEXT,
      event_timestamp INTEGER NOT NULL,
      received_timestamp INTEGER NOT NULL,
      stored BOOLEAN NOT NULL DEFAULT 1,
      ignore_reason TEXT,
      request_id TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Index pour améliorer les performances de requête
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_events_website_id ON events(website_id);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
    CREATE INDEX IF NOT EXISTS idx_events_visitor_id ON events(visitor_id);
    CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(event_timestamp);
    CREATE INDEX IF NOT EXISTS idx_events_stored ON events(stored);
    CREATE INDEX IF NOT EXISTS idx_events_path ON events(path);
  `);

  // Table pour le throttling des pageviews
  db.exec(`
    CREATE TABLE IF NOT EXISTS pageview_throttle (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_id TEXT NOT NULL,
      path TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      UNIQUE(visitor_id, path, timestamp)
    )
  `);

  // Table pour la déduplication des paiements
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_deduplication (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      payment_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      UNIQUE(session_id, payment_id)
    )
  `);

  return db;
}

export class EventRepository {
  constructor(private db: Database.Database) {}

  insertEvent(event: Omit<StoredEvent, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO events (
        website_id, domain, type, href, path, referrer, viewport,
        visitor_id, session_id, ad_click_ids, extra_data,
        user_agent, ip, event_timestamp, received_timestamp,
        stored, ignore_reason, request_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      event.websiteId,
      event.domain,
      event.type,
      event.href,
      event.path,
      event.referrer || null,
      event.viewport || null,
      event.visitorId,
      event.sessionId,
      event.adClickIds || null,
      event.extraData || null,
      event.userAgent || null,
      event.ip || null,
      event.eventTimestamp,
      event.receivedTimestamp,
      event.stored ? 1 : 0,
      event.ignoreReason || null,
      event.requestId
    );

    return result.lastInsertRowid as number;
  }

  findEvents(query: {
    websiteId?: string;
    startDate?: number;
    endDate?: number;
    type?: string;
    path?: string;
    visitorId?: string;
    sessionId?: string;
    limit?: number;
    offset?: number;
  }): { events: StoredEvent[]; total: number } {
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.websiteId) {
      conditions.push('website_id = ?');
      params.push(query.websiteId);
    }
    if (query.startDate) {
      conditions.push('event_timestamp >= ?');
      params.push(query.startDate);
    }
    if (query.endDate) {
      conditions.push('event_timestamp <= ?');
      params.push(query.endDate);
    }
    if (query.type) {
      conditions.push('type = ?');
      params.push(query.type);
    }
    if (query.path) {
      conditions.push('path LIKE ?');
      params.push(`%${query.path}%`);
    }
    if (query.visitorId) {
      conditions.push('visitor_id = ?');
      params.push(query.visitorId);
    }
    if (query.sessionId) {
      conditions.push('session_id = ?');
      params.push(query.sessionId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Count total
    const countStmt = this.db.prepare(`SELECT COUNT(*) as total FROM events ${whereClause}`);
    const total = (countStmt.get(...params) as { total: number }).total;

    // Get events
    const limit = query.limit || 50;
    const offset = query.offset || 0;
    const selectStmt = this.db.prepare(`
      SELECT * FROM events ${whereClause}
      ORDER BY event_timestamp DESC
      LIMIT ? OFFSET ?
    `);
    
    const rows = selectStmt.all(...params, limit, offset) as any[];
    const events = rows.map(this.mapRowToEvent);

    return { events, total };
  }

  getStatistics(websiteId: string, startDate: number, endDate: number): any {
    // Pageviews
    const pageviewsStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM events
      WHERE website_id = ? AND type = 'pageview' AND stored = 1
      AND event_timestamp >= ? AND event_timestamp <= ?
    `);
    const pageviews = (pageviewsStmt.get(websiteId, startDate, endDate) as { count: number }).count;

    // Unique visitors
    const visitorsStmt = this.db.prepare(`
      SELECT COUNT(DISTINCT visitor_id) as count FROM events
      WHERE website_id = ? AND stored = 1
      AND event_timestamp >= ? AND event_timestamp <= ?
    `);
    const uniqueVisitors = (visitorsStmt.get(websiteId, startDate, endDate) as { count: number }).count;

    // Unique sessions
    const sessionsStmt = this.db.prepare(`
      SELECT COUNT(DISTINCT session_id) as count FROM events
      WHERE website_id = ? AND stored = 1
      AND event_timestamp >= ? AND event_timestamp <= ?
    `);
    const uniqueSessions = (sessionsStmt.get(websiteId, startDate, endDate) as { count: number }).count;

    // Top pages
    const topPagesStmt = this.db.prepare(`
      SELECT path, COUNT(*) as count FROM events
      WHERE website_id = ? AND type = 'pageview' AND stored = 1
      AND event_timestamp >= ? AND event_timestamp <= ?
      GROUP BY path
      ORDER BY count DESC
      LIMIT 10
    `);
    const topPages = topPagesStmt.all(websiteId, startDate, endDate) as Array<{ path: string; count: number }>;

    // Top referrers
    const topReferrersStmt = this.db.prepare(`
      SELECT referrer, COUNT(*) as count FROM events
      WHERE website_id = ? AND stored = 1 AND referrer IS NOT NULL AND referrer != ''
      AND event_timestamp >= ? AND event_timestamp <= ?
      GROUP BY referrer
      ORDER BY count DESC
      LIMIT 10
    `);
    const topReferrers = topReferrersStmt.all(websiteId, startDate, endDate) as Array<{ referrer: string; count: number }>;

    // Top custom events (parse JSON in JS for compatibility)
    const customEventsStmt = this.db.prepare(`
      SELECT extra_data FROM events
      WHERE website_id = ? AND type = 'custom' AND stored = 1
      AND event_timestamp >= ? AND event_timestamp <= ?
      AND extra_data IS NOT NULL
    `);
    const customEvents = customEventsStmt.all(websiteId, startDate, endDate) as Array<{ extra_data: string }>;
    const eventNameCounts: Record<string, number> = {};
    for (const event of customEvents) {
      try {
        const extraData = JSON.parse(event.extra_data);
        const eventName = extraData.eventName;
        if (eventName && typeof eventName === 'string') {
          eventNameCounts[eventName] = (eventNameCounts[eventName] || 0) + 1;
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
    const topCustomEvents = Object.entries(eventNameCounts)
      .map(([event_name, count]) => ({ event_name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Conversions/Payments
    const paymentsStmt = this.db.prepare(`
      SELECT id, extra_data, event_timestamp FROM events
      WHERE website_id = ? AND type = 'payment' AND stored = 1
      AND event_timestamp >= ? AND event_timestamp <= ?
      ORDER BY event_timestamp DESC
    `);
    const payments = paymentsStmt.all(websiteId, startDate, endDate) as Array<{ id: number; extra_data: string; event_timestamp: number }>;

    return {
      pageviews,
      uniqueVisitors,
      uniqueSessions,
      topPages,
      topReferrers,
      topCustomEvents,
      payments
    };
  }

  getActiveStats(websiteId: string, windowMinutes: number = 5): { activeSessions: number; activeVisitors: number } {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (windowMinutes * 60);

    // Sessions actives (avec événements dans la fenêtre)
    const activeSessionsStmt = this.db.prepare(`
      SELECT COUNT(DISTINCT session_id) as count FROM events
      WHERE website_id = ? AND stored = 1
      AND event_timestamp >= ?
    `);
    const activeSessions = (activeSessionsStmt.get(websiteId, windowStart) as { count: number }).count;

    // Visiteurs actifs (avec événements dans la fenêtre)
    const activeVisitorsStmt = this.db.prepare(`
      SELECT COUNT(DISTINCT visitor_id) as count FROM events
      WHERE website_id = ? AND stored = 1
      AND event_timestamp >= ?
    `);
    const activeVisitors = (activeVisitorsStmt.get(websiteId, windowStart) as { count: number }).count;

    return {
      activeSessions,
      activeVisitors
    };
  }

  checkPageviewThrottle(visitorId: string, path: string, windowStart: number): boolean {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM pageview_throttle
      WHERE visitor_id = ? AND path = ? AND timestamp >= ?
    `);
    const result = stmt.get(visitorId, path, windowStart) as { count: number };
    return result.count > 0;
  }

  addPageviewThrottle(visitorId: string, path: string, timestamp: number): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO pageview_throttle (visitor_id, path, timestamp)
      VALUES (?, ?, ?)
    `);
    stmt.run(visitorId, path, timestamp);
  }

  checkPaymentDeduplication(sessionId: string, paymentId: string): boolean {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM payment_deduplication
      WHERE session_id = ? AND payment_id = ?
    `);
    const result = stmt.get(sessionId, paymentId) as { count: number };
    return result.count > 0;
  }

  addPaymentDeduplication(sessionId: string, paymentId: string, timestamp: number): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO payment_deduplication (session_id, payment_id, timestamp)
      VALUES (?, ?, ?)
    `);
    stmt.run(sessionId, paymentId, timestamp);
  }

  private mapRowToEvent(row: any): StoredEvent {
    return {
      id: row.id,
      websiteId: row.website_id,
      domain: row.domain,
      type: row.type as any,
      href: row.href,
      path: row.path,
      referrer: row.referrer || undefined,
      viewport: row.viewport || undefined,
      visitorId: row.visitor_id,
      sessionId: row.session_id,
      adClickIds: row.ad_click_ids || undefined,
      extraData: row.extra_data || undefined,
      userAgent: row.user_agent || undefined,
      ip: row.ip || undefined,
      eventTimestamp: row.event_timestamp,
      receivedTimestamp: row.received_timestamp,
      stored: row.stored === 1,
      ignoreReason: row.ignore_reason || undefined,
      requestId: row.request_id
    };
  }
}

