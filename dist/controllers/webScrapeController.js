"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const webScrapeService = require('../services/webScrapeService');
exports.getBestDeals = (req, res, next) => {
    let message = webScrapeService.getBestDeals();
    res.send(message);
};
exports.test = (req, res, next) => {
    let message = webScrapeService.test();
    res.status(200).json(message);
};
