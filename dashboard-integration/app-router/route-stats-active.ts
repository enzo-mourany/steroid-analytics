// Fichier: app/api/analytics/stats/active/route.ts
// Pour Next.js avec App Router (Next.js 13+)

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types/analytics';

const BACKEND_URL = process.env.ANALYTICS_BACKEND_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const websiteId = searchParams.get('websiteId');
    const windowMinutes = searchParams.get('windowMinutes') || '5';

    if (!websiteId) {
      return NextResponse.json(
        { success: false, error: 'websiteId est requis' },
        { status: 400 }
      );
    }

    const backendUrl = new URL(`${BACKEND_URL}/stats/active`);
    backendUrl.searchParams.append('websiteId', websiteId);
    backendUrl.searchParams.append('windowMinutes', windowMinutes);

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 0 }, // Pas de cache pour les stats actives
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data: ApiResponse = await response.json();

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: data.error || 'Erreur lors de la récupération des stats actives' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching active stats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la récupération des stats actives' },
      { status: 500 }
    );
  }
}

