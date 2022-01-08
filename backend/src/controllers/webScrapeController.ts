import express, { Request, Response, NextFunction } from 'express';
const webScrapeService = require('../services/webScrapeService');

exports.getBestDeals = (req: Request, res: Response, next: NextFunction) => {
    let items = webScrapeService.getBestDeals();
    res.send([...items]);
};

