# PROMPT POUR CURSOR - Intégration Analytics Dashboard

Copiez-collez ce prompt directement dans Cursor.

---

Intègre le backend Steroid Analytics dans ce projet Next.js pour afficher les données de tracking dans le dashboard. Le backend expose deux endpoints REST :

- `GET /events` - Liste des événements avec filtres et pagination
- `GET /stats` - Statistiques agrégées (pageviews, visiteurs, sessions, etc.)

## CONFIGURATION

1. **Crée ou modifie `.env.local`** pour ajouter :
```env
ANALYTICS_BACKEND_URL=https://steroid-analytics-backend.onrender.com/
```

## TYPES TYPESCRIPT

2. **Crée le fichier `types/analytics.ts`** avec le contenu suivant :

```typescript
export type EventType = 'pageview' | 'custom' | 'identify' | 'payment' | 'external_link';

export interface StoredEvent {
  id: number;
  websiteId: string;
  domain: string;
  type: EventType;
  href: string;
  path: string;
  referrer?: string;
  viewport?: string;
  visitorId: string;
  sessionId: string;
  adClickIds?: string;
  extraData?: string;
  userAgent?: string;
  ip?: string;
  eventTimestamp: number;
  receivedTimestamp: number;
  stored: boolean;
  ignoreReason?: string;
  requestId: string;
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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
```

## API ROUTES

3. **Crée les API routes Next.js** qui font proxy vers le backend.

### Si tu utilises App Router (Next.js 13+) :

**Crée `app/api/analytics/events/route.ts`** :

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { EventListQuery, EventListResponse, ApiResponse } from '@/types/analytics';

const BACKEND_URL = process.env.ANALYTICS_BACKEND_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
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

    const backendUrl = new URL(`${BACKEND_URL}/events`);
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        backendUrl.searchParams.append(key, String(value));
      }
    });

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 },
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
```

**Crée `app/api/analytics/stats/route.ts`** :

Copie le contenu depuis `dashboard-integration/app-router/route-stats.ts` ou utilise le code suivant :

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { StatisticsResponse, ApiResponse } from '@/types/analytics';

const BACKEND_URL = process.env.ANALYTICS_BACKEND_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
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

    const backendUrl = new URL(`${BACKEND_URL}/stats`);
    backendUrl.searchParams.append('websiteId', websiteId);
    backendUrl.searchParams.append('startDate', startDate);
    backendUrl.searchParams.append('endDate', endDate);

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 },
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
```

### Si tu utilises Pages Router (Next.js 12 et précédents) :

**Crée `pages/api/analytics/events.ts`** :

```typescript
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
      headers: { 'Content-Type': 'application/json' },
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
```

**Crée `pages/api/analytics/stats.ts`** :

```typescript
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
      headers: { 'Content-Type': 'application/json' },
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
```

## HOOKS/SERVICES POUR UTILISER LES DONNÉES

4. **Crée un hook ou service** pour faciliter l'utilisation dans les composants.

### Option A : Avec SWR (si disponible dans le projet)

**Crée `hooks/useAnalytics.ts`** :

```typescript
import useSWR from 'swr';
import { EventListQuery, EventListResponse, StatisticsResponse, ApiResponse } from '@/types/analytics';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  const data: ApiResponse = await res.json();
  if (!data.success) throw new Error(data.error || 'Request failed');
  return data.data;
};

export function useEvents(query: EventListQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });

  const { data, error, isLoading, mutate } = useSWR<EventListResponse>(
    `/api/analytics/events?${params.toString()}`,
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: true }
  );

  return {
    events: data?.events || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 50,
    totalPages: data?.totalPages || 0,
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useStats(websiteId: string, startDate: string, endDate: string) {
  const { data, error, isLoading, mutate } = useSWR<StatisticsResponse>(
    websiteId && startDate && endDate
      ? `/api/analytics/stats?websiteId=${websiteId}&startDate=${startDate}&endDate=${endDate}`
      : null,
    fetcher,
    { refreshInterval: 60000, revalidateOnFocus: true }
  );

  return {
    stats: data,
    isLoading,
    error,
    refresh: mutate,
  };
}
```

### Option B : Sans SWR (fetch simple)

**Crée `services/analyticsService.ts`** :

```typescript
import { EventListQuery, EventListResponse, StatisticsResponse, ApiResponse } from '@/types/analytics';

export async function getEvents(query: EventListQuery): Promise<EventListResponse> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });

  const response = await fetch(`/api/analytics/events?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch events');

  const data: ApiResponse<EventListResponse> = await response.json();
  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch events');
  }

  return data.data;
}

export async function getStats(
  websiteId: string,
  startDate: string,
  endDate: string
): Promise<StatisticsResponse> {
  const response = await fetch(
    `/api/analytics/stats?websiteId=${websiteId}&startDate=${startDate}&endDate=${endDate}`
  );
  if (!response.ok) throw new Error('Failed to fetch stats');

  const data: ApiResponse<StatisticsResponse> = await response.json();
  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch stats');
  }

  return data.data;
}
```

## NOTES IMPORTANTES

- **Format des dates** : Utiliser des ISO strings (YYYY-MM-DD) ou des timestamps Unix en secondes
- **Gestion d'erreurs** : Toujours vérifier `data.success` avant d'utiliser `data.data`
- **CORS** : Le backend autorise déjà CORS, donc pas de problème de ce côté
- **Structure** : Utilise la structure de fichiers existante du projet (adapte les imports si nécessaire)

## EXEMPLE D'UTILISATION

Une fois les hooks/services créés, tu peux les utiliser dans tes composants comme ceci :

```typescript
'use client';

import { useState } from 'react';
import { useStats } from '@/hooks/useAnalytics'; // ou depuis services/analyticsService

export default function Dashboard() {
  const [websiteId, setWebsiteId] = useState('test-site');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');

  const { stats, isLoading, error } = useStats(websiteId, startDate, endDate);

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error.message}</div>;
  if (!stats) return null;

  return (
    <div>
      <h1>Analytics Dashboard</h1>
      <div>
        <p>Pageviews: {stats.pageviews}</p>
        <p>Visiteurs uniques: {stats.uniqueVisitors}</p>
        <p>Sessions: {stats.uniqueSessions}</p>
      </div>
      {/* ... reste de l'affichage */}
    </div>
  );
}
```

## VÉRIFICATION

Après l'intégration, teste que les endpoints fonctionnent :
- `GET /api/analytics/stats?websiteId=test-site&startDate=2024-01-01&endDate=2024-12-31`
- `GET /api/analytics/events?websiteId=test-site&page=1&limit=50`

Ils doivent retourner des objets avec `success: true` et `data` contenant les données.

---

**IMPORTANT** : Adapte les chemins d'import (`@/types/analytics`, `@/hooks/useAnalytics`, etc.) selon la configuration de ton projet Next.js (alias dans `tsconfig.json`).
