import express, { Express } from 'express';
import { apiRouter } from './routes.ts';
import { connectAndSeedDB } from './seed.ts';

let initialized = false;

export async function createApiServer(): Promise<Express> {
  const app = express();

  app.use(express.json());

  // Mount API router
  app.use('/api', apiRouter);

  // Initialize DB and run startup seeder if not already done
  if (!initialized) {
    initialized = true;
    try {
      await connectAndSeedDB();
    } catch (err) {
      console.error('[CampusEventHub] Database initialization error:', err);
    }
  }

  return app;
}
