import { startApp } from '@/app';
import { loadConfig } from '@/config';
import { createLogger, duration } from '@/log';
import { createEndRetailer } from '@/retailers/end';
import { createJDRetailer } from '@/retailers/jd';
import { createSizeRetailer } from '@/retailers/size';

const log = createLogger('app');
const config = loadConfig();

log.info('▶ starting', {
    port: config.port,
    minDiscount: config.minDiscount,
    scrapeEvery: duration(config.scrapeIntervalMs),
    logLevel: Bun.env.LOG_LEVEL || 'info',
});

startApp({ ...config, retailers: [createJDRetailer(), createSizeRetailer(), createEndRetailer(config)] });
