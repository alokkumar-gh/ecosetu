// EcoSetu Eco-Saathi AI Orchestrator API Routes (/api/v1/eco-saathi)
// Canonical Reference: docs/05_API_SPECIFICATION.md, docs/10_BACKEND_ARCHITECTURE.md

const express = require('express');
const router = express.Router();
const controller = require('../controllers/ecoSaathiController');
const authenticate = require('../middleware/authenticate');

// All Eco-Saathi endpoints enforce authenticated user identity
router.use(authenticate);

// 1. Process natural language query
router.post('/message', (req, res, next) => controller.handleMessage(req, res, next));

// 2. Execute confirmed write action
router.post('/confirm-action', (req, res, next) => controller.handleConfirmAction(req, res, next));

// 3. Get user context
router.get('/context', (req, res, next) => controller.getContext(req, res, next));

module.exports = router;
