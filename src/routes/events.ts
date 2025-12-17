import { Router, Request, Response } from 'express';
import { EventPayload, StoredEvent } from '../types/event';
import { ApiResponse, EventListQuery, EventListResponse } from '../types/api';
import { ValidationService } from '../services/validation';
import { DomainAuthService } from '../services/domainAuth';
import { ThrottlingService } from '../services/throttling';
import { EventRepository } from '../database/schema';
import { generateRequestId } from '../utils/uuid';
import { URL } from 'url';
import { Config } from '../types/config';

export function createEventsRouter(
  validationService: ValidationService,
  domainAuthService: DomainAuthService,
  throttlingService: ThrottlingService,
  eventRepository: EventRepository,
  config: Config
): Router {
  const router = Router();

  // POST /events - Ingestion d'un événement
  router.post('/', async (req: Request, res: Response) => {
    const requestId = generateRequestId();
    const receivedTimestamp = Math.floor(Date.now() / 1000);

    try {
      const event = req.body as EventPayload;
      
      // Extraire l'IP de la requête si non fournie
      if (!event.ip) {
        event.ip = req.ip || req.socket.remoteAddress || 
          (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
          (req.headers['x-real-ip'] as string) ||
          undefined;
      }

      // Validation et vérification des règles d'ignore
      const validation = validationService.validateAndCheckIgnore(event);
      if (!validation.valid) {
        // Enregistrer l'événement ignoré
        const ignoredEvent = createEventRecord(event, receivedTimestamp, requestId, false, validation.ignoreReason?.message);
        eventRepository.insertEvent(ignoredEvent);

        const response: ApiResponse = {
          success: true,
          ignored: true,
          ignoreReason: validation.ignoreReason?.message,
          requestId
        };
        return res.status(200).json(response);
      }

      // Vérification de l'autorisation du domaine
      if (!domainAuthService.isDomainAuthorized(event.websiteId, event.domain, event.href)) {
        const ignoredEvent = createEventRecord(event, receivedTimestamp, requestId, false, 'DOMAIN_NOT_AUTHORIZED: Domaine non autorisé pour ce websiteId');
        eventRepository.insertEvent(ignoredEvent);

        const response: ApiResponse = {
          success: true,
          ignored: true,
          ignoreReason: 'DOMAIN_NOT_AUTHORIZED: Domaine non autorisé pour ce websiteId',
          requestId
        };
        return res.status(200).json(response);
      }

      // Throttling pour les pageviews
      if (event.type === 'pageview') {
        if (throttlingService.shouldThrottlePageview(event.visitorId, event.href)) {
          const ignoredEvent = createEventRecord(event, receivedTimestamp, requestId, false, 'THROTTLED: Pageview trop récent pour ce visiteur et cette URL');
          eventRepository.insertEvent(ignoredEvent);

          const response: ApiResponse = {
            success: true,
            ignored: true,
            ignoreReason: 'THROTTLED: Pageview trop récent pour ce visiteur et cette URL',
            requestId
          };
          return res.status(200).json(response);
        }
        throttlingService.recordPageview(event.visitorId, event.href);
      }

      // Déduplication pour les paiements
      if (event.type === 'payment') {
        if (throttlingService.isPaymentDuplicate(event as any)) {
          const ignoredEvent = createEventRecord(event, receivedTimestamp, requestId, false, 'DUPLICATE_PAYMENT: Paiement déjà enregistré pour cette session');
          eventRepository.insertEvent(ignoredEvent);

          const response: ApiResponse = {
            success: true,
            ignored: true,
            ignoreReason: 'DUPLICATE_PAYMENT: Paiement déjà enregistré pour cette session',
            requestId
          };
          return res.status(200).json(response);
        }
        throttlingService.recordPayment(event as any);
      }

      // Nettoyage des données custom si nécessaire
      if (event.type === 'custom' && event.extraData) {
        event.extraData = validationService.sanitizeCustomEventData(event.extraData);
      }

      // Enregistrer l'événement
      const storedEvent = createEventRecord(event, receivedTimestamp, requestId, true);
      const eventId = eventRepository.insertEvent(storedEvent);

      const response: ApiResponse<{ eventId: number }> = {
        success: true,
        data: { eventId },
        requestId
      };
      return res.status(201).json(response);

    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Erreur lors du traitement de l\'événement',
        requestId
      };
      return res.status(500).json(response);
    }
  });

  // GET /events - Liste des événements
  router.get('/', (req: Request, res: Response) => {
    try {
      // Convertir les dates en timestamps
      let startDate: number | undefined;
      let endDate: number | undefined;

      if (req.query.startDate) {
        const startDateStr = req.query.startDate as string;
        if (/^\d+$/.test(startDateStr)) {
          // Timestamp
          startDate = parseInt(startDateStr);
          if (startDate > 10000000000) {
            startDate = Math.floor(startDate / 1000); // convertir millisecondes en secondes
          }
        } else {
          // ISO string
          startDate = Math.floor(new Date(startDateStr).getTime() / 1000);
        }
      }

      if (req.query.endDate) {
        const endDateStr = req.query.endDate as string;
        if (/^\d+$/.test(endDateStr)) {
          // Timestamp
          endDate = parseInt(endDateStr);
          if (endDate > 10000000000) {
            endDate = Math.floor(endDate / 1000); // convertir millisecondes en secondes
          }
        } else {
          // ISO string
          endDate = Math.floor(new Date(endDateStr).getTime() / 1000);
        }
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const offset = (page - 1) * limit;

      const { events, total } = eventRepository.findEvents({
        websiteId: req.query.websiteId as string | undefined,
        startDate,
        endDate,
        type: req.query.type as string | undefined,
        path: req.query.path as string | undefined,
        visitorId: req.query.visitorId as string | undefined,
        sessionId: req.query.sessionId as string | undefined,
        limit,
        offset
      });

      const response: ApiResponse<EventListResponse> = {
        success: true,
        data: {
          events,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };

      return res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Erreur lors de la récupération des événements'
      };
      return res.status(500).json(response);
    }
  });

  return router;
}

function createEventRecord(
  event: EventPayload,
  receivedTimestamp: number,
  requestId: string,
  stored: boolean,
  ignoreReason?: string
): Omit<StoredEvent, 'id'> {
  // Extraire le path de l'URL
  let path = event.href;
  try {
    const url = new URL(event.href);
    path = url.pathname + url.search;
  } catch (e) {
    // Garder href si l'URL est invalide
  }

  // Préparer les données pour le stockage
  const extraData: any = { ...event.extraData };
  
  // Ajouter les champs spécifiques selon le type
  if (event.type === 'custom') {
    extraData.eventName = (event as any).eventName;
  } else if (event.type === 'external_link') {
    extraData.linkUrl = (event as any).linkUrl;
    extraData.linkText = (event as any).linkText;
  } else if (event.type === 'payment') {
    const paymentEvent = event as any;
    if (paymentEvent.email) extraData.email = paymentEvent.email;
    if (paymentEvent.payment_id) extraData.payment_id = paymentEvent.payment_id;
    if (paymentEvent.provider) extraData.provider = paymentEvent.provider;
    if (paymentEvent.amount !== undefined) extraData.amount = paymentEvent.amount;
    if (paymentEvent.currency) extraData.currency = paymentEvent.currency;
  } else if (event.type === 'identify') {
    const identifyEvent = event as any;
    if (identifyEvent.user_id) extraData.user_id = identifyEvent.user_id;
  }

  return {
    websiteId: event.websiteId,
    domain: event.domain,
    type: event.type,
    href: event.href,
    path,
    referrer: event.referrer,
    viewport: event.viewport ? JSON.stringify(event.viewport) : undefined,
    visitorId: event.visitorId,
    sessionId: event.sessionId,
    adClickIds: event.adClickIds ? JSON.stringify(event.adClickIds) : undefined,
    extraData: Object.keys(extraData).length > 0 ? JSON.stringify(extraData) : undefined,
    userAgent: event.userAgent,
    ip: event.ip,
    eventTimestamp: event.timestamp || receivedTimestamp,
    receivedTimestamp,
    stored,
    ignoreReason,
    requestId
  };
}

