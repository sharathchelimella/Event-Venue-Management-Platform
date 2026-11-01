import express from 'express';
import { apiRouter } from './routes.js';
import { connectAndSeedDB } from './seed.js';

let initialized = false;

export async function createApiServer() {
  const app = express();

  app.use(express.json());

  // Mount API router
  app.use('/api', apiRouter);

  // Initialize DB and startup seeder once
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
