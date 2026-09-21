/**
 * priceService.js
 * EcoSetu Price Discovery & Valuation Service (SIH 26229 Problem Statement)
 *
 * Requirements implemented:
 * - SIH-PRICE-001: Price Board showing current buying rates per material category and location
 * - SIH-PRICE-002: Offline Price Board support with cached prices
 * - SIH-PRICE-003: Instant value estimate when collector enters material, weight, location
 * - SIH-PRICE-004: Value estimate range (low-high) derived from legitimate price records
 * - SIH-PRICE-005: Recycler-offered rates prepared in architecture
 * - SIH-PRICE-007: Unit of measurement (PER_KG, PER_UNIT, PER_LOT)
 * - SIH-PRICE-008: Cache freshness indicator metadata
 * - SIH-PRICE-009: Strict Anti-Fabrication rule: NEVER fabricate or fake market prices
 * - SIH-VAL-001: Instant value estimate computation
 * - SIH-VAL-002: Deterministic rule-based valuation from price data
 * - SIH-VAL-003: Methodology disclosure in responses
 * - SIH-VAL-004: Clear "Estimate unavailable" state when insufficient data exists
 * - SIH-VAL-005: Explicit disclaimer that estimate is not a guaranteed price
 *
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4 Modules 3 & 6
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const AppError = require('../utils/AppError');
const logger = require('../config/logger');
const {
  ROLES,
  ERROR_CODES,
  MATERIAL_CATEGORIES,
  PRICE_UNITS,
  PRICE_SOURCES,
  PRICE_STATUSES,
} = require('../utils/constants');
const { MATERIAL_TAXONOMY, isValidCategory, isValidSubcategory } = require('../config/materialTaxonomy');

class PriceService {
  // ── ADMIN PRICE INGESTION (SIH-PRICE-009) ──────────────────────────────────

  /**
   * Admin creates a legitimate price record with full provenance
   * @param {object|string} adminUserOrId - Authenticated Admin
   * @param {object} data - Price record payload
   * @param {string} [ipAddress] - Client IP for audit logging
   * @returns {Promise<object>} Created PriceData record
   */
  async createPriceRecord(adminUserOrId, data, ipAddress = null) {
    const adminUserId = typeof adminUserOrId === 'string' ? adminUserOrId : adminUserOrId?.id;

    // 1. Category validation
    if (!data.category || !isValidCategory(data.category)) {
      throw AppError.badRequest(`Invalid material category: ${data.category}`, ERROR_CODES.VALIDATION_ERROR);
    }

    // 2. Subcategory validation if provided
    if (data.subcategory && !isValidSubcategory(data.category, data.subcategory)) {
      throw AppError.badRequest(
        `Invalid subcategory '${data.subcategory}' for category '${data.category}'`,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // 3. Buying price validation (> 0)
    const buyingPrice = parseFloat(data.buyingPrice);
    if (isNaN(buyingPrice) || buyingPrice <= 0) {
      throw AppError.badRequest('Buying price must be a positive number greater than 0', ERROR_CODES.VALIDATION_ERROR);
    }

    // 4. Quoted price validation if provided
    let quotedPrice = null;
    if (data.quotedPrice !== undefined && data.quotedPrice !== null) {
      quotedPrice = parseFloat(data.quotedPrice);
      if (isNaN(quotedPrice) || quotedPrice <= 0) {
        throw AppError.badRequest('Quoted price must be a positive number greater than 0', ERROR_CODES.VALIDATION_ERROR);
      }
    }

    // 5. Unit validation
    const unit = data.unit || PRICE_UNITS.PER_KG;
    if (!PRICE_UNITS[unit]) {
      throw AppError.badRequest(`Invalid price unit: ${data.unit}`, ERROR_CODES.VALIDATION_ERROR);
    }

    // 6. Source validation (strict provenance)
    const source = data.source || PRICE_SOURCES.ADMIN_VERIFIED;
    if (!PRICE_SOURCES[source]) {
      throw AppError.badRequest(`Invalid price source: ${data.source}`, ERROR_CODES.VALIDATION_ERROR);
    }

    // 7. Status validation
    const status = data.status || PRICE_STATUSES.ACTIVE;
    if (!PRICE_STATUSES[status]) {
      throw AppError.badRequest(`Invalid price status: ${data.status}`, ERROR_CODES.VALIDATION_ERROR);
    }

    // 8. Location normalization
    const location = (data.location || 'ALL').trim().toUpperCase();

    // 9. Dates validation
    let effectiveDate = new Date();
    if (data.effectiveDate) {
      const parsed = new Date(data.effectiveDate);
      if (isNaN(parsed.getTime())) {
        throw AppError.badRequest('Invalid effective date format', ERROR_CODES.VALIDATION_ERROR);
      }
      effectiveDate = parsed;
    }

    let expiryDate = null;
    if (data.expiryDate) {
      const parsedExpiry = new Date(data.expiryDate);
      if (isNaN(parsedExpiry.getTime()) || parsedExpiry <= effectiveDate) {
        throw AppError.badRequest('Expiry date must be after effective date', ERROR_CODES.VALIDATION_ERROR);
      }
      expiryDate = parsedExpiry;
    }

    // 10. Persist with audit logging
    const priceRecord = await prisma.$transaction(async (tx) => {
      const record = await tx.priceData.create({
        data: {
          category: data.category,
          subcategory: data.subcategory || null,
          location,
          buyingPrice,
          quotedPrice,
          unit,
          currency: data.currency || 'INR',
          source,
          status,
          sourceReference: data.sourceReference || null,
          effectiveDate,
          expiryDate,
          createdById: adminUserId || null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminUserId || 'SYSTEM',
          action: 'PRICE_RECORD_CREATED',
          entityType: 'PRICE_DATA',
          entityId: record.id,
          details: {
            category: record.category,
            location: record.location,
            buyingPrice: record.buyingPrice,
            unit: record.unit,
            source: record.source,
            status: record.status,
          },
          ipAddress,
        },
      });

      return record;
    });

    logger.info(`[PriceService] Admin created price record ${priceRecord.id} for ${priceRecord.category}`);
    return priceRecord;
  }

  /**
   * Admin lists all price records with pagination & filters
   * @param {object} query - Filtering query params
   * @returns {Promise<object>} { prices, total, page, limit, totalPages }
   */
  async listAdminPrices(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const where = {};

    if (query.category && isValidCategory(query.category)) {
      where.category = query.category;
    }

    if (query.status && PRICE_STATUSES[query.status]) {
      where.status = query.status;
    }

    if (query.location) {
      where.location = query.location.trim().toUpperCase();
    }

    if (query.source && PRICE_SOURCES[query.source]) {
      where.source = query.source;
    }

    const [total, prices] = await Promise.all([
      prisma.priceData.count({ where }),
      prisma.priceData.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
    ]);

    return {
      prices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin updates an existing price record
   * @param {object|string} adminUserOrId - Authenticated Admin
   * @param {string} id - Price record UUID
   * @param {object} data - Update fields
   * @param {string} [ipAddress] - Client IP
   * @returns {Promise<object>} Updated PriceData record
   */
  async updatePriceRecord(adminUserOrId, id, data, ipAddress = null) {
    const adminUserId = typeof adminUserOrId === 'string' ? adminUserOrId : adminUserOrId?.id;

    const existing = await prisma.priceData.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound(`Price record ${id} not found`);
    }

    const updateData = {};

    if (data.buyingPrice !== undefined) {
      const p = parseFloat(data.buyingPrice);
      if (isNaN(p) || p <= 0) {
        throw AppError.badRequest('Buying price must be a positive number greater than 0', ERROR_CODES.VALIDATION_ERROR);
      }
      updateData.buyingPrice = p;
    }

    if (data.quotedPrice !== undefined) {
      if (data.quotedPrice === null) {
        updateData.quotedPrice = null;
      } else {
        const qp = parseFloat(data.quotedPrice);
        if (isNaN(qp) || qp <= 0) {
          throw AppError.badRequest('Quoted price must be a positive number greater than 0', ERROR_CODES.VALIDATION_ERROR);
        }
        updateData.quotedPrice = qp;
      }
    }

    if (data.unit !== undefined) {
      if (!PRICE_UNITS[data.unit]) {
        throw AppError.badRequest(`Invalid price unit: ${data.unit}`, ERROR_CODES.VALIDATION_ERROR);
      }
      updateData.unit = data.unit;
    }

    if (data.status !== undefined) {
      if (!PRICE_STATUSES[data.status]) {
        throw AppError.badRequest(`Invalid price status: ${data.status}`, ERROR_CODES.VALIDATION_ERROR);
      }
      updateData.status = data.status;
    }

    if (data.location !== undefined) {
      updateData.location = data.location.trim().toUpperCase();
    }

    if (data.sourceReference !== undefined) {
      updateData.sourceReference = data.sourceReference || null;
    }

    if (data.expiryDate !== undefined) {
      if (data.expiryDate === null) {
        updateData.expiryDate = null;
      } else {
        const parsed = new Date(data.expiryDate);
        if (isNaN(parsed.getTime())) {
          throw AppError.badRequest('Invalid expiry date format', ERROR_CODES.VALIDATION_ERROR);
        }
        updateData.expiryDate = parsed;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.priceData.update({
        where: { id },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          actorId: adminUserId || 'SYSTEM',
          action: 'PRICE_RECORD_UPDATED',
          entityType: 'PRICE_DATA',
          entityId: id,
          details: updateData,
          ipAddress,
        },
      });

      return res;
    });

    return updated;
  }

  /**
   * Admin deletes a price record
   * @param {object|string} adminUserOrId - Authenticated Admin
   * @param {string} id - Price record UUID
   * @param {string} [ipAddress] - Client IP
   * @returns {Promise<boolean>}
   */
  async deletePriceRecord(adminUserOrId, id, ipAddress = null) {
    const adminUserId = typeof adminUserOrId === 'string' ? adminUserOrId : adminUserOrId?.id;

    const existing = await prisma.priceData.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound(`Price record ${id} not found`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.priceData.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          actorId: adminUserId || 'SYSTEM',
          action: 'PRICE_RECORD_DELETED',
          entityType: 'PRICE_DATA',
          entityId: id,
          details: { category: existing.category, location: existing.location },
          ipAddress,
        },
      });
    });

    return true;
  }

  // ── COLLECTOR PRICE BOARD (SIH-PRICE-001..008) ─────────────────────────────

  /**
   * Get current legitimate market prices for Price Board
   * Strictly enforces SIH-PRICE-009: NEVER returns fabricated prices.
   * If no legitimate records exist, returns clear empty indicator.
   *
   * @param {object} query - { category, subcategory, location, includeRecyclerRates }
   * @returns {Promise<object>} { board: Array, location: string, asOf: string, totalCategories: number }
   */
  async getCurrentPrices(query = {}) {
    const now = new Date();
    const locationFilter = (query.location || '').trim().toUpperCase();

    // Base query for active, non-expired price records
    const where = {
      status: PRICE_STATUSES.ACTIVE,
      effectiveDate: { lte: now },
      OR: [
        { expiryDate: null },
        { expiryDate: { gt: now } },
      ],
    };

    if (query.category && isValidCategory(query.category)) {
      where.category = query.category;
    }

    if (query.subcategory) {
      where.subcategory = query.subcategory;
    }

    // Location matching strategy:
    // 1. Matches requested location (e.g. 'MUMBAI', 'DELHI')
    // 2. OR matches fallback national baseline 'ALL' / 'NATIONAL'
    if (locationFilter && locationFilter !== 'ALL') {
      where.location = { in: [locationFilter, 'ALL', 'NATIONAL'] };
    }

    const priceRecords = await prisma.priceData.findMany({
      where,
      orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
    });

    // Group legitimate records by category
    const categoryMap = new Map();

    // Initialize map from canonical taxonomy so collectors see all categories
    const categoriesToInspect = query.category && isValidCategory(query.category)
      ? [query.category]
      : Object.keys(MATERIAL_CATEGORIES).filter((c) => c !== 'OTHER');

    for (const cat of categoriesToInspect) {
      const meta = MATERIAL_TAXONOMY[cat] || {
        code: cat,
        symbol: '📦',
        icon: 'package-variant',
      };

      categoryMap.set(cat, {
        category: cat,
        code: meta.code,
        symbol: meta.symbol,
        icon: meta.icon,
        hasData: false,
        buyingPrice: null,
        marketRangeLow: null,
        marketRangeHigh: null,
        unit: 'PER_KG',
        currency: 'INR',
        source: null,
        status: 'NO_DATA',
        recordsCount: 0,
        recyclerOffersCount: 0,
        lastUpdatedAt: null,
        records: [],
      });
    }

    // Aggregate legitimate records deterministically
    for (const record of priceRecords) {
      if (!categoryMap.has(record.category)) continue;

      const entry = categoryMap.get(record.category);
      const buyingPriceNum = parseFloat(record.buyingPrice.toString());

      entry.records.push({
        id: record.id,
        subcategory: record.subcategory,
        location: record.location,
        buyingPrice: buyingPriceNum,
        quotedPrice: record.quotedPrice ? parseFloat(record.quotedPrice.toString()) : null,
        unit: record.unit,
        source: record.source,
        effectiveDate: record.effectiveDate,
      });

      entry.recordsCount += 1;
      if (record.source === PRICE_SOURCES.RECYCLER_OFFER) {
        entry.recyclerOffersCount += 1;
      }

      // Update market range deterministically
      if (entry.marketRangeLow === null || buyingPriceNum < entry.marketRangeLow) {
        entry.marketRangeLow = buyingPriceNum;
      }
      if (entry.marketRangeHigh === null || buyingPriceNum > entry.marketRangeHigh) {
        entry.marketRangeHigh = buyingPriceNum;
      }

      // Track latest update timestamp
      if (!entry.lastUpdatedAt || record.effectiveDate > entry.lastUpdatedAt) {
        entry.lastUpdatedAt = record.effectiveDate;
      }

      entry.hasData = true;
      entry.status = 'ACTIVE';
      entry.unit = record.unit;
      entry.source = record.source;
    }

    // Set representative current price for each category with data
    // Set representative current price and id for each category with data
    for (const entry of categoryMap.values()) {
      if (entry.hasData) {
        entry.id = entry.records[0]?.id || entry.category;
        entry.location = entry.records[0]?.location || (locationFilter || 'ALL');
        if (entry.records.length === 1) {
          entry.buyingPrice = entry.marketRangeLow;
        } else {
          // Median or average of legitimate active buying prices
          const sum = entry.records.reduce((acc, r) => acc + r.buyingPrice, 0);
          entry.buyingPrice = parseFloat((sum / entry.records.length).toFixed(2));
        }
      }
    }

    const board = Array.from(categoryMap.values());
    const prices = board.filter((b) => b.hasData);

    return {
      board,
      prices,
      count: prices.length,
      location: locationFilter || 'ALL',
      asOf: now.toISOString(),
      lastUpdatedAt: now.toISOString(),
      totalCategories: board.length,
      categoriesWithData: prices.length,
    };
  }

  // ── VALUE ESTIMATION FOUNDATION (SIH-VAL-001..005) ─────────────────────────

  /**
   * Calculate deterministic, rule-based value estimation for a collector lot/material
   *
   * Formula:
   *  estimatedLow = weightKg * marketRangeLow
   *  estimatedHigh = weightKg * marketRangeHigh
   *  estimatedMidpoint = (estimatedLow + estimatedHigh) / 2
   *
   * Strict SIH Requirements:
   * - If no legitimate price data exists, returns isEstimateAvailable: false (NO FABRICATION)
   * - Includes transparent methodology disclosure
   * - Includes mandatory disclaimer that estimate is not a guaranteed sale price
   *
   * @param {object} params - { category, subcategory, weightKg, location }
   * @returns {Promise<object>} Valuation result
   */
  async calculateEstimate({ category, subcategory, weightKg, location }) {
    // 1. Validate category
    if (!category || !isValidCategory(category)) {
      throw AppError.badRequest(`Invalid material category: ${category}`, ERROR_CODES.VALIDATION_ERROR);
    }

    // 2. Validate weight (> 0 required)
    const weight = parseFloat(weightKg);
    if (isNaN(weight) || weight <= 0) {
      throw AppError.badRequest('Approximate weight must be a positive number greater than 0', ERROR_CODES.VALIDATION_ERROR);
    }

    // 3. Query legitimate active market prices
    const pricesResult = await this.getCurrentPrices({
      category,
      subcategory,
      location,
    });

    const categoryPrice = pricesResult.board.find((b) => b.category === category);

    // 4. Handle insufficient data state (SIH-VAL-004 & SIH-PRICE-009)
    if (!categoryPrice || !categoryPrice.hasData || categoryPrice.marketRangeLow === null) {
      return {
        isEstimateAvailable: false,
        status: 'UNAVAILABLE',
        category,
        subcategory: subcategory || null,
        weightKg: weight,
        location: location || 'ALL',
        estimatedValue: null,
        estimatedLow: null,
        estimatedHigh: null,
        formattedEstimate: 'Estimate unavailable',
        confidence: 'NO_DATA',
        message: 'Estimate unavailable: No verified market price data found for this category and location.',
        disclaimer: 'This is an estimate, not a guaranteed sale price. Verified market rates are required to compute estimates.',
        methodology: 'Rule-based calculation (derived from active verified market price records).',
      };
    }

    // 5. Compute rule-based estimate range (SIH-VAL-002)
    const lowPrice = categoryPrice.marketRangeLow;
    const highPrice = categoryPrice.marketRangeHigh;

    const estimatedLow = parseFloat((weight * lowPrice).toFixed(2));
    const estimatedHigh = parseFloat((weight * highPrice).toFixed(2));
    const estimatedMidpoint = parseFloat(((estimatedLow + estimatedHigh) / 2).toFixed(2));
    const formattedEstimate =
      estimatedLow === estimatedHigh
        ? `₹${estimatedLow}`
        : `₹${estimatedLow} – ₹${estimatedHigh}`;

    return {
      isEstimateAvailable: true,
      status: 'AVAILABLE',
      category,
      subcategory: subcategory || null,
      weightKg: weight,
      location: location || categoryPrice.records[0]?.location || 'ALL',
      applicableRateLow: lowPrice,
      applicableRateHigh: highPrice,
      estimatedLow,
      estimatedHigh,
      estimatedMidpoint,
      estimatedValue: estimatedMidpoint,
      formattedEstimate,
      confidence: 'VERIFIED_MARKET_DATA',
      currency: 'INR',
      unit: categoryPrice.unit || 'PER_KG',
      source: categoryPrice.source || 'ADMIN_VERIFIED',
      ratesCount: categoryPrice.recordsCount,
      asOf: pricesResult.asOf,
      methodology: 'Transparent rule-based calculation: weight (kg) × active verified market rate range (low to high).',
      disclaimer: 'This is an estimate based on current verified market data, not a guaranteed sale price. Actual price offered by authorized recyclers may vary depending on material grading, purity, and operational conditions.',
    };
  }

  // ── HISTORICAL PRICES & BASIC PRICE TRENDS (SIH-PRICE-010..014) ───────────

  /**
   * Query historical price records with filtering, pagination, and deterministic trend calculations
   * Strictly enforces:
   * - Retains provenance, effectiveDate, expiryDate, status
   * - Never fabricates fake prices (SIH-PRICE-009 / SIH-PRICE-011)
   * - Preserves expired records in historical dataset
   * - Deterministic trend calculation (SIH-PRICE-012, SIH-PRICE-013)
   * - Explicit insufficient-data state
   *
   * @param {object} query
   * @returns {Promise<object>}
   */
  async getHistoricalPrices(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const periodType = (query.period || 'MONTHLY').trim().toUpperCase() === 'WEEKLY' ? 'WEEKLY' : 'MONTHLY';

    const where = {};

    if (query.category && isValidCategory(query.category)) {
      where.category = query.category;
    }

    if (query.subcategory) {
      where.subcategory = query.subcategory;
    }

    if (query.location) {
      const loc = query.location.trim().toUpperCase();
      if (loc !== 'ALL') {
        where.location = { in: [loc, 'ALL', 'NATIONAL'] };
      }
    }

    if (query.unit && PRICE_UNITS[query.unit]) {
      where.unit = query.unit;
    }

    if (query.source && PRICE_SOURCES[query.source]) {
      where.source = query.source;
    }

    if (query.status && PRICE_STATUSES[query.status]) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      where.effectiveDate = {};
      if (query.startDate) {
        const d = new Date(query.startDate);
        if (!isNaN(d.getTime())) where.effectiveDate.gte = d;
      }
      if (query.endDate) {
        const d = new Date(query.endDate);
        if (!isNaN(d.getTime())) where.effectiveDate.lte = d;
      }
    }

    // 1. Fetch paginated records for tabular/list view (sorted by effectiveDate desc)
    const [total, paginatedRecords, allHistorical] = await Promise.all([
      prisma.priceData.count({ where }),
      prisma.priceData.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          createdBy: {
            select: { id: true, name: true, role: true },
          },
        },
      }),
      // 2. Fetch records for deterministic time-series aggregation
      prisma.priceData.findMany({
        where,
        orderBy: { effectiveDate: 'asc' },
      }),
    ]);

    // Format paginated records with normalized provenance
    const records = paginatedRecords.map((r) => ({
      id: r.id,
      category: r.category,
      subcategory: r.subcategory,
      location: r.location,
      buyingPrice: parseFloat(r.buyingPrice.toString()),
      quotedPrice: r.quotedPrice ? parseFloat(r.quotedPrice.toString()) : null,
      unit: r.unit,
      currency: r.currency,
      source: r.source,
      status: r.status,
      sourceReference: r.sourceReference,
      effectiveDate: r.effectiveDate.toISOString(),
      expiryDate: r.expiryDate ? r.expiryDate.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    // 3. Compute deterministic trend buckets (SIH-PRICE-012 & SIH-PRICE-013)
    const periodBuckets = new Map();

    for (const record of allHistorical) {
      const priceNum = parseFloat(record.buyingPrice.toString());
      if (isNaN(priceNum) || priceNum <= 0) continue;

      const date = new Date(record.effectiveDate);
      let bucketKey = '';
      let bucketLabel = '';
      let periodStartDate = null;
      let periodEndDate = null;

      if (periodType === 'WEEKLY') {
        // ISO 8601 week
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
        const yr = d.getUTCFullYear();
        bucketKey = `${yr}-W${String(weekNo).padStart(2, '0')}`;
        bucketLabel = `Week ${weekNo}, ${yr}`;

        // Compute week boundaries
        const monday = new Date(date);
        const day = monday.getDay();
        const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
        monday.setDate(diff);
        periodStartDate = new Date(monday.setHours(0, 0, 0, 0)).toISOString();
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        periodEndDate = new Date(sunday.setHours(23, 59, 59, 999)).toISOString();
      } else {
        // Monthly bucket
        const yr = date.getFullYear();
        const mo = date.getMonth();
        bucketKey = `${yr}-${String(mo + 1).padStart(2, '0')}`;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        bucketLabel = `${monthNames[mo]} ${yr}`;
        periodStartDate = new Date(yr, mo, 1, 0, 0, 0, 0).toISOString();
        periodEndDate = new Date(yr, mo + 1, 0, 23, 59, 59, 999).toISOString();
      }

      if (!periodBuckets.has(bucketKey)) {
        periodBuckets.set(bucketKey, {
          periodKey: bucketKey,
          label: bucketLabel,
          startDate: periodStartDate,
          endDate: periodEndDate,
          prices: [],
        });
      }

      periodBuckets.get(bucketKey).prices.push(priceNum);
    }

    // Convert buckets into statistical periods
    const sortedBucketKeys = Array.from(periodBuckets.keys()).sort();
    const periods = sortedBucketKeys.map((key) => {
      const b = periodBuckets.get(key);
      const count = b.prices.length;
      const sum = b.prices.reduce((acc, p) => acc + p, 0);
      const avg = Math.round((sum / count) * 100) / 100;
      const min = Math.min(...b.prices);
      const max = Math.max(...b.prices);

      return {
        periodKey: b.periodKey,
        label: b.label,
        startDate: b.startDate,
        endDate: b.endDate,
        averagePrice: avg,
        minPrice: min,
        maxPrice: max,
        observationCount: count,
      };
    });

    // 4. Calculate comparative trend between latest two periods
    let latestPeriodAverage = null;
    let previousPeriodAverage = null;
    let absoluteChange = null;
    let percentageChange = null;
    let trendDirection = 'INSUFFICIENT_DATA';
    let hasSufficientData = false;

    if (periods.length >= 2) {
      const latest = periods[periods.length - 1];
      const previous = periods[periods.length - 2];

      latestPeriodAverage = latest.averagePrice;
      previousPeriodAverage = previous.averagePrice;
      absoluteChange = Math.round((latestPeriodAverage - previousPeriodAverage) * 100) / 100;

      // Zero-denominator safe percentage calculation
      if (previousPeriodAverage > 0) {
        percentageChange = Math.round(((latestPeriodAverage - previousPeriodAverage) / previousPeriodAverage) * 10000) / 100;
      } else {
        percentageChange = 0;
      }

      if (absoluteChange > 0.001) {
        trendDirection = 'UP';
      } else if (absoluteChange < -0.001) {
        trendDirection = 'DOWN';
      } else {
        trendDirection = 'STABLE';
      }

      hasSufficientData = true;
    } else if (periods.length === 1) {
      latestPeriodAverage = periods[0].averagePrice;
      trendDirection = 'INSUFFICIENT_DATA';
      hasSufficientData = false;
    }

    const methodology = 'HISTORICAL TREND: periodAverage = sum(prices) / count. absoluteChange = latestPeriodAverage - previousPeriodAverage. percentageChange = ((latestPeriodAverage - previousPeriodAverage) / previousPeriodAverage) * 100. This reflects past market observations, not a future price guarantee or forecast.';
    const disclaimer = 'This represents past observed market rates. Historical trends do not guarantee future sale prices or constitute a commercial price offer.';

    return {
      records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      trends: {
        period: periodType,
        periods,
        latestPeriodAverage,
        previousPeriodAverage,
        absoluteChange,
        percentageChange,
        trendDirection,
        hasSufficientData,
        totalObservations: allHistorical.length,
        methodology,
        disclaimer,
      },
    };
  }
}

module.exports = new PriceService();

