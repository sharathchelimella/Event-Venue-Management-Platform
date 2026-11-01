import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
import { createApiServer } from './src/server/app.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = await createApiServer();

  if (isProd) {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch {
      // Proceed if vite middleware not mounted directly
    }
  }

  app.listen(PORT, () => {
    console.log(`[CampusEventHub] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[CampusEventHub] Server startup failed:', err);
});
