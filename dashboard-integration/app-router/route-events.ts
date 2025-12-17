// Fichier: app/api/analytics/events/route.ts
// Copier ce contenu dans votre projet Next.js

import { NextRequest, NextResponse } from 'next/server';
import { EventListQuery, EventListResponse, ApiResponse } from '@/types/analytics';

const BACKEND_URL = process.env.ANALYTICS_BACKEND_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    // Récupérer les query parameters
    const searchParams = request.nextUrl.searchParams;
    
    const query: EventListQuery = {
      websiteId: searchParams.get('websiteId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      type: searchParams.get('type') as any || undefined,
      path: searchParams.get('path') || undefined,
      visitorId: searchParams.get('visitorId') || undefined,
      sessionId: searchParams.get('sessionId') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    };

    // Construire l'URL du backend
    const backendUrl = new URL(`${BACKEND_URL}/events`);
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        backendUrl.searchParams.append(key, String(value));
      }
    });

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

    const data: ApiResponse<EventListResponse> = await response.json();

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: data.error || 'Erreur lors de la récupération des événements' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la récupération des événements' },
      { status: 500 }
    );
  }
}

