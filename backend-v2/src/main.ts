import { createApp } from './app';
import { loadConfig } from './config';
import { createSql } from './db/sql';
import { log } from './log';
import { createJDRetailer } from './scrape/retailers/jd';

const config = loadConfig();
const sql = createSql(config.databaseUrl);

const app = createApp({
    sql,
    retailers: [createJDRetailer()],
    cronSecret: config.cronSecret,
    minDiscount: config.minDiscount,
});

const server = Bun.serve({
    port: config.port,
    routes: app.routes,
    fetch: () => Response.json({ error: 'Not Found' }, { status: 404 }),
    error: (error) => {
        log.error('unhandled request error', { error });
        return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    },
});

log.info('listening', { port: server.port });

// Render sends SIGTERM on deploys: stop taking requests, let a running scrape finish, close the pool.
process.on('SIGTERM', async () => {
    log.info('shutting down');
    await server.stop();
    await app.idle();
    await sql.close();
    process.exit(0);
});
