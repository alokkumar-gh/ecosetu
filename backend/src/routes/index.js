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

module.exports = router;


