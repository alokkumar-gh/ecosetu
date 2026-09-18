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
router.use('/recyclers', recyclerRoutes);
router.use('/admin', adminRoutes);

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

// Future modular route mounts will be registered here as implemented:
// router.use('/verifications', verificationRoutes);

module.exports = router;
