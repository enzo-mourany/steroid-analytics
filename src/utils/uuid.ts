/**
 * Génère un identifiant unique simple pour les requêtes
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

