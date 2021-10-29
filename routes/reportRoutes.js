const express = require('express');

const router = express.Router();

const reportController = require('../controllers/reportController');

router.route('/').post(reportController.createReport);

module.exports = router;
