// Fichier: app/api/analytics/stats/route.ts
// Copier ce contenu dans votre projet Next.js

import { NextRequest, NextResponse } from 'next/server';
import { StatisticsResponse, ApiResponse } from '@/types/analytics';

const BACKEND_URL = process.env.ANALYTICS_BACKEND_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    // Récupérer les query parameters requis
    const searchParams = request.nextUrl.searchParams;
    const websiteId = searchParams.get('websiteId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!websiteId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'websiteId, startDate et endDate sont requis' },
        { status: 400 }
      );
    }

    // Construire l'URL du backend
    const backendUrl = new URL(`${BACKEND_URL}/stats`);
    backendUrl.searchParams.append('websiteId', websiteId);
    backendUrl.searchParams.append('startDate', startDate);
    backendUrl.searchParams.append('endDate', endDate);

    // Appeler le backend
    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Optionnel: ajouter un cache
      next: { revalidate: 60 }, // Cache pendant 60 secondes
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data: ApiResponse<StatisticsResponse> = await response.json();

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: data.error || 'Erreur lors de la récupération des statistiques' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}

