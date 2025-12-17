import Database from 'better-sqlite3';

export class DomainAuthService {
  constructor(private db: Database.Database) {}

  /**
   * Enregistre un site avec son domaine autorisé
   */
  registerSite(websiteId: string, domain: string, allowedHosts?: string[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sites (website_id, domain, allowed_hosts)
      VALUES (?, ?, ?)
    `);
    stmt.run(websiteId, domain, allowedHosts ? JSON.stringify(allowedHosts) : null);
  }

  /**
   * Vérifie si un domaine/hostname est autorisé pour un websiteId
   */
  isDomainAuthorized(websiteId: string, domain: string, href: string): boolean {
    const stmt = this.db.prepare(`
      SELECT domain, allowed_hosts FROM sites WHERE website_id = ?
    `);
    const site = stmt.get(websiteId) as { domain: string; allowed_hosts: string | null } | undefined;

    if (!site) {
      // Si le site n'est pas enregistré, on autorise par défaut (ou on peut changer ce comportement)
      // Pour l'instant, on autorise
      return true;
    }

    // Extraire l'hostname de l'URL
    try {
      const url = new URL(href);
      const hostname = url.hostname;

      // Vérifier le domaine principal
      if (hostname === site.domain || hostname.endsWith('.' + site.domain)) {
        return true;
      }

      // Vérifier la liste des hostnames autorisés
      if (site.allowed_hosts) {
        const allowedHosts = JSON.parse(site.allowed_hosts) as string[];
        if (allowedHosts.includes(hostname)) {
          return true;
        }
      }

      return false;
    } catch (e) {
      // Si l'URL est invalide, on retourne false
      return false;
    }
  }

  /**
   * Liste tous les sites enregistrés
   */
  listSites(): Array<{ websiteId: string; domain: string; allowedHosts?: string[] }> {
    const stmt = this.db.prepare('SELECT website_id, domain, allowed_hosts FROM sites');
    const rows = stmt.all() as Array<{ website_id: string; domain: string; allowed_hosts: string | null }>;
    
    return rows.map(row => ({
      websiteId: row.website_id,
      domain: row.domain,
      allowedHosts: row.allowed_hosts ? JSON.parse(row.allowed_hosts) : undefined
    }));
  }
}

