// EcoSetu Historical Analytics & Dataset Insights Service
// Canonical Reference: SIH 26229 Problem Statement - Prompt 17

const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');
const {
  ROLES,
  PRICE_UNITS,
  PRICE_SOURCES,
  PRICE_STATUSES,
  MATERIAL_LOT_STATUS,
  TRANSACTION_STATUS,
  PAYMENT_STATUS,
  RECYCLER_AUTHORIZATION_STATUS,
  HANDOVER_STATUS,
  QUOTE_STATUS,
  CONSIGNMENT_STATUS,
  RECYCLING_STATUS,
} = require('../utils/constants');
const { isValidCategory } = require('../config/materialTaxonomy');

class HistoricalAnalyticsService {
  /**
   * Resolve time range date boundaries safely
   * @param {string} period - '7d', '30d', '90d', '1y', 'all', 'custom'
   * @param {string} [startDate]
   * @param {string} [endDate]
   * @returns {{ periodStart: Date|null, periodEnd: Date|null, periodLabel: string }}
   */
  _resolveTimeRange(period = 'all', startDate = null, endDate = null) {
    const now = new Date();
    const cleanPeriod = String(period || 'all').toLowerCase();

    if (cleanPeriod === 'custom' && (startDate || endDate)) {
      const s = startDate ? new Date(startDate) : null;
      const e = endDate ? new Date(endDate) : now;
      return {
        periodStart: s && !isNaN(s.getTime()) ? s : null,
        periodEnd: e && !isNaN(e.getTime()) ? e : now,
        periodLabel: 'CUSTOM',
      };
    }

    if (cleanPeriod === 'all') {
      return { periodStart: null, periodEnd: null, periodLabel: 'ALL' };
    }

    if (cleanPeriod === '7d') {
      const s = new Date(now);
      s.setDate(s.getDate() - 7);
      return { periodStart: s, periodEnd: now, periodLabel: '7D' };
    }

    if (cleanPeriod === '30d') {
      const s = new Date(now);
      s.setDate(s.getDate() - 30);
      return { periodStart: s, periodEnd: now, periodLabel: '30D' };
    }

    if (cleanPeriod === '90d') {
      const s = new Date(now);
      s.setDate(s.getDate() - 90);
      return { periodStart: s, periodEnd: now, periodLabel: '90D' };
    }

    if (cleanPeriod === '1y') {
      const s = new Date(now);
      s.setFullYear(s.getFullYear() - 1);
      return { periodStart: s, periodEnd: now, periodLabel: '1Y' };
    }

    return { periodStart: null, periodEnd: null, periodLabel: 'ALL' };
  }

  /**
   * Helper: Resolve user actor from JWT payload
   */
  async _resolveActor(actor) {
    if (!actor) {
      throw AppError.unauthorized('Authentication required');
    }
    const userId = typeof actor === 'string' ? actor : actor.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        collectorProfile: true,
        recyclerProfile: true,
      },
    });
    if (!user) throw AppError.unauthorized('User not found');
    return user;
  }

  // ============================================================================
  // 1. HISTORICAL PRICE ANALYTICS
  // ============================================================================
  async getHistoricalPriceAnalytics(query = {}) {
    const periodType = (query.period || 'MONTHLY').trim().toUpperCase() === 'WEEKLY' ? 'WEEKLY' : 'MONTHLY';
    const targetUnit = query.unit && PRICE_UNITS[query.unit] ? query.unit : PRICE_UNITS.PER_KG;

    const where = {
      unit: targetUnit, // Strictly segregate units; never mix PER_KG with PER_UNIT
    };

    if (query.category && isValidCategory(query.category)) {
      where.category = query.category;
    }

    if (query.subcategory) {
      where.subcategory = query.subcategory;
    }

    if (query.location) {
      const loc = query.location.trim();
      if (loc.toUpperCase() !== 'ALL') {
        where.location = { in: [loc, loc.toUpperCase(), loc.toLowerCase(), 'ALL', 'NATIONAL'] };
      }
    }

    if (query.source && PRICE_SOURCES[query.source]) {
      where.source = query.source;
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

    // Fetch all matching price records ordered chronologically
    const allRecords = await prisma.priceData.findMany({
      where,
      orderBy: { effectiveDate: 'asc' },
      select: {
        id: true,
        category: true,
        subcategory: true,
        location: true,
        buyingPrice: true,
        unit: true,
        source: true,
        status: true,
        sourceReference: true,
        effectiveDate: true,
      },
    });

    const totalObservations = allRecords.length;

    if (totalObservations === 0) {
      return {
        hasSufficientData: false,
        trendDirection: 'INSUFFICIENT_DATA',
        unit: targetUnit,
        category: query.category || 'ALL',
        totalObservations: 0,
        averagePrice: 0,
        minPrice: 0,
        maxPrice: 0,
        firstObservationDate: null,
        latestObservationDate: null,
        periods: [],
        absoluteChange: null,
        percentageChange: null,
        provenanceBreakdown: {},
        insufficientReason: 'Zero historical price observations found matching criteria.',
        dataSource: 'price_data (PriceData model)',
        methodology: 'Factual aggregation of past recorded market rates. Never forecasted or simulated.',
        disclaimer: 'Insufficient historical data available for the requested filter criteria. No synthetic data has been generated.',
      };
    }

    // Mathematical metrics
    const prices = allRecords.map((r) => parseFloat(r.buyingPrice.toString())).filter((p) => p > 0);
    const sum = prices.reduce((acc, p) => acc + p, 0);
    const avg = Math.round((sum / prices.length) * 100) / 100;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const firstDate = allRecords[0].effectiveDate.toISOString();
    const latestDate = allRecords[allRecords.length - 1].effectiveDate.toISOString();

    // Provenance breakdown
    const provenanceBreakdown = {};
    for (const r of allRecords) {
      const src = r.source || 'UNKNOWN';
      provenanceBreakdown[src] = (provenanceBreakdown[src] || 0) + 1;
    }

    // Bucket into weekly or monthly periods
    const periodBuckets = new Map();
    for (const r of allRecords) {
      const pNum = parseFloat(r.buyingPrice.toString());
      if (isNaN(pNum) || pNum <= 0) continue;

      const date = new Date(r.effectiveDate);
      let bucketKey = '';
      let bucketLabel = '';

      if (periodType === 'WEEKLY') {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
        const yr = d.getUTCFullYear();
        bucketKey = `${yr}-W${String(weekNo).padStart(2, '0')}`;
        bucketLabel = `Week ${weekNo}, ${yr}`;
      } else {
        const yr = date.getFullYear();
        const mo = date.getMonth();
        bucketKey = `${yr}-${String(mo + 1).padStart(2, '0')}`;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        bucketLabel = `${monthNames[mo]} ${yr}`;
      }

      if (!periodBuckets.has(bucketKey)) {
        periodBuckets.set(bucketKey, {
          periodKey: bucketKey,
          label: bucketLabel,
          prices: [],
        });
      }
      periodBuckets.get(bucketKey).prices.push(pNum);
    }

    const sortedKeys = Array.from(periodBuckets.keys()).sort();
    const periods = sortedKeys.map((k) => {
      const b = periodBuckets.get(k);
      const count = b.prices.length;
      const bSum = b.prices.reduce((acc, p) => acc + p, 0);
      const bAvg = Math.round((bSum / count) * 100) / 100;
      return {
        periodKey: b.periodKey,
        label: b.label,
        averagePrice: bAvg,
        minPrice: Math.min(...b.prices),
        maxPrice: Math.max(...b.prices),
        observationCount: count,
      };
    });

    let latestPeriodAverage = null;
    let previousPeriodAverage = null;
    let absoluteChange = null;
    let percentageChange = null;
    let trendDirection = 'INSUFFICIENT_DATA';
    let hasSufficientData = false;

    let insufficientReason = null;

    if (periods.length >= 2) {
      latestPeriodAverage = periods[periods.length - 1].averagePrice;
      previousPeriodAverage = periods[periods.length - 2].averagePrice;
      absoluteChange = Math.round((latestPeriodAverage - previousPeriodAverage) * 100) / 100;

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
      hasSufficientData = false;
      trendDirection = 'INSUFFICIENT_DATA';
      insufficientReason = 'Only 1 period bucket available. Minimum 2 comparable periods required for trend computation.';
    } else {
      insufficientReason = 'Zero historical price observations found matching criteria.';
    }

    return {
      hasSufficientData,
      trendDirection,
      unit: targetUnit,
      category: query.category || 'ALL',
      totalObservations,
      averagePrice: avg,
      minPrice: min,
      maxPrice: max,
      firstObservationDate: firstDate,
      latestObservationDate: latestDate,
      periods,
      latestPeriodAverage,
      previousPeriodAverage,
      absoluteChange,
      percentageChange,
      provenanceBreakdown,
      insufficientReason,
      dataSource: 'price_data (PriceData model)',
      methodology: 'Factual server-side aggregation: average = sum(prices)/count. Delta = latestAvg - prevAvg. Strictly historical observations.',
      disclaimer: 'Historical observed market prices. Does not forecast future rates or constitute a binding commercial price offer.',
    };
  }

  // ============================================================================
  // 2. MATERIAL ACTIVITY ANALYTICS
  // ============================================================================
  async getMaterialActivityAnalytics(query = {}) {
    const { periodStart, periodEnd, periodLabel } = this._resolveTimeRange(query.period, query.startDate, query.endDate);

    const where = {};
    if (periodStart || periodEnd) {
      where.createdAt = {};
      if (periodStart) where.createdAt.gte = periodStart;
      if (periodEnd) where.createdAt.lte = periodEnd;
    }

    if (query.category && isValidCategory(query.category)) {
      where.category = query.category;
    }

    if (query.status && MATERIAL_LOT_STATUS[query.status]) {
      where.status = query.status;
    }

    const [totalLots, statusGroups, categoryGroups, sourceTypeGroups, weightAgg, recentLots] = await Promise.all([
      prisma.materialLot.count({ where }),
      prisma.materialLot.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      prisma.materialLot.groupBy({
        by: ['category'],
        where,
        _count: { id: true },
      }),
      prisma.materialLot.groupBy({
        by: ['sourceType'],
        where,
        _count: { id: true },
      }),
      prisma.materialLot.aggregate({
        where,
        _sum: { approximateTotalWeightKg: true },
      }),
      prisma.materialLot.findMany({
        where,
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const statusCounts = {};
    for (const g of statusGroups) {
      statusCounts[g.status] = g._count.id;
    }

    const categoryCounts = {};
    for (const g of categoryGroups) {
      categoryCounts[g.category] = g._count.id;
    }

    const sourceTypeCounts = {};
    for (const g of sourceTypeGroups) {
      sourceTypeCounts[g.sourceType] = g._count.id;
    }

    // Monthly volume time-series
    const monthlyMap = new Map();
    for (const lot of recentLots) {
      const d = new Date(lot.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
    }

    const monthlyActivity = Array.from(monthlyMap.entries()).map(([month, count]) => ({
      month,
      lotCount: count,
    }));

    const totalApproximateWeightKg = weightAgg._sum.approximateTotalWeightKg
      ? parseFloat(weightAgg._sum.approximateTotalWeightKg.toString())
      : 0;

    return {
      period: periodLabel,
      periodStart: periodStart ? periodStart.toISOString() : null,
      periodEnd: periodEnd ? periodEnd.toISOString() : null,
      totalMaterialLots: totalLots,
      totalApproximateWeightKg,
      statusCounts,
      categoryCounts,
      sourceTypeCounts,
      monthlyActivity,
      dataSource: 'material_lots (MaterialLot model)',
      methodology: 'Server-side aggregation of collector material lots. Approximate weight reflects declared collector weight.',
    };
  }

  // ============================================================================
  // 3. TRANSACTION / COMMERCIAL ACTIVITY ANALYTICS
  // ============================================================================
  async getTransactionActivityAnalytics(query = {}) {
    const { periodStart, periodEnd, periodLabel } = this._resolveTimeRange(query.period, query.startDate, query.endDate);

    const where = {};
    if (periodStart || periodEnd) {
      where.transactionDate = {};
      if (periodStart) where.transactionDate.gte = periodStart;
      if (periodEnd) where.transactionDate.lte = periodEnd;
    }

    if (query.category && isValidCategory(query.category)) {
      where.category = query.category;
    }

    if (query.paymentStatus && PAYMENT_STATUS[query.paymentStatus]) {
      where.paymentStatus = query.paymentStatus;
    }

    if (query.transactionStatus && TRANSACTION_STATUS[query.transactionStatus]) {
      where.transactionStatus = query.transactionStatus;
    }

    const [
      totalTransactions,
      completedTransactions,
      cancelledTransactions,
      transactions,
      categoryGroups,
      paymentStatusGroups,
      paymentMethodGroups,
    ] = await Promise.all([
      prisma.transactionRecord.count({ where }),
      prisma.transactionRecord.count({ where: { ...where, transactionStatus: TRANSACTION_STATUS.RECORDED } }),
      prisma.transactionRecord.count({ where: { ...where, transactionStatus: TRANSACTION_STATUS.CANCELLED } }),
      prisma.transactionRecord.findMany({
        where,
        select: {
          quantity: true,
          unit: true,
          quotedTotal: true,
          finalSaleValue: true,
          amountPaid: true,
          amountDue: true,
          transactionDate: true,
          transactionStatus: true,
        },
      }),
      prisma.transactionRecord.groupBy({
        by: ['category'],
        where,
        _count: { id: true },
      }),
      prisma.transactionRecord.groupBy({
        by: ['paymentStatus'],
        where,
        _count: { id: true },
      }),
      prisma.transactionRecord.groupBy({
        by: ['paymentMethod'],
        where,
        _count: { id: true },
      }),
    ]);

    // Financial totals & unit-segregated quantities
    let totalQuotedValue = 0;
    let totalFinalSaleValue = 0;
    let totalAmountPaid = 0;
    let totalAmountDue = 0;

    const quantityByUnit = {
      PER_KG: 0,
      PER_UNIT: 0,
      PER_LOT: 0,
    };

    const monthlyMap = new Map();

    for (const t of transactions) {
      if (t.transactionStatus === TRANSACTION_STATUS.CANCELLED) continue;

      const qVal = t.quotedTotal ? parseFloat(t.quotedTotal.toString()) : 0;
      const sVal = parseFloat(t.finalSaleValue.toString()) || 0;
      const pVal = parseFloat(t.amountPaid.toString()) || 0;
      const dVal = parseFloat(t.amountDue.toString()) || 0;
      const qty = parseFloat(t.quantity.toString()) || 0;

      totalQuotedValue += qVal;
      totalFinalSaleValue += sVal;
      totalAmountPaid += pVal;
      totalAmountDue += dVal;

      if (quantityByUnit[t.unit] !== undefined) {
        quantityByUnit[t.unit] += qty;
      } else {
        quantityByUnit[t.unit] = qty;
      }

      // Time-series monthly bucket
      const d = new Date(t.transactionDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { count: 0, finalSaleValue: 0, amountPaid: 0 });
      }
      const b = monthlyMap.get(key);
      b.count += 1;
      b.finalSaleValue += sVal;
      b.amountPaid += pVal;
    }

    const monthlyActivity = Array.from(monthlyMap.entries()).map(([month, stats]) => ({
      month,
      transactionCount: stats.count,
      finalSaleValue: Math.round(stats.finalSaleValue * 100) / 100,
      amountPaid: Math.round(stats.amountPaid * 100) / 100,
    }));

    const categoryDistribution = {};
    for (const g of categoryGroups) {
      categoryDistribution[g.category] = g._count.id;
    }

    const paymentStatusDistribution = {};
    for (const g of paymentStatusGroups) {
      paymentStatusDistribution[g.paymentStatus] = g._count.id;
    }

    const paymentMethodDistribution = {};
    for (const g of paymentMethodGroups) {
      paymentMethodDistribution[g.paymentMethod] = g._count.id;
    }

    return {
      period: periodLabel,
      periodStart: periodStart ? periodStart.toISOString() : null,
      periodEnd: periodEnd ? periodEnd.toISOString() : null,
      totalTransactions,
      completedTransactions,
      cancelledTransactions,
      financialSummary: {
        totalQuotedValue: Math.round(totalQuotedValue * 100) / 100,
        totalFinalSaleValue: Math.round(totalFinalSaleValue * 100) / 100,
        totalAmountPaid: Math.round(totalAmountPaid * 100) / 100,
        totalAmountDue: Math.round(totalAmountDue * 100) / 100,
        note: 'Estimated lot value, quoted value, final sale value, amount paid, and amount due are kept strictly separate.',
      },
      quantityByUnit: {
        totalKg: Math.round((quantityByUnit.PER_KG || 0) * 100) / 100,
        totalUnits: Math.round((quantityByUnit.PER_UNIT || 0) * 100) / 100,
        totalLots: Math.round((quantityByUnit.PER_LOT || 0) * 100) / 100,
        note: 'Units are strictly isolated; kilograms and individual pieces are never combined.',
      },
      categoryDistribution,
      paymentStatusDistribution,
      paymentMethodDistribution,
      monthlyActivity,
      dataSource: 'transactions (TransactionRecord model)',
      methodology: 'Database aggregation of recorded transaction receipts. Cancelled transactions excluded from financial and volume sums.',
    };
  }

  // ============================================================================
  // 4. RECYCLER ACTIVITY ANALYTICS (ADMIN GLOBAL AGGREGATE — NO RANKING)
  // ============================================================================
  async getRecyclerActivityAnalytics(query = {}) {
    const { periodStart, periodEnd, periodLabel } = this._resolveTimeRange(query.period, query.startDate, query.endDate);

    const where = {};
    if (query.authorizationStatus && RECYCLER_AUTHORIZATION_STATUS[query.authorizationStatus]) {
      where.authorizationStatus = query.authorizationStatus;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [
      totalFacilities,
      activeFacilities,
      inactiveFacilities,
      authorizationGroups,
      pickupAvailableGroups,
      allFacilities,
      totalQuotes,
      acceptedQuotes,
      confirmedHandovers,
      recordedTransactions,
      totalOfferedRates,
      activeOfferedRates,
    ] = await Promise.all([
      prisma.recyclerProfile.count({ where }),
      prisma.recyclerProfile.count({ where: { ...where, isActive: true } }),
      prisma.recyclerProfile.count({ where: { ...where, isActive: false } }),
      prisma.recyclerProfile.groupBy({
        by: ['authorizationStatus'],
        where,
        _count: { id: true },
      }),
      prisma.recyclerProfile.groupBy({
        by: ['pickupAvailable'],
        where,
        _count: { id: true },
      }),
      prisma.recyclerProfile.findMany({
        where,
        select: {
          acceptedCategories: true,
          state: true,
          city: true,
        },
      }),
      prisma.quote.count(),
      prisma.quote.count({ where: { status: QUOTE_STATUS.ACCEPTED } }),
      prisma.handoverRecord.count({ where: { status: HANDOVER_STATUS.CONFIRMED } }),
      prisma.transactionRecord.count({ where: { transactionStatus: TRANSACTION_STATUS.RECORDED } }),
      prisma.recyclerOfferedRate.count(),
      prisma.recyclerOfferedRate.count({ where: { status: 'ACTIVE' } }),
    ]);

    const authorizationStatusCounts = {};
    for (const g of authorizationGroups) {
      authorizationStatusCounts[g.authorizationStatus] = g._count.id;
    }

    const pickupAvailabilityCounts = {};
    for (const g of pickupAvailableGroups) {
      pickupAvailabilityCounts[g.pickupAvailable] = g._count.id;
    }

    // Material category coverage
    const categoryCoverage = {};
    for (const f of allFacilities) {
      if (Array.isArray(f.acceptedCategories)) {
        for (const cat of f.acceptedCategories) {
          categoryCoverage[cat] = (categoryCoverage[cat] || 0) + 1;
        }
      }
    }

    return {
      period: periodLabel,
      totalFacilities,
      activeFacilities,
      inactiveFacilities,
      authorizationStatusDistribution: authorizationStatusCounts,
      pickupAvailabilityDistribution: pickupAvailabilityCounts,
      materialCategoryCoverage: categoryCoverage,
      commercialActivityTotals: {
        totalQuotesIssued: totalQuotes,
        totalQuotesAccepted: acceptedQuotes,
        totalHandoversConfirmed: confirmedHandovers,
        totalTransactionsRecorded: recordedTransactions,
        totalOfferedRates,
        activeOfferedRates,
      },
      evaluationPolicy: 'Factual operational counts only. Recyclers are never scored, ranked, or labeled with evaluative best/top badges.',
      antiRankingPolicy: 'COMPLIANT_ZERO_RANKING',
      dataSource: 'recycler_profiles (RecyclerProfile model) and connected commercial workflows',
    };
  }

  // ============================================================================
  // 5. TRACEABILITY & LIFECYCLE ANALYTICS
  // ============================================================================
  async getTraceabilityLifecycleAnalytics(query = {}) {
    const { periodStart, periodEnd, periodLabel } = this._resolveTimeRange(query.period, query.startDate, query.endDate);

    const [
      materialLotsCreated,
      materialLotsOpen,
      materialLotsQuoted,
      materialLotsAccepted,
      materialLotsCompleted,
      quotesSent,
      quotesAccepted,
      handoversPending,
      handoversConfirmed,
      transactionsRecorded,
      consignmentsCreated,
      consignmentsDelivered,
      consignmentsAccepted,
      recyclingReceived,
      recyclingCompleted,
    ] = await Promise.all([
      prisma.materialLot.count(),
      prisma.materialLot.count({ where: { status: MATERIAL_LOT_STATUS.OPEN } }),
      prisma.materialLot.count({ where: { status: MATERIAL_LOT_STATUS.QUOTED } }),
      prisma.materialLot.count({ where: { status: MATERIAL_LOT_STATUS.ACCEPTED } }),
      prisma.materialLot.count({ where: { status: MATERIAL_LOT_STATUS.COMPLETED } }),
      prisma.quote.count({ where: { status: QUOTE_STATUS.SENT } }),
      prisma.quote.count({ where: { status: QUOTE_STATUS.ACCEPTED } }),
      prisma.handoverRecord.count({ where: { status: { in: [HANDOVER_STATUS.PENDING_COLLECTOR, HANDOVER_STATUS.COLLECTOR_CONFIRMED, HANDOVER_STATUS.RECYCLER_CONFIRMED] } } }),
      prisma.handoverRecord.count({ where: { status: HANDOVER_STATUS.CONFIRMED } }),
      prisma.transactionRecord.count({ where: { transactionStatus: TRANSACTION_STATUS.RECORDED } }),
      prisma.consignment.count(),
      prisma.consignment.count({ where: { status: CONSIGNMENT_STATUS.DELIVERED } }),
      prisma.consignment.count({ where: { status: CONSIGNMENT_STATUS.ACCEPTED } }),
      prisma.recyclingRecord.count(),
      prisma.recyclingRecord.count({ where: { status: RECYCLING_STATUS.COMPLETED } }),
    ]);

    return {
      period: periodLabel,
      collectorPipeline: {
        lotsSubmitted: materialLotsCreated,
        lotsOpenForQuotes: materialLotsOpen,
        lotsWithActiveQuotes: materialLotsQuoted,
        lotsWithAcceptedQuotes: materialLotsAccepted,
        lotsCompleted: materialLotsCompleted,
      },
      quotationStage: {
        quotesSent,
        quotesAccepted,
      },
      quoteStage: {
        quotesSent,
        quotesAccepted,
      },
      handoverStage: {
        handoversPending,
        handoversConfirmed,
      },
      transactionStage: {
        transactionsRecorded,
      },
      recyclingStage: {
        recyclingRecordsTotal: recyclingReceived,
        completedRecyclingRecords: recyclingCompleted,
        note: 'Zero fabrication policy: counts reflect verified records only.',
      },
      citizenEwastePipeline: {
        consignmentsCreated,
        consignmentsDelivered,
        consignmentsAccepted,
        recyclingReceived,
        recyclingCompleted,
      },
      antiFabricationNote: 'Stages reflect strictly recorded database entities. Where no records exist, counts display as 0 and are never synthesized.',
      dataSource: 'material_lots, quotes, handover_records, transactions, consignments, recycling_records',
    };
  }

  // ============================================================================
  // 6. DATASET COVERAGE & QUALITY INDICATORS
  // ============================================================================
  async getDatasetQualityAnalytics(query = {}) {
    const [
      totalPrices,
      pricesWithSubcategory,
      pricesWithSourceRef,
      totalLots,
      lotsWithCoords,
      lotsWithPhotos,
      lotsWithWeight,
      lotsWithDesc,
      totalTransactions,
      transactionsWithCoords,
      transactionsWithLocationName,
      transactionsWithQuotedPrice,
      totalRecyclers,
      recyclersWithCoords,
      recyclersWithAuthNum,
      recyclersWithValidityDates,
      recyclersWithContact,
    ] = await Promise.all([
      // Prices
      prisma.priceData.count(),
      prisma.priceData.count({ where: { subcategory: { not: null } } }),
      prisma.priceData.count({ where: { sourceReference: { not: null } } }),

      // Material Lots
      prisma.materialLot.count(),
      prisma.materialLot.count({
        where: {
          collectionLat: { not: null },
          collectionLng: { not: null },
        },
      }),
      prisma.materialLot.count({
        where: {
          photos: { some: {} },
        },
      }),
      prisma.materialLot.count({
        where: {
          approximateTotalWeightKg: { not: null, gt: 0 },
        },
      }),
      prisma.materialLot.count({
        where: {
          description: { not: null },
        },
      }),

      // Transactions
      prisma.transactionRecord.count(),
      prisma.transactionRecord.count({
        where: {
          latitude: { not: null },
          longitude: { not: null },
        },
      }),
      prisma.transactionRecord.count({
        where: {
          locationName: { not: null },
        },
      }),
      prisma.transactionRecord.count({
        where: {
          quotedUnitPrice: { gt: 0 },
        },
      }),

      // Recyclers
      prisma.recyclerProfile.count(),
      prisma.recyclerProfile.count({
        where: {
          facilityLat: { not: null },
          facilityLng: { not: null },
        },
      }),
      prisma.recyclerProfile.count({
        where: {
          authorizationNumber: { not: null },
        },
      }),
      prisma.recyclerProfile.count({
        where: {
          authorizationValidFrom: { not: null },
          authorizationValidTill: { not: null },
        },
      }),
      prisma.recyclerProfile.count({
        where: {
          OR: [{ operationalPhone: { not: null } }, { operationalEmail: { not: null } }],
        },
      }),
    ]);

    const calcPct = (count, total) => {
      if (!total || total === 0) return 0;
      return Math.round((count / total) * 10000) / 100;
    };

    return {
      priceDataset: {
        totalRecords: totalPrices,
        withSubcategory: pricesWithSubcategory,
        withSubcategoryPct: calcPct(pricesWithSubcategory, totalPrices),
        withSourceReference: pricesWithSourceRef,
        withSourceReferencePct: calcPct(pricesWithSourceRef, totalPrices),
      },
      materialLotDataset: {
        totalRecords: totalLots,
        withGpsCoordinates: lotsWithCoords,
        withGpsCoordinatesPct: calcPct(lotsWithCoords, totalLots),
        withPhotoEvidence: lotsWithPhotos,
        withPhotoEvidencePct: calcPct(lotsWithPhotos, totalLots),
        withWeightMeasurement: lotsWithWeight,
        withWeightMeasurementPct: calcPct(lotsWithWeight, totalLots),
        withActualWeightPct: calcPct(lotsWithWeight, totalLots),
        withCategorizationPct: totalLots > 0 ? 100.0 : 0.0,
        withDescription: lotsWithDesc,
        withDescriptionPct: calcPct(lotsWithDesc, totalLots),
      },
      transactionDataset: {
        totalRecords: totalTransactions,
        withCoordinates: transactionsWithCoords,
        withCoordinatesPct: calcPct(transactionsWithCoords, totalTransactions),
        withLocationName: transactionsWithLocationName,
        withLocationNamePct: calcPct(transactionsWithLocationName, totalTransactions),
        withQuotedPriceEvidence: transactionsWithQuotedPrice,
        withQuotedPriceEvidencePct: calcPct(transactionsWithQuotedPrice, totalTransactions),
      },
      recyclerDataset: {
        totalRecords: totalRecyclers,
        withCoordinates: recyclersWithCoords,
        withCoordinatesPct: calcPct(recyclersWithCoords, totalRecyclers),
        withGpsCoordinatesPct: calcPct(recyclersWithCoords, totalRecyclers),
        withAuthorizationNumber: recyclersWithAuthNum,
        withAuthorizationNumberPct: calcPct(recyclersWithAuthNum, totalRecyclers),
        withAssignedPcbPct: calcPct(recyclersWithAuthNum, totalRecyclers),
        withValidityDates: recyclersWithValidityDates,
        withValidityDatesPct: calcPct(recyclersWithValidityDates, totalRecyclers),
        withValidLicenseDatePct: calcPct(recyclersWithValidityDates, totalRecyclers),
        withOperationalContact: recyclersWithContact,
        withOperationalContactPct: calcPct(recyclersWithContact, totalRecyclers),
      },
      dataQualityPolicy: 'Empirical coverage percentages based on non-null database fields. Incomplete records are transparently reported as missing.',
      dataSource: 'Direct field inspection across price_data, material_lots, transactions, and recycler_profiles',
    };
  }

  // ============================================================================
  // 7. OVERVIEW SYNTHESIS (ADMIN DASHBOARD)
  // ============================================================================
  async getOverview(query = {}) {
    const [priceAnalytics, materialAnalytics, transactionAnalytics, recyclerAnalytics, qualityAnalytics] =
      await Promise.all([
        this.getHistoricalPriceAnalytics({ ...query, period: 'MONTHLY' }),
        this.getMaterialActivityAnalytics(query),
        this.getTransactionActivityAnalytics(query),
        this.getRecyclerActivityAnalytics(query),
        this.getDatasetQualityAnalytics(query),
      ]);

    return {
      overviewGeneratedAt: new Date().toISOString(),
      prices: {
        totalObservations: priceAnalytics.totalObservations,
        hasSufficientData: priceAnalytics.hasSufficientData,
        trendDirection: priceAnalytics.trendDirection,
        averagePrice: priceAnalytics.averagePrice,
        unit: priceAnalytics.unit,
      },
      materials: {
        totalLots: materialAnalytics.totalMaterialLots,
        totalWeightKg: materialAnalytics.totalApproximateWeightKg,
        categoryCounts: materialAnalytics.categoryCounts,
      },
      transactions: {
        totalTransactions: transactionAnalytics.totalTransactions,
        finalSaleValue: transactionAnalytics.financialSummary.totalFinalSaleValue,
        amountPaid: transactionAnalytics.financialSummary.totalAmountPaid,
        amountDue: transactionAnalytics.financialSummary.totalAmountDue,
      },
      recyclers: {
        totalFacilities: recyclerAnalytics.totalFacilities,
        activeFacilities: recyclerAnalytics.activeFacilities,
        authorizationStatus: recyclerAnalytics.authorizationStatusDistribution,
      },
      datasetQuality: {
        materialGpsPct: qualityAnalytics.materialLotDataset.withGpsCoordinatesPct,
        materialPhotoPct: qualityAnalytics.materialLotDataset.withPhotoEvidencePct,
        recyclerAuthPct: qualityAnalytics.recyclerDataset.withAuthorizationNumberPct,
      },
      antiFabricationNotice: 'All telemetry aggregated dynamically from authoritative database records. No synthetic data, AI forecasting, or commercial rankings.',
    };
  }

  // ============================================================================
  // 8. COLLECTOR PERSONAL ANALYTICS (JWT TENANCY ISOLATED)
  // ============================================================================
  async getCollectorPersonalAnalytics(actor, query = {}) {
    const user = await this._resolveActor(actor);
    if (user.role !== ROLES.INFORMAL_COLLECTOR || !user.collectorProfile) {
      throw AppError.forbidden('Only informal collectors may access collector personal analytics');
    }

    const collectorId = user.collectorProfile.id;
    const { periodStart, periodEnd, periodLabel } = this._resolveTimeRange(query.period, query.startDate, query.endDate);

    const where = {
      collectorId,
      transactionStatus: { not: TRANSACTION_STATUS.CANCELLED },
    };

    if (periodStart || periodEnd) {
      where.transactionDate = {};
      if (periodStart) where.transactionDate.gte = periodStart;
      if (periodEnd) where.transactionDate.lte = periodEnd;
    }

    if (query.category && isValidCategory(query.category)) {
      where.category = query.category;
    }

    const [transactions, categoryGroups, lotCount] = await Promise.all([
      prisma.transactionRecord.findMany({
        where,
        select: {
          id: true,
          referenceNumber: true,
          category: true,
          quantity: true,
          unit: true,
          finalSaleValue: true,
          amountPaid: true,
          amountDue: true,
          paymentStatus: true,
          transactionDate: true,
        },
        orderBy: { transactionDate: 'desc' },
      }),
      prisma.transactionRecord.groupBy({
        by: ['category'],
        where,
        _count: { id: true },
        _sum: { finalSaleValue: true },
      }),
      prisma.materialLot.count({
        where: { collectorId },
      }),
    ]);

    let recordedSales = 0;
    let receivedPayments = 0;
    let pendingDues = 0;

    const monthlyMap = new Map();

    for (const t of transactions) {
      const sVal = parseFloat(t.finalSaleValue.toString()) || 0;
      const pVal = parseFloat(t.amountPaid.toString()) || 0;
      const dVal = parseFloat(t.amountDue.toString()) || 0;

      recordedSales += sVal;
      receivedPayments += pVal;
      pendingDues += dVal;

      const d = new Date(t.transactionDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { count: 0, recordedSales: 0, receivedPayments: 0 });
      }
      const b = monthlyMap.get(key);
      b.count += 1;
      b.recordedSales += sVal;
      b.receivedPayments += pVal;
    }

    const categoryBreakdown = categoryGroups.map((g) => ({
      category: g.category,
      transactionCount: g._count.id,
      totalSales: g._sum.finalSaleValue ? parseFloat(g._sum.finalSaleValue.toString()) : 0,
    }));

    const monthlyActivity = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      transactionCount: data.count,
      recordedSales: Math.round(data.recordedSales * 100) / 100,
      receivedPayments: Math.round(data.receivedPayments * 100) / 100,
    }));

    return {
      collectorId,
      period: periodLabel,
      totalLotsCreated: lotCount,
      totalTransactions: transactions.length,
      recordedSales: Math.round(recordedSales * 100) / 100,
      receivedPayments: Math.round(receivedPayments * 100) / 100,
      pendingDues: Math.round(pendingDues * 100) / 100,
      categoryBreakdown,
      monthlyActivity,
      dataSource: 'transactions and material_lots scoped to authenticated collector',
      note: 'Factual personal history. Zero future forecasting, risk scoring, or cross-collector exposure.',
    };
  }

  // ============================================================================
  // 9. RECYCLER OPERATIONAL ANALYTICS (JWT TENANCY ISOLATED)
  // ============================================================================
  async getRecyclerOperationalAnalytics(actor, query = {}) {
    const user = await this._resolveActor(actor);
    if (user.role !== ROLES.RECYCLER || !user.recyclerProfile) {
      throw AppError.forbidden('Only recyclers may access recycler operational analytics');
    }

    const recyclerId = user.recyclerProfile.id;
    const { periodStart, periodEnd, periodLabel } = this._resolveTimeRange(query.period, query.startDate, query.endDate);

    const [
      quotesTotal,
      quotesAccepted,
      quotesRejected,
      handoversPending,
      handoversConfirmed,
      transactions,
      activeRatesCount,
    ] = await Promise.all([
      prisma.quote.count({ where: { recyclerId } }),
      prisma.quote.count({ where: { recyclerId, status: QUOTE_STATUS.ACCEPTED } }),
      prisma.quote.count({ where: { recyclerId, status: QUOTE_STATUS.REJECTED } }),
      prisma.handoverRecord.count({ where: { recyclerId, status: { in: [HANDOVER_STATUS.PENDING_COLLECTOR, HANDOVER_STATUS.COLLECTOR_CONFIRMED, HANDOVER_STATUS.RECYCLER_CONFIRMED] } } }),
      prisma.handoverRecord.count({ where: { recyclerId, status: HANDOVER_STATUS.CONFIRMED } }),
      prisma.transactionRecord.findMany({
        where: { recyclerId, transactionStatus: { not: TRANSACTION_STATUS.CANCELLED } },
        select: {
          finalSaleValue: true,
          amountPaid: true,
          amountDue: true,
        },
      }),
      prisma.recyclerOfferedRate.count({ where: { recyclerId, status: 'ACTIVE' } }),
    ]);

    let totalProcuredValue = 0;
    let totalSettled = 0;
    let totalPendingPay = 0;

    for (const t of transactions) {
      totalProcuredValue += parseFloat(t.finalSaleValue.toString()) || 0;
      totalSettled += parseFloat(t.amountPaid.toString()) || 0;
      totalPendingPay += parseFloat(t.amountDue.toString()) || 0;
    }

    return {
      recyclerId,
      facilityName: user.recyclerProfile.facilityName,
      period: periodLabel,
      quotes: {
        total: quotesTotal,
        accepted: quotesAccepted,
        rejected: quotesRejected,
      },
      handovers: {
        pending: handoversPending,
        confirmed: handoversConfirmed,
      },
      commercialSummary: {
        totalTransactions: transactions.length,
        totalProcuredValue: Math.round(totalProcuredValue * 100) / 100,
        totalSettled: Math.round(totalSettled * 100) / 100,
        totalPendingPay: Math.round(totalPendingPay * 100) / 100,
      },
      activeOfferedRatesCount: activeRatesCount,
      dataSource: 'quotes, handover_records, transactions, recycler_offered_rates scoped to authenticated facility',
      note: 'Factual facility operational metrics. Tenancy isolated.',
    };
  }
}

module.exports = new HistoricalAnalyticsService();
