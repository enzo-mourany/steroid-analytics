export type EventType = 'pageview' | 'custom' | 'identify' | 'payment' | 'external_link';

export interface AdClickIds {
  gclid?: string;
  fbclid?: string;
  msclkid?: string;
  ttclid?: string;
  twclid?: string;
  [key: string]: string | undefined;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface BaseEventPayload {
  websiteId: string;
  domain: string;
  type: EventType;
  href: string;
  referrer?: string;
  viewport?: Viewport;
  visitorId: string;
  sessionId: string;
  extraData?: Record<string, any>;
  adClickIds?: AdClickIds;
  timestamp?: number;
  userAgent?: string;
  ip?: string;
  datafast_ignore?: boolean;
  isIframe?: boolean;
}

export interface CustomEventPayload extends BaseEventPayload {
  type: 'custom';
  eventName: string;
  extraData?: Record<string, string | number | boolean>;
}

export interface IdentifyEventPayload extends BaseEventPayload {
  type: 'identify';
  user_id: string;
  extraData?: Record<string, string | number | boolean>;
}

export interface PaymentEventPayload extends BaseEventPayload {
  type: 'payment';
  email?: string;
  payment_id?: string;
  provider?: string;
  amount?: number;
  currency?: string;
  extraData?: Record<string, any>;
}

export interface ExternalLinkEventPayload extends BaseEventPayload {
  type: 'external_link';
  linkUrl: string;
  linkText?: string;
}

export type EventPayload =
  | BaseEventPayload
  | CustomEventPayload
  | IdentifyEventPayload
  | PaymentEventPayload
  | ExternalLinkEventPayload;

export interface StoredEvent {
  id: number;
  websiteId: string;
  domain: string;
  type: EventType;
  href: string;
  path: string;
  referrer?: string;
  viewport?: string; // JSON stringified
  visitorId: string;
  sessionId: string;
  adClickIds?: string; // JSON stringified
  extraData?: string; // JSON stringified
  userAgent?: string;
  ip?: string;
  eventTimestamp: number;
  receivedTimestamp: number;
  stored: boolean; // true if stored, false if ignored
  ignoreReason?: string;
  requestId: string;
}

export interface IgnoreReason {
  code: string;
  message: string;
}

