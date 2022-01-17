"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const logger = require('morgan');
const bodyParser = require('body-parser'); // Parse body data; JSON data
const cors = require('cors');
const app = (0, express_1.default)();
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(cors());
app.use(express_1.default.static('client'));
require('dotenv').config();
const webScrape = require('./services/webScrapeService');
webScrape.main();
const firebaseRoute = require('./routes/firebaseRoute');
const webScrapeRoute = require('./routes/webScrapeRoute');
const telegramRoute = require('./routes/telegramRoute');
const loggingMiddleware = require('./middlewares/logging');
app.use('/firebase', firebaseRoute);
app.use('/webscrape', webScrapeRoute);
app.use(telegramRoute);
app.use(loggingMiddleware);
// Default route
app.get('/', (req, res) => res.send('on home'));
app.use((req, res, next) => {
    const error = new Error('Not Found');
    res.status(404);
    next(error);
});
app.use((err, req, res, next) => {
    res.status(res.statusCode || 500);
    res.json({
        error: {
            message: err.message,
            code: res.statusCode
        },
    });
});
const PORT = 8000;
app.listen(PORT, () => console.log(`listening on port: ${PORT}`));
