import { StoredEvent, EventType } from './event';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  ignored?: boolean;
  ignoreReason?: string;
  requestId?: string;
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

