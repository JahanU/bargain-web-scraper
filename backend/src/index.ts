import { createApp } from './app';
import { SERVER_IDLE_TIMEOUT_SECONDS } from './http/dealsSnapshot';
import { loadConfig } from './config';
import { log } from './log';
import { createJDRetailer } from './scrape/retailers/jd';

const config = loadConfig();

const app = await createApp({
    retailers: [createJDRetailer()],
    dataFile: config.dataFile,
    minDiscount: config.minDiscount,
    cronSecret: config.cronSecret,
});

const server = Bun.serve({
    port: config.port,
    idleTimeout: SERVER_IDLE_TIMEOUT_SECONDS,
    routes: app.routes,
    fetch: () => Response.json({ error: 'Not Found' }, { status: 404 }),
    error: (error) => {
        log.error('unhandled request error', { error });
        return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    },
});

log.info('listening', { port: server.port, dataFile: config.dataFile });

// Scrape now (the disk may have been wiped), then on a timer. An external ping to /health keeps Render awake.
app.scrape();
const timer = setInterval(app.scrape, config.scrapeIntervalMs);

// Render sends SIGTERM on deploys: stop taking requests, let a running scrape finish and save.
process.on('SIGTERM', async () => {
    log.info('shutting down');
    clearInterval(timer);
    await server.stop();
    await app.idle();
    process.exit(0);
});
