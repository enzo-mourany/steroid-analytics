import { EventPayload, PaymentEventPayload } from '../types/event';
import { EventRepository } from '../database/schema';
import { Config } from '../types/config';

export class ThrottlingService {
  constructor(
    private eventRepository: EventRepository,
    private config: Config
  ) {}

  /**
   * Vérifie si un pageview doit être throttlé (ignoré car trop récent)
   */
  shouldThrottlePageview(visitorId: string, href: string): boolean {
    // Extraire le path de l'URL
    try {
      const url = new URL(href);
      const path = url.pathname + url.search; // Inclure les query params pour différencier les pages
      
      const now = Math.floor(Date.now() / 1000);
      const windowStart = now - this.config.throttling.pageviewWindowSeconds;

      return this.eventRepository.checkPageviewThrottle(visitorId, path, windowStart);
    } catch (e) {
      // Si l'URL est invalide, on ne throttle pas
      return false;
    }
  }

  /**
   * Enregistre un pageview pour le throttling
   */
  recordPageview(visitorId: string, href: string): void {
    try {
      const url = new URL(href);
      const path = url.pathname + url.search;
      const timestamp = Math.floor(Date.now() / 1000);
      
      this.eventRepository.addPageviewThrottle(visitorId, path, timestamp);
    } catch (e) {
      // Ignore si l'URL est invalide
    }
  }

  /**
   * Vérifie si un paiement doit être ignoré (déjà enregistré)
   */
  isPaymentDuplicate(event: PaymentEventPayload): boolean {
    if (!event.payment_id && !event.email) {
      return false;
    }

    // Utiliser payment_id en priorité, sinon email
    const paymentId = event.payment_id || `email:${event.email}`;
    
    return this.eventRepository.checkPaymentDeduplication(event.sessionId, paymentId);
  }

  /**
   * Enregistre un paiement pour la déduplication
   */
  recordPayment(event: PaymentEventPayload): void {
    if (!event.payment_id && !event.email) {
      return;
    }

    const paymentId = event.payment_id || `email:${event.email}`;
    const timestamp = Math.floor(Date.now() / 1000);
    
    this.eventRepository.addPaymentDeduplication(event.sessionId, paymentId, timestamp);
  }
}

