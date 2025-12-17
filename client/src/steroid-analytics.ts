/**
 * Steroid Analytics - Script client de tracking
 * Lit la configuration depuis les paramètres d'URL du script
 */

interface Config {
  websiteId: string;
  domain: string;
  backendUrl: string;
}

interface EventData {
  websiteId: string;
  domain: string;
  type: string;
  href: string;
  referrer?: string;
  viewport?: { width: number; height: number };
  visitorId: string;
  sessionId: string;
  timestamp?: number;
  userAgent?: string;
  extraData?: Record<string, any>;
  adClickIds?: Record<string, string>;
  datafast_ignore?: boolean;
  isIframe?: boolean;
}

class SteroidAnalytics {
  private config: Config | null = null;
  private visitorId: string = '';
  private sessionId: string = '';
  private sessionStartTime: number = 0;
  private initialized: boolean = false;

  constructor() {
    // Vérifier si le tracking est désactivé
    if (this.shouldIgnore()) {
      return;
    }

    // Lire la configuration depuis l'URL du script
    this.config = this.readConfigFromScript();
    if (!this.config) {
      console.warn('Steroid Analytics: Configuration non trouvée');
      return;
    }

    // Initialiser visitor et session
    this.visitorId = this.getOrCreateVisitorId();
    this.sessionId = this.getOrCreateSessionId();
    this.sessionStartTime = Date.now();

    // Vérifier si on est dans une iframe
    const isIframe = window.self !== window.top;

    // Ignorer si dans iframe et non autorisé
    if (isIframe) {
      // Option: ignorer par défaut, ou permettre selon config
      // Pour l'instant, on track même dans les iframes
    }

    // Initialiser le tracking
    this.init();
    this.initialized = true;
  }

  private readConfigFromScript(): Config | null {
    // Trouver le script qui nous a chargé
    const scripts = document.getElementsByTagName('script');
    let currentScript: HTMLScriptElement | null = null;

    for (let i = scripts.length - 1; i >= 0; i--) {
      const script = scripts[i];
      if (script.src && script.src.includes('steroid-analytics.js')) {
        currentScript = script;
        break;
      }
    }

    if (!currentScript || !currentScript.src) {
      return null;
    }

    try {
      const url = new URL(currentScript.src);
      const params = url.searchParams;

      const websiteId = params.get('w');
      const domain = params.get('d');
      const backendUrl = params.get('u');

      if (!websiteId || !domain || !backendUrl) {
        console.error('Steroid Analytics: Paramètres manquants (w, d, u requis)');
        return null;
      }

      return {
        websiteId,
        domain,
        backendUrl: backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl
      };
    } catch (e) {
      console.error('Steroid Analytics: Erreur lors de la lecture de la configuration', e);
      return null;
    }
  }

  private shouldIgnore(): boolean {
    // Vérifier datafast_ignore dans localStorage ou cookie
    if (typeof Storage !== 'undefined') {
      if (localStorage.getItem('datafast_ignore') === 'true') {
        return true;
      }
    }

    // Vérifier dans les cookies
    if (document.cookie.includes('datafast_ignore=true')) {
      return true;
    }

    // Vérifier dans window
    if ((window as any).datafast_ignore === true) {
      return true;
    }

    return false;
  }

  private getOrCreateVisitorId(): string {
    const storageKey = 'steroid_visitor_id';
    
    if (typeof Storage !== 'undefined') {
      let visitorId = localStorage.getItem(storageKey);
      if (visitorId) {
        return visitorId;
      }
      
      // Créer un nouvel ID
      visitorId = this.generateId();
      localStorage.setItem(storageKey, visitorId);
      return visitorId;
    }

    // Fallback: cookie si localStorage non disponible
    const cookieId = this.getCookie('steroid_visitor_id');
    if (cookieId) {
      return cookieId;
    }

    const newId = this.generateId();
    this.setCookie('steroid_visitor_id', newId, 365 * 2); // 2 ans
    return newId;
  }

  private getOrCreateSessionId(): string {
    const storageKey = 'steroid_session_id';
    const sessionTimeKey = 'steroid_session_time';
    
    if (typeof Storage !== 'undefined') {
      const sessionTime = localStorage.getItem(sessionTimeKey);
      const now = Date.now();
      
      // Nouvelle session si > 30 minutes d'inactivité
      if (sessionTime && (now - parseInt(sessionTime)) < 30 * 60 * 1000) {
        const sessionId = localStorage.getItem(storageKey);
        if (sessionId) {
          // Mettre à jour le temps
          localStorage.setItem(sessionTimeKey, now.toString());
          return sessionId;
        }
      }
      
      // Créer une nouvelle session
      const sessionId = this.generateId();
      localStorage.setItem(storageKey, sessionId);
      localStorage.setItem(sessionTimeKey, now.toString());
      return sessionId;
    }

    // Fallback: cookie
    const cookieSession = this.getCookie('steroid_session_id');
    if (cookieSession) {
      return cookieSession;
    }

    const newSessionId = this.generateId();
    this.setCookie('steroid_session_id', newSessionId, 1); // 1 jour
    return newSessionId;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
  }

  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  private setCookie(name: string, value: string, days: number): void {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
  }

  private getViewport(): { width: number; height: number } {
    return {
      width: window.innerWidth || document.documentElement.clientWidth || 0,
      height: window.innerHeight || document.documentElement.clientHeight || 0
    };
  }

  private getAdClickIds(): Record<string, string> {
    const adClickIds: Record<string, string> = {};
    const params = new URLSearchParams(window.location.search);

    const gclid = params.get('gclid');
    if (gclid) adClickIds.gclid = gclid;

    const fbclid = params.get('fbclid');
    if (fbclid) adClickIds.fbclid = fbclid;

    const msclkid = params.get('msclkid');
    if (msclkid) adClickIds.msclkid = msclkid;

    const ttclid = params.get('ttclid');
    if (ttclid) adClickIds.ttclid = ttclid;

    const twclid = params.get('twclid');
    if (twclid) adClickIds.twclid = twclid;

    return adClickIds;
  }

  private init(): void {
    // Attendre que le DOM soit prêt
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.trackPageview());
    } else {
      this.trackPageview();
    }

    // Exposer l'API globale
    (window as any).steroid = this;
  }

  private async sendEvent(eventData: EventData): Promise<void> {
    if (!this.config || !this.initialized) {
      return;
    }

    // Ajouter les données de base
    eventData.websiteId = this.config.websiteId;
    eventData.domain = this.config.domain;
    eventData.visitorId = this.visitorId;
    eventData.sessionId = this.sessionId;
    eventData.timestamp = Math.floor(Date.now() / 1000);
    eventData.userAgent = navigator.userAgent;
    eventData.viewport = this.getViewport();
    eventData.referrer = document.referrer || undefined;
    eventData.href = window.location.href;

    // Ajouter les ad click IDs depuis l'URL
    const adClickIds = this.getAdClickIds();
    if (Object.keys(adClickIds).length > 0) {
      eventData.adClickIds = adClickIds;
    }

    // Vérifier si on est dans une iframe
    if (window.self !== window.top) {
      eventData.isIframe = true;
    }

    try {
      const response = await fetch(`${this.config.backendUrl}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData),
        keepalive: true // Permet d'envoyer même après navigation
      });

      if (!response.ok) {
        console.warn('Steroid Analytics: Erreur lors de l\'envoi de l\'événement', response.status);
      }
    } catch (error) {
      console.warn('Steroid Analytics: Erreur lors de l\'envoi de l\'événement', error);
    }
  }

  public trackPageview(): void {
    if (!this.config) return;

    this.sendEvent({
      websiteId: this.config.websiteId,
      domain: this.config.domain,
      type: 'pageview',
      href: window.location.href,
      visitorId: this.visitorId,
      sessionId: this.sessionId
    });
  }

  public track(eventName: string, params?: Record<string, string | number | boolean>): void {
    if (!this.config) return;

    const extraData: Record<string, any> = {
      eventName,
      ...params
    };

    this.sendEvent({
      websiteId: this.config.websiteId,
      domain: this.config.domain,
      type: 'custom',
      href: window.location.href,
      visitorId: this.visitorId,
      sessionId: this.sessionId,
      extraData
    });
  }

  public identify(userId: string, traits?: Record<string, string | number | boolean>): void {
    if (!this.config) return;

    const extraData: Record<string, any> = {
      user_id: userId,
      ...traits
    };

    this.sendEvent({
      websiteId: this.config.websiteId,
      domain: this.config.domain,
      type: 'identify',
      href: window.location.href,
      visitorId: this.visitorId,
      sessionId: this.sessionId,
      extraData
    });
  }

  public trackPayment(data: {
    email?: string;
    payment_id?: string;
    provider?: string;
    amount?: number;
    currency?: string;
    [key: string]: any;
  }): void {
    if (!this.config) return;

    this.sendEvent({
      websiteId: this.config.websiteId,
      domain: this.config.domain,
      type: 'payment',
      href: window.location.href,
      visitorId: this.visitorId,
      sessionId: this.sessionId,
      email: data.email,
      payment_id: data.payment_id,
      extraData: {
        ...data
      }
    } as any);
  }

  public trackExternalLink(url: string, linkText?: string): void {
    if (!this.config) return;

    this.sendEvent({
      websiteId: this.config.websiteId,
      domain: this.config.domain,
      type: 'external_link',
      href: window.location.href,
      visitorId: this.visitorId,
      sessionId: this.sessionId,
      extraData: {
        linkUrl: url,
        linkText: linkText
      }
    } as any);
  }
}

// Initialiser automatiquement
new SteroidAnalytics();

// Export pour utilisation en module (optionnel)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SteroidAnalytics;
}

