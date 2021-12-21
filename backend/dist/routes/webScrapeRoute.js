"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const webScrapeController = require('../controllers/webScrapeController');
router.get('/', (req, res) => {
    res.send('on webScrape home');
});
router.get('/getBestDeals', webScrapeController.getBestDeals);
module.exports = router; // Export this as a module, so that the router is accessible from index.
