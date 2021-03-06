import express, { Request, Response, NextFunction } from 'express';
const newrelic = require('newrelic');
const logger = require('morgan');
const bodyParser = require('body-parser'); // Parse body data; JSON data
const cors = require('cors')


const app = express();
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('client'));

require('dotenv').config();

const webScrape = require('./services/webScrapeService');
webScrape.main();

const firebaseRoute = require('./routes/firebaseRoute');
const webScrapeRoute = require('./routes/webScrapeRoute')
const telegramRoute = require('./routes/telegramRoute');
const loggingMiddleware = require('./middlewares/logging');

app.use('/firebase', firebaseRoute);
app.use('/webscrape', webScrapeRoute);
app.use(telegramRoute);

app.use(loggingMiddleware);

// Default route
app.get('/', (req: Request, res: Response) => res.send('on home'));

app.use((req: Request, res: Response, next: NextFunction) => {
    const error = new Error('Not Found');
    res.status(404);
    next(error);
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    res.status(res.statusCode || 500);
    res.json({
        error: {
            message: err.message,
            code: res.statusCode
        },
    });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`listening on port: ${PORT}`));
