import { Hono } from 'hono';
import * as webScrapeController from '../controllers/webScrapeController';

export const webScrapeRoute = new Hono();

webScrapeRoute.get('/', (c) => {
    return c.text('on webScrape home');
});

webScrapeRoute.get('/getBestDeals', webScrapeController.getBestDealsList);
