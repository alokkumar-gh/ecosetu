// EcoSetu API Router Aggregator (/api/v1)
// Canonical Reference: docs/05_API_SPECIFICATION.md, docs/10_BACKEND_ARCHITECTURE.md

const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const collectorRoutes = require('./collectorRoutes');
const recyclerRoutes = require('./recyclerRoutes');
const adminRoutes = require('./adminRoutes');
const ewasteRoutes = require('./ewasteRoutes');
const requestRoutes = require('./requestRoutes');
const pickupRoutes = require('./pickupRoutes');
const aiRoutes = require('./aiRoutes');
const notificationRoutes = require('./notificationRoutes');
const consignmentRoutes = require('./consignmentRoutes');
const recyclingRoutes = require('./recyclingRoutes');
const materialLotRoutes = require('./materialLotRoutes');
const priceRoutes = require('./priceRoutes');
const adminPriceRoutes = require('./adminPriceRoutes');
const adminRecyclerRateRoutes = require('./adminRecyclerRateRoutes');
const recyclerRateController = require('../controllers/recyclerRateController');
const quoteRoutes = require('./quoteRoutes');
const handoverRoutes = require('./handoverRoutes');
const transactionRoutes = require('./transactionRoutes');
const earningsRoutes = require('./earningsRoutes');
const pickupBatchRoutes = require('./pickupBatchRoutes');
const sourcingRequestRoutes = require('./sourcingRequestRoutes');
const sourcingResponseRoutes = require('./sourcingResponseRoutes');
const recurringTradeRoutes = require('./recurringTradeRoutes');

const router = express.Router();

// Base API v1 status/health check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    version: 'v1',
    timestamp: new Date().toISOString(),
  });
});

// Authentication, User & Profile Management routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/collectors', collectorRoutes);
router.use('/collector', collectorRoutes);
router.use('/recyclers', recyclerRoutes);
router.use('/admin/prices', adminPriceRoutes);
router.use('/admin/recycler-rates', adminRecyclerRateRoutes);
router.use('/admin', adminRoutes);
router.get('/recycler-rates', (req, res, next) => recyclerRateController.getPublicRates(req, res, next));


// E-Waste Items and Collection Requests routes
router.use('/ewaste-items', ewasteRoutes);
router.use('/collection-requests', requestRoutes);

// Pickup operations
router.use('/pickups', pickupRoutes);

// AI E-Waste Detection & Feedback
router.use('/ai', aiRoutes);

// Notifications
router.use('/notifications', notificationRoutes);

// Recycler Consignments
router.use('/consignments', consignmentRoutes);

// Recycling Records
router.use('/recycling-records', recyclingRoutes);

// SIH 26229 Material Lots (Collector Economic Workflow)
router.use('/material-lots', materialLotRoutes);

// SIH 26229 Price Discovery & Valuation
router.use('/prices', priceRoutes);

// SIH 26229 Quotation & Economic Offers
router.use('/quotes', quoteRoutes);

// SIH 26229 Digital Handover & Verifiable Transfer
router.use('/handovers', handoverRoutes);

// SIH 26229 Payment Recording & Transaction Dataset
router.use('/transactions', transactionRoutes);

// SIH 26229 Collector Earnings Ledger & Pending Dues
router.use('/earnings', earningsRoutes);

// SIH 26229 Phase 5 Pickup Batches (Advanced Logistics & Multi-Lot Consolidation)
router.use('/pickup-batches', pickupBatchRoutes);

// SIH 26229 Phase 6 Sourcing Requests & Demand Discovery
router.use('/sourcing-requests', sourcingRequestRoutes);
router.use('/sourcing-responses', sourcingResponseRoutes);

// SIH 26229 Phase 6 Recurring Trade & Relationship History
router.use('/recurring-trade', recurringTradeRoutes);

// SIH 26229 Phase 7 Dispute Resolution & Return Workflows
const disputeRoutes = require('./disputeRoutes');
router.use('/disputes', disputeRoutes);

// SIH 26229 Payment Validation & Razorpay Digital Rails
const paymentRoutes = require('./paymentRoutes');
router.use('/payments', paymentRoutes);

// SIH 26229 Canonical Transaction Billing & Invoicing Engine
const billRoutes = require('./billRoutes');
router.use('/bills', billRoutes);

module.exports = router;


