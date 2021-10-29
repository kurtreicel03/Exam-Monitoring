const express = require('express');

const router = express.Router();

const indexController = require('../controllers/indexController');

router.routes('/').get(indexController.home);

module.exports = router;
