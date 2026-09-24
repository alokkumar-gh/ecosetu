// EcoSetu Bill Routes (/api/v1/bills)
// Canonical Reference: SIH Problem Statement 26229 - Billing & Invoicing System

const express = require('express');
const billController = require('../controllers/billController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// List bills with role-scoped tenancy isolation
router.get(
  '/',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.CITIZEN, ROLES.ADMIN),
  (req, res, next) => billController.listBills(req, res, next)
);

// Get single bill by ID
router.get(
  '/:id',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.CITIZEN, ROLES.ADMIN),
  (req, res, next) => billController.getBillById(req, res, next)
);

// Get bill by Transaction ID
router.get(
  '/transaction/:transactionId',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.CITIZEN, ROLES.ADMIN),
  (req, res, next) => billController.getBillByTransactionId(req, res, next)
);

module.exports = router;
