/**
 * ocrRoutes.js
 * Routing for Optical Character Recognition
 */

const express = require('express');
const voiceController = require('../controllers/voiceController');

const router = express.Router();

// 1. OCR Extraction
router.post('/', (req, res, next) => voiceController.ocr(req, res, next));
router.post('/extract', (req, res, next) => voiceController.ocr(req, res, next));

module.exports = router;
