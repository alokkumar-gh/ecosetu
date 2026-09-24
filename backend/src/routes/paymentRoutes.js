// EcoSetu Payment Routes (/api/v1/payments)
// Canonical Reference: SIH Problem Statement 26229 - Payment System

const express = require('express');
const paymentController = require('../controllers/paymentController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// 1. Cash Payment Workflow
router.post(
  '/cash/initiate',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  (req, res, next) => paymentController.initiateCashConfirmation(req, res, next)
);

router.post(
  '/cash/confirm',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  (req, res, next) => paymentController.confirmCashPayment(req, res, next)
);

router.get(
  '/cash/:transactionId',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  (req, res, next) => paymentController.getCashConfirmation(req, res, next)
);

// 2. Razorpay Digital Payment Workflow
router.post(
  '/razorpay/order',
  authenticate,
  authorize(ROLES.RECYCLER, ROLES.ADMIN),
  (req, res, next) => paymentController.createRazorpayOrder(req, res, next)
);

router.post(
  '/razorpay/verify',
  authenticate,
  authorize(ROLES.RECYCLER, ROLES.ADMIN),
  (req, res, next) => paymentController.verifyRazorpayPayment(req, res, next)
);

// 3. Webhook (Public with signature check)
router.post('/razorpay/webhook', (req, res, next) =>
  paymentController.handleRazorpayWebhook(req, res, next)
);

// 4. Payment Reconciliation
router.get(
  '/reconcile/:transactionId',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  (req, res, next) => paymentController.reconcilePayment(req, res, next)
);

module.exports = router;
