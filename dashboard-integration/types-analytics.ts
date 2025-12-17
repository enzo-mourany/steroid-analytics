// Fichier: types/analytics.ts
// Copier ce contenu dans votre projet Next.js

export type EventType = 'pageview' | 'custom' | 'identify' | 'payment' | 'external_link';

export interface StoredEvent {
  id: number;
  websiteId: string;
  domain: string;
  type: EventType;
  href: string;
  path: string;
  referrer?: string;
  viewport?: string;
  visitorId: string;
  sessionId: string;
  adClickIds?: string;
  extraData?: string;
  userAgent?: string;
  ip?: string;
  eventTimestamp: number;
  receivedTimestamp: number;
  stored: boolean;
  ignoreReason?: string;
  requestId: string;
}

export interface EventListQuery {
  websiteId?: string;
  startDate?: string;
  endDate?: string;
  type?: EventType;
  path?: string;
  visitorId?: string;
  sessionId?: string;
  page?: number;
  limit?: number;
}

export interface EventListResponse {
  events: StoredEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StatisticsResponse {
  websiteId: string;
  startDate: string;
  endDate: string;
  pageviews: number;
  uniqueVisitors: number;
  uniqueSessions: number;
  topPages: Array<{ path: string; count: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  topCustomEvents: Array<{ eventName: string; count: number }>;
  conversions: {
    count: number;
    payments: Array<{
      id: number;
      email?: string;
      payment_id?: string;
      amount?: number;
      currency?: string;
      timestamp: number;
    }>;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

