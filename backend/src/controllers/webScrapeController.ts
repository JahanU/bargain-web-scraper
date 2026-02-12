import { Request, Response } from 'express';
const webScrapeService = require('../services/webScrapeService');

exports.getBestDealsList = (req: Request, res: Response) => {
    const items = webScrapeService.getBestDealsList();
    res.send(items);
};
