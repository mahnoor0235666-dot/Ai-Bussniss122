import { loadEnvFile } from './env';

loadEnvFile();

const { openDatabase } = await import('./db');
const { createApp } = await import('./app');
const { aiSettings } = await import('./ai');
const { emailConfigured } = await import('./email');

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const db = openDatabase();
const app = createApp(db);

const server = app.listen(port, '0.0.0.0', () => {
  const settings = aiSettings();
  console.log(`[bizsolve] listening on http://0.0.0.0:${port}`);
  console.log(`[bizsolve] AI: ${settings.configured ? `enabled (${settings.model})` : 'NOT configured (set AI_API_KEY)'}`);
  console.log(`[bizsolve] Email: ${emailConfigured() ? 'enabled (Resend)' : 'NOT configured (reset links are not emailed)'}`);
});

function shutdown(signal: string): void {
  console.log(`[bizsolve] ${signal} received, shutting down`);
  server.close(() => {
    try {
      db.close();
    } catch {
      /* ignore */
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
