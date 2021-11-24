const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser'); // Parse body data; JSON data

const app = express();
app.use(logger('dev'));
app.use(bodyParser.json());
require('dotenv').config();

const webScrape = require('./services/webScrapeService');

webScrape();

const firebaseRoute = require('./routes/firebaseRoute');
const loggingMiddleware = require('./middlewares/logging');

app.use('/firebase', firebaseRoute);
app.use(loggingMiddleware);

// Default route
app.get('/', (req, res) => {
    res.send('on home');
});

app.use((req, res, next) => {
    const error = new Error('Not Found');
    error.status = 404;
    next(error);
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.json({
        error: {
            message: err.message,
        },
    });
});

const PORT = 8000;
app.listen(PORT, () => console.log(`listening on port: ${PORT}`));
