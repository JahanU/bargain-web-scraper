import express, { Request, Response } from 'express';

const router = express.Router();
const webScrapeController = require('../controllers/webScrapeController');

router.get('/', (req: Request, res: Response) => {
    res.send('on webScrape home');
});

router.get('/getBestDeals', webScrapeController.getBestDealsList);


module.exports = router; // Export this as a module, so that the router is accessible from index.
