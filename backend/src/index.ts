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

// Render sends SIGTERM on deploys and kills the process about 30s later. Close connections now,
// then give a running scrape a bounded chance to finish and save. If it can't, the previous
// deals.json is left intact (saves are atomic) and the next process re-scrapes on boot.
const SHUTDOWN_WAIT_MS = 20_000;

process.on('SIGTERM', async () => {
    log.info('shutting down');
    clearInterval(timer);
    app.stop();
    await server.stop(true);
    await Promise.race([app.idle(), Bun.sleep(SHUTDOWN_WAIT_MS)]);
    process.exit(0);
});
