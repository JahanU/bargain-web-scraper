"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const webScrapeService = require('../services/webScrapeService');
exports.getBestDealsList = (req, res, next) => {
    let items = webScrapeService.getBestDealsList();
    res.send([...items]);
};
