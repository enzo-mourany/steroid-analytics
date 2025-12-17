# Intégration Dashboard Next.js - Guide pour Cursor

Ce guide détaille précisément comment intégrer le backend Steroid Analytics dans un dashboard Next.js existant.

## Structure à créer

Créez la structure suivante dans votre projet Next.js :

```
votre-projet-nextjs/
├── app/                    # Si vous utilisez App Router
│   └── api/
│       └── analytics/
│           ├── events/
│           │   └── route.ts
│           └── stats/
│               └── route.ts
│
└── types/                  # Types TypeScript partagés
    └── analytics.ts
```

OU (si vous utilisez Pages Router) :

```
votre-projet-nextjs/
├── pages/
│   └── api/
│       └── analytics/
│           ├── events.ts
│           └── stats.ts
│
└── types/                  # Types TypeScript partagés
    └── analytics.ts
```

## 1. Configuration

### Fichier .env.local

Ajoutez dans `.env.local` :

```env
ANALYTICS_BACKEND_URL=http://localhost:3000
```

Ou en production :

```env
ANALYTICS_BACKEND_URL=https://votre-backend.com
```

## 2. Types TypeScript

Créez `types/analytics.ts` avec les types suivants :

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

## 3. API Routes (App Router)

### app/api/analytics/events/route.ts

```typescript
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
```

### app/api/analytics/stats/route.ts

```typescript
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
```

## 4. API Routes (Pages Router - Alternative)

Si vous utilisez Pages Router au lieu d'App Router :

### pages/api/analytics/events.ts

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
```

### pages/api/analytics/stats.ts

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
```

## 5. Service/Hook pour utiliser dans les composants

Créez un hook ou service pour faciliter l'utilisation :

### hooks/useAnalytics.ts (avec React Query ou SWR)

```typescript
import useSWR from 'swr';
import { EventListQuery, EventListResponse, StatisticsResponse, ApiResponse } from '@/types/analytics';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch');
  }
  const data: ApiResponse = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Request failed');
  }
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
    {
      refreshInterval: 30000, // Refresh toutes les 30 secondes
      revalidateOnFocus: true,
    }
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
    {
      refreshInterval: 60000, // Refresh toutes les 60 secondes
      revalidateOnFocus: true,
    }
  );

  return {
    stats: data,
    isLoading,
    error,
    refresh: mutate,
  };
}
```

### OU sans SWR/React Query (simple fetch)

### services/analyticsService.ts

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
  if (!response.ok) {
    throw new Error('Failed to fetch events');
  }

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
  if (!response.ok) {
    throw new Error('Failed to fetch stats');
  }

  const data: ApiResponse<StatisticsResponse> = await response.json();
  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch stats');
  }

  return data.data;
}
```

## 6. Exemple d'utilisation dans un composant

### components/analytics/Dashboard.tsx

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useStats } from '@/hooks/useAnalytics';
import { format } from 'date-fns';

export default function AnalyticsDashboard() {
  const [websiteId, setWebsiteId] = useState('test-site');
  const [startDate, setStartDate] = useState(format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { stats, isLoading, error } = useStats(websiteId, startDate, endDate);

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error.message}</div>;
  if (!stats) return null;

  return (
    <div>
      <h1>Analytics Dashboard</h1>
      
      <div className="filters">
        <input
          type="text"
          value={websiteId}
          onChange={(e) => setWebsiteId(e.target.value)}
          placeholder="Website ID"
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Pageviews</h3>
          <p>{stats.pageviews.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3>Visiteurs uniques</h3>
          <p>{stats.uniqueVisitors.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3>Sessions uniques</h3>
          <p>{stats.uniqueSessions.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3>Conversions</h3>
          <p>{stats.conversions.count.toLocaleString()}</p>
        </div>
      </div>

      <div className="top-pages">
        <h2>Pages les plus vues</h2>
        <ul>
          {stats.topPages.map((page, index) => (
            <li key={index}>
              {page.path} - {page.count.toLocaleString()} vues
            </li>
          ))}
        </ul>
      </div>

      <div className="top-referrers">
        <h2>Referrers principaux</h2>
        <ul>
          {stats.topReferrers.map((referrer, index) => (
            <li key={index}>
              {referrer.referrer} - {referrer.count.toLocaleString()} visites
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

### components/analytics/EventsTable.tsx

```typescript
'use client';

import { useState } from 'react';
import { useEvents } from '@/hooks/useAnalytics';
import { EventType } from '@/types/analytics';

export default function EventsTable() {
  const [websiteId, setWebsiteId] = useState('test-site');
  const [page, setPage] = useState(1);
  const [type, setType] = useState<EventType | undefined>(undefined);

  const { events, total, totalPages, isLoading, error } = useEvents({
    websiteId,
    page,
    limit: 50,
    type,
  });

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error.message}</div>;

  return (
    <div>
      <h2>Événements</h2>
      
      <div className="filters">
        <input
          type="text"
          value={websiteId}
          onChange={(e) => setWebsiteId(e.target.value)}
          placeholder="Website ID"
        />
        <select value={type || ''} onChange={(e) => setType(e.target.value as EventType || undefined)}>
          <option value="">Tous les types</option>
          <option value="pageview">Pageview</option>
          <option value="custom">Custom</option>
          <option value="identify">Identify</option>
          <option value="payment">Payment</option>
          <option value="external_link">External Link</option>
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Path</th>
            <th>Visiteur</th>
            <th>Date</th>
            <th>Stored</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>{event.id}</td>
              <td>{event.type}</td>
              <td>{event.path}</td>
              <td>{event.visitorId.substring(0, 8)}...</td>
              <td>{new Date(event.eventTimestamp * 1000).toLocaleString()}</td>
              <td>{event.stored ? '✅' : '❌'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
          Précédent
        </button>
        <span>Page {page} / {totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
          Suivant
        </button>
      </div>
    </div>
  );
}
```

## 7. Instructions pour Cursor

### Checklist d'intégration

1. ✅ Créer le fichier `.env.local` avec `ANALYTICS_BACKEND_URL`
2. ✅ Créer `types/analytics.ts` avec tous les types
3. ✅ Créer les API routes :
   - `app/api/analytics/events/route.ts` (App Router) OU `pages/api/analytics/events.ts` (Pages Router)
   - `app/api/analytics/stats/route.ts` (App Router) OU `pages/api/analytics/stats.ts` (Pages Router)
4. ✅ Créer le hook/service :
   - `hooks/useAnalytics.ts` (avec SWR) OU `services/analyticsService.ts` (sans SWR)
5. ✅ Créer les composants d'affichage :
   - Dashboard principal avec statistiques
   - Tableau des événements
   - Filtres (dates, websiteId, type, etc.)

### Points d'attention

- **Format des dates** : Utiliser ISO strings (YYYY-MM-DD) ou timestamps Unix en secondes
- **Gestion d'erreurs** : Toujours vérifier `data.success` avant d'utiliser `data.data`
- **Types** : Utiliser strictement les types définis dans `types/analytics.ts`
- **URL du backend** : Vérifier que `ANALYTICS_BACKEND_URL` est correctement configuré
- **CORS** : Le backend autorise déjà CORS, mais vérifier si vous avez des restrictions spécifiques

### Tests

Testez les endpoints :
- `GET /api/analytics/stats?websiteId=test-site&startDate=2024-01-01&endDate=2024-12-31`
- `GET /api/analytics/events?websiteId=test-site&page=1&limit=50`

Ils doivent retourner les mêmes données que les endpoints directs du backend.

