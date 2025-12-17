import { Router, Request, Response } from 'express';
import { ApiResponse, StatisticsResponse } from '../types/api';
import { EventRepository } from '../database/schema';

export function createStatsRouter(eventRepository: EventRepository): Router {
  const router = Router();

  // GET /stats - Statistiques agrégées
  router.get('/', (req: Request, res: Response) => {
    try {
      const websiteId = req.query.websiteId as string;
      const startDateStr = req.query.startDate as string;
      const endDateStr = req.query.endDate as string;

      if (!websiteId) {
        const response: ApiResponse = {
          success: false,
          error: 'websiteId est requis'
        };
        return res.status(400).json(response);
      }

      if (!startDateStr || !endDateStr) {
        const response: ApiResponse = {
          success: false,
          error: 'startDate et endDate sont requis (format ISO ou timestamp)'
        };
        return res.status(400).json(response);
      }

      // Convertir les dates en timestamps
      let startDate: number;
      let endDate: number;

      if (/^\d+$/.test(startDateStr)) {
        // Timestamp
        startDate = parseInt(startDateStr);
        if (startDate < 10000000000) {
          startDate = startDate; // déjà en secondes
        } else {
          startDate = Math.floor(startDate / 1000); // convertir millisecondes en secondes
        }
      } else {
        // ISO string
        startDate = Math.floor(new Date(startDateStr).getTime() / 1000);
      }

      if (/^\d+$/.test(endDateStr)) {
        endDate = parseInt(endDateStr);
        if (endDate < 10000000000) {
          endDate = endDate;
        } else {
          endDate = Math.floor(endDate / 1000);
        }
      } else {
        endDate = Math.floor(new Date(endDateStr).getTime() / 1000);
      }

      const stats = eventRepository.getStatistics(websiteId, startDate, endDate);

      // Formater les paiements
      const payments = stats.payments.map((p: any) => {
        let extraData: any = {};
        try {
          extraData = p.extra_data ? JSON.parse(p.extra_data) : {};
        } catch (e) {
          // Ignore
        }

        return {
          id: p.id,
          email: extraData.email,
          payment_id: extraData.payment_id,
          amount: extraData.amount,
          currency: extraData.currency,
          timestamp: p.event_timestamp
        };
      });

      // Formater les custom events
      const topCustomEvents = stats.topCustomEvents
        .filter((e: any) => e.event_name)
        .map((e: any) => ({
          eventName: e.event_name,
          count: e.count
        }));

      const response: ApiResponse<StatisticsResponse> = {
        success: true,
        data: {
          websiteId,
          startDate: new Date(startDate * 1000).toISOString(),
          endDate: new Date(endDate * 1000).toISOString(),
          pageviews: stats.pageviews,
          uniqueVisitors: stats.uniqueVisitors,
          uniqueSessions: stats.uniqueSessions,
          topPages: stats.topPages.map((p: any) => ({
            path: p.path,
            count: p.count
          })),
          topReferrers: stats.topReferrers.map((r: any) => ({
            referrer: r.referrer,
            count: r.count
          })),
          topCustomEvents,
          conversions: {
            count: payments.length,
            payments
          }
        }
      };

      return res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Erreur lors du calcul des statistiques'
      };
      return res.status(500).json(response);
    }
  });

  return router;
}

