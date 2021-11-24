const express = require('express');

const router = express.Router();
// const telegramController = require('../controllers/telegramController');

router.get('/', (req, res) => {
    res.send('on telegram home');
});

module.exports = router; // Export this as a module, so that the router is accessible from index.
