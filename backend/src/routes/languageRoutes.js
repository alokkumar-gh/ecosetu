/**
 * languageRoutes.js
 * Routing for Language Detection & Translation
 */

const express = require('express');
const voiceController = require('../controllers/voiceController');

const router = express.Router();

// 1. Text Language Detection (TLD)
router.post('/detect', (req, res, next) => voiceController.detectLanguage(req, res, next));

// 2. Translation (NMT)
router.post('/translate', (req, res, next) => voiceController.translate(req, res, next));

module.exports = router;
