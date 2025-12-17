// Fichier: pages/api/analytics/events.ts
// Pour Next.js avec Pages Router (Next.js 12 et précédents)

import type { NextApiRequest, NextApiResponse } from 'next';
import { EventListQuery, EventListResponse, ApiResponse } from '@/types/analytics';

const BACKEND_URL = process.env.ANALYTICS_BACKEND_URL || 'http://localhost:3000';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<EventListResponse>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const query: EventListQuery = {
      websiteId: req.query.websiteId as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      type: req.query.type as any,
      path: req.query.path as string | undefined,
      visitorId: req.query.visitorId as string | undefined,
      sessionId: req.query.sessionId as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

    const backendUrl = new URL(`${BACKEND_URL}/events`);
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        backendUrl.searchParams.append(key, String(value));
      }
    });

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data: ApiResponse<EventListResponse> = await response.json();

    if (!data.success) {
      return res.status(500).json({
        success: false,
        error: data.error || 'Erreur lors de la récupération des événements',
      });
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Error fetching events:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération des événements',
    });
  }
}

