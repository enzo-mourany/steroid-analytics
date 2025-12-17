import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { defaultConfig } from './config';
import { initializeDatabase, EventRepository } from './database/schema';
import { ValidationService } from './services/validation';
import { DomainAuthService } from './services/domainAuth';
import { ThrottlingService } from './services/throttling';
import { createEventsRouter } from './routes/events';
import { createStatsRouter } from './routes/stats';
import { createHealthRouter } from './routes/health';

const config = defaultConfig;

// Initialiser la base de données
const db = initializeDatabase(config.database.path);
const eventRepository = new EventRepository(db);
const domainAuthService = new DomainAuthService(db);

// Initialiser les services
const validationService = new ValidationService(config);
const throttlingService = new ThrottlingService(eventRepository, config);

// Créer l'application Express
const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/health', createHealthRouter());
app.use('/events', createEventsRouter(
  validationService,
  domainAuthService,
  throttlingService,
  eventRepository,
  config
));
app.use('/stats', createStatsRouter(eventRepository));

// Route racine
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Steroid Analytics Backend',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      events: '/events',
      stats: '/stats'
    }
  });
});

// Gestion des erreurs
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Erreur interne du serveur'
  });
});

// Démarrer le serveur
const PORT = process.env.PORT ? parseInt(process.env.PORT) : config.port;

app.listen(PORT, () => {
  console.log(`🚀 Steroid Analytics Backend démarré sur le port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📝 Events: http://localhost:${PORT}/events`);
  console.log(`📈 Stats: http://localhost:${PORT}/stats`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt du serveur...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Arrêt du serveur...');
  db.close();
  process.exit(0);
});

