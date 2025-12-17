// Fichier: pages/api/analytics/stats.ts
// Pour Next.js avec Pages Router (Next.js 12 et précédents)

import type { NextApiRequest, NextApiResponse } from 'next';
import { StatisticsResponse, ApiResponse } from '@/types/analytics';

const BACKEND_URL = process.env.ANALYTICS_BACKEND_URL || 'http://localhost:3000';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<StatisticsResponse>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { websiteId, startDate, endDate } = req.query;

    if (!websiteId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'websiteId, startDate et endDate sont requis',
      });
    }

    const backendUrl = new URL(`${BACKEND_URL}/stats`);
    backendUrl.searchParams.append('websiteId', websiteId as string);
    backendUrl.searchParams.append('startDate', startDate as string);
    backendUrl.searchParams.append('endDate', endDate as string);

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data: ApiResponse<StatisticsResponse> = await response.json();

    if (!data.success) {
      return res.status(500).json({
        success: false,
        error: data.error || 'Erreur lors de la récupération des statistiques',
      });
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération des statistiques',
    });
  }
}

