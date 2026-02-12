import type { Context } from 'hono';
import { getBestDealsList as getDeals } from '../services/webScrapeService';

export const getBestDealsList = (c: Context) => {
    const items = getDeals();
    return c.json([...items]);
};
