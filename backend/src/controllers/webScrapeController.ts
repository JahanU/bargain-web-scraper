import express, { Request, Response, NextFunction } from 'express';
const webScrapeService = require('../services/webScrapeService');

exports.getBestDealsList = (req: Request, res: Response, next: NextFunction) => {
    let items = webScrapeService.getBestDealsList();
    res.send([...items]);
};

