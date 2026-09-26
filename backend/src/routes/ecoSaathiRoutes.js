// EcoSetu Eco-Saathi AI Orchestrator API Routes (/api/v1/eco-saathi)
// Canonical Reference: docs/05_API_SPECIFICATION.md, docs/10_BACKEND_ARCHITECTURE.md

const express = require('express');
const router = express.Router();
const controller = require('../controllers/ecoSaathiController');
const { authenticate, optionalAuthenticate } = require('../middleware/authenticate');

// 1. Process natural language query (optional authentication for general AI queries)
router.post('/message', optionalAuthenticate, (req, res, next) => controller.handleMessage(req, res, next));

// 2. Execute confirmed write action (requires authentication)
router.post('/confirm-action', authenticate, (req, res, next) => controller.handleConfirmAction(req, res, next));

// 3. Get user context (optional authentication)
router.get('/context', optionalAuthenticate, (req, res, next) => controller.getContext(req, res, next));

module.exports = router;

