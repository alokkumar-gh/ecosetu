// EcoSetu Transaction Routes (/api/v1/transactions)
// Canonical Reference: SIH Problem Statement 26229 - Prompt 7

const express = require('express');
const transactionController = require('../controllers/transactionController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// Create / Record a new Economic Transaction
router.post(
  '/',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.CITIZEN, ROLES.ADMIN),
  (req, res, next) => transactionController.createTransaction(req, res, next)
);

// List transactions with tenancy isolation
router.get(
  '/',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.CITIZEN, ROLES.ADMIN),
  (req, res, next) => transactionController.getTransactions(req, res, next)
);

// Get transaction for a specific handover
router.get(
  '/handover/:handoverId',
  authenticate,
  (req, res, next) => transactionController.getTransactionByHandoverId(req, res, next)
);

// Get single transaction details
router.get(
  '/:id',
  authenticate,
  (req, res, next) => transactionController.getTransactionById(req, res, next)
);

// Update payment status
router.patch(
  '/:id/payment-status',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.CITIZEN, ROLES.ADMIN),
  (req, res, next) => transactionController.updatePaymentStatus(req, res, next)
);

// Cancel transaction
router.post(
  '/:id/cancel',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  (req, res, next) => transactionController.cancelTransaction(req, res, next)
);

module.exports = router;
