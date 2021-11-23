const express = require('express');

const router = express.Router();
const firebaseController = require('../controllers/firebaseController');

router.get('/', (req, res) => {
    res.send('on firebase home');
});

router.get('/allUsers', firebaseController.getUsers);
router.post('/addUser', firebaseController.addUser);

module.exports = router; // Export this as a module, so that the router is accessible from index.
