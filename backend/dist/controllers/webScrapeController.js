"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const webScrapeService = require('../services/webScrapeService');
exports.getBestDeals = (req, res, next) => {
    let items = webScrapeService.getBestDeals();
    res.send([...items]);
};
