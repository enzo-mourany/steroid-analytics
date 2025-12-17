import { EventPayload, IgnoreReason, CustomEventPayload, IdentifyEventPayload, PaymentEventPayload } from '../types/event';
import { Config } from '../types/config';
import { BotDetectionService } from './botDetection';
import { URL } from 'url';

export class ValidationService {
  private botDetection: BotDetectionService;

  constructor(private config: Config) {
    this.botDetection = new BotDetectionService();
  }

  validateAndCheckIgnore(event: EventPayload): { valid: boolean; ignoreReason?: IgnoreReason } {
    // 1. Vérifier si le tracking est explicitement désactivé
    if (event.datafast_ignore === true) {
      return {
        valid: false,
        ignoreReason: {
          code: 'TRACKING_DISABLED',
          message: 'Tracking explicitement désactivé (datafast_ignore)'
        }
      };
    }

    // 2. Validation des champs requis
    const requiredFields = ['websiteId', 'domain', 'type', 'href', 'visitorId', 'sessionId'];
    for (const field of requiredFields) {
      if (!event[field as keyof EventPayload]) {
        return {
          valid: false,
          ignoreReason: {
            code: 'MISSING_REQUIRED_FIELD',
            message: `Champ requis manquant: ${field}`
          }
        };
      }
    }

    // 3. Vérification de la taille de l'événement
    const eventSize = JSON.stringify(event).length;
    if (eventSize > this.config.validation.maxEventSize) {
      return {
        valid: false,
        ignoreReason: {
          code: 'EVENT_TOO_LARGE',
          message: `Événement trop volumineux: ${eventSize} bytes (max: ${this.config.validation.maxEventSize})`
        }
      };
    }

    // 4. Validation de l'URL
    try {
      const url = new URL(event.href);
      
      // Vérifier le protocole file
      if (!this.config.ignoreRules.allowFileProtocol && url.protocol === 'file:') {
        return {
          valid: false,
          ignoreReason: {
            code: 'FILE_PROTOCOL_NOT_ALLOWED',
            message: 'Protocole file:// non autorisé'
          }
        };
      }

      // Vérifier localhost
      if (!this.config.ignoreRules.allowLocalhost && 
          (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1')) {
        return {
          valid: false,
          ignoreReason: {
            code: 'LOCALHOST_NOT_ALLOWED',
            message: 'Environnement localhost non autorisé'
          }
        };
      }
    } catch (e) {
      return {
        valid: false,
        ignoreReason: {
          code: 'INVALID_URL',
          message: `URL invalide: ${event.href}`
        }
      };
    }

    // 5. Vérification iframe
    if (!this.config.ignoreRules.allowIframes && event.isIframe === true) {
      return {
        valid: false,
        ignoreReason: {
          code: 'IFRAME_NOT_ALLOWED',
          message: 'Exécution dans une iframe non autorisée'
        }
      };
    }

    // 6. Détection de bots
    if (this.config.botDetection.enabled && this.botDetection.isBot(event.userAgent)) {
      return {
        valid: false,
        ignoreReason: {
          code: 'BOT_DETECTED',
          message: `Bot détecté: ${event.userAgent || 'User-Agent manquant'}`
        }
      };
    }

    // 7. Validation spécifique par type d'événement
    switch (event.type) {
      case 'custom':
        return this.validateCustomEvent(event as CustomEventPayload);
      case 'identify':
        return this.validateIdentifyEvent(event as IdentifyEventPayload);
      case 'payment':
        return this.validatePaymentEvent(event as PaymentEventPayload);
      case 'external_link':
        // Validation basique pour external_link
        if (!(event as any).linkUrl) {
          return {
            valid: false,
            ignoreReason: {
              code: 'MISSING_REQUIRED_FIELD',
              message: 'Champ requis manquant pour external_link: linkUrl'
            }
          };
        }
        break;
      case 'pageview':
        // Pas de validation supplémentaire pour pageview
        break;
    }

    return { valid: true };
  }

  private validateCustomEvent(event: CustomEventPayload): { valid: boolean; ignoreReason?: IgnoreReason } {
    if (!event.eventName || event.eventName.trim() === '') {
      return {
        valid: false,
        ignoreReason: {
          code: 'MISSING_EVENT_NAME',
          message: 'eventName requis pour les événements custom'
        }
      };
    }

    // Validation des paramètres custom
    if (event.extraData) {
      const paramCount = Object.keys(event.extraData).filter(key => key !== 'eventName').length;
      if (paramCount > this.config.validation.maxCustomParams) {
        return {
          valid: false,
          ignoreReason: {
            code: 'TOO_MANY_CUSTOM_PARAMS',
            message: `Trop de paramètres custom: ${paramCount} (max: ${this.config.validation.maxCustomParams})`
          }
        };
      }

      // Valider chaque paramètre
      for (const [key, value] of Object.entries(event.extraData)) {
        if (key === 'eventName') continue;

        // Longueur du nom
        if (key.length > this.config.validation.maxParamNameLength) {
          return {
            valid: false,
            ignoreReason: {
              code: 'PARAM_NAME_TOO_LONG',
              message: `Nom de paramètre trop long: ${key} (max: ${this.config.validation.maxParamNameLength})`
            }
          };
        }

        // Format du nom (alphanumérique + underscore/hyphen)
        if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
          return {
            valid: false,
            ignoreReason: {
              code: 'INVALID_PARAM_NAME',
              message: `Nom de paramètre invalide: ${key} (seulement alphanumérique, underscore et tiret)`
            }
          };
        }

        // Longueur de la valeur
        const valueStr = String(value);
        if (valueStr.length > this.config.validation.maxParamValueLength) {
          return {
            valid: false,
            ignoreReason: {
              code: 'PARAM_VALUE_TOO_LONG',
              message: `Valeur de paramètre trop longue pour ${key} (max: ${this.config.validation.maxParamValueLength})`
            }
          };
        }
      }
    }

    return { valid: true };
  }

  private validateIdentifyEvent(event: IdentifyEventPayload): { valid: boolean; ignoreReason?: IgnoreReason } {
    if (!event.user_id || event.user_id.trim() === '') {
      return {
        valid: false,
        ignoreReason: {
          code: 'MISSING_USER_ID',
          message: 'user_id requis pour les événements identify'
        }
      };
    }
    return { valid: true };
  }

  private validatePaymentEvent(event: PaymentEventPayload): { valid: boolean; ignoreReason?: IgnoreReason } {
    if (!event.email && !event.payment_id) {
      return {
        valid: false,
        ignoreReason: {
          code: 'MISSING_PAYMENT_IDENTIFIER',
          message: 'email ou payment_id requis pour les événements payment'
        }
      };
    }
    return { valid: true };
  }

  sanitizeCustomEventData(data: Record<string, any>): Record<string, string | number | boolean> {
    const sanitized: Record<string, string | number | boolean> = {};
    
    for (const [key, value] of Object.entries(data)) {
      // Nettoyage basique pour éviter injection
      const cleanKey = String(key).replace(/[<>\"'`]/g, '').substring(0, this.config.validation.maxParamNameLength);
      
      if (typeof value === 'string') {
        // Nettoyage des valeurs string
        sanitized[cleanKey] = String(value)
          .replace(/[<>]/g, '')
          .substring(0, this.config.validation.maxParamValueLength);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[cleanKey] = value;
      }
    }
    
    return sanitized;
  }
}

