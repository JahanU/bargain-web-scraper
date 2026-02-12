import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from 'hono/bun';
import 'dotenv/config';

import { firebaseRoute } from './routes/firebaseRoute';
import { webScrapeRoute } from './routes/webScrapeRoute';
import { telegramRoute } from './routes/telegramRoute';
import { loggingMiddleware } from './middlewares/logging';
import { main as startWebScraper } from './services/webScrapeService';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());
app.use('*', loggingMiddleware);

// Static files
app.use('/client/*', serveStatic({ root: './' }));

// Default route
app.get('/', (c) => c.text('on home'));

// Routes
app.route('/firebase', firebaseRoute);
app.route('/webscrape', webScrapeRoute);
app.route('/telegram', telegramRoute);

// 404 handler
app.notFound((c) => {
    return c.json({ error: { message: 'Not Found', code: 404 } }, 404);
});

// Error handler
app.onError((err, c) => {
    const status = 500;
    return c.json({ error: { message: err.message, code: status } }, status);
});

// Start web scraper
startWebScraper();

const PORT = Number(process.env.PORT) || 8000;

export default {
    port: PORT,
    fetch: app.fetch,
};

console.log(`listening on port: ${PORT}`);
