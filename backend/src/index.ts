import { startApp } from '@/app';
import { loadConfig } from '@/config';
import { log } from '@/log';
import { createJDRetailer } from '@/retailers/jd';

const config = loadConfig();
const { server } = startApp({ ...config, retailers: [createJDRetailer()] });

log.info('listening', { port: server.port, minDiscount: config.minDiscount });
