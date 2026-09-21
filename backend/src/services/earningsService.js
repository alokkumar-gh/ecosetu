// EcoSetu Collector Earnings Ledger & Pending Dues Service
// Canonical Reference: SIH Problem Statement 26229 - Prompt 8: Collector Earnings Ledger + Pending Dues

const { Prisma } = require('@prisma/client');
const prisma = require('../config/database');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');
const {
  ROLES,
  PAYMENT_STATUS,
  TRANSACTION_STATUS,
  EARNINGS_PERIOD,
} = require('../utils/constants');

class EarningsService {
  /**
   * Helper: Resolve Actor to user record
   */
  async resolveActor(actor) {
    if (!actor) {
      throw AppError.unauthorized('Authentication required');
    }
    if (typeof actor === 'string') {
      const user = await prisma.user.findUnique({ where: { id: actor } });
      if (!user) throw AppError.unauthorized('User not found');
      return user;
    }
    if (!actor.role && actor.id) {
      const user = await prisma.user.findUnique({ where: { id: actor.id } });
      if (!user) throw AppError.unauthorized('User not found');
      return user;
    }
    return actor;
  }

  /**
   * Calculate server-authoritative date boundaries
   * @param {string} period - EARNINGS_PERIOD
   * @param {string|Date} [customStart]
   * @param {string|Date} [customEnd]
   * @returns {{ startDate: Date|null, endDate: Date|null }}
   */
  calculateDateBounds(period = EARNINGS_PERIOD.ALL_TIME, customStart = null, customEnd = null) {
    if (customStart || customEnd) {
      return {
        startDate: customStart ? new Date(customStart) : null,
        endDate: customEnd ? new Date(customEnd) : null,
      };
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();

    switch (period) {
      case EARNINGS_PERIOD.TODAY: {
        const start = new Date(year, month, day, 0, 0, 0, 0);
        const end = new Date(year, month, day, 23, 59, 59, 999);
        return { startDate: start, endDate: end };
      }

      case EARNINGS_PERIOD.THIS_WEEK: {
        // Monday as start of week
        const currentDay = now.getDay();
        const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        const start = new Date(year, month, day + diffToMonday, 0, 0, 0, 0);
        const end = new Date(year, month, day + diffToMonday + 6, 23, 59, 59, 999);
        return { startDate: start, endDate: end };
      }

      case EARNINGS_PERIOD.THIS_MONTH: {
        const start = new Date(year, month, 1, 0, 0, 0, 0);
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
        return { startDate: start, endDate: end };
      }

      case EARNINGS_PERIOD.LAST_MONTH: {
        const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
        const end = new Date(year, month, 0, 23, 59, 59, 999);
        return { startDate: start, endDate: end };
      }

      case EARNINGS_PERIOD.ALL_TIME:
      default:
        return { startDate: null, endDate: null };
    }
  }

  /**
   * Resolve and enforce collector ownership
   */
  async resolveCollectorScope(actor, requestedCollectorId = null) {
    const user = await this.resolveActor(actor);

    if (user.role === ROLES.INFORMAL_COLLECTOR) {
      const collector = await prisma.collectorProfile.findUnique({
        where: { userId: user.id },
      });
      if (!collector) {
        throw AppError.notFound('Collector profile not found');
      }
      return { collectorProfileId: collector.id, isCollector: true, isAdmin: false };
    }

    if (user.role === ROLES.ADMIN) {
      return {
        collectorProfileId: requestedCollectorId || null,
        isCollector: false,
        isAdmin: true,
      };
    }

    if (user.role === ROLES.RECYCLER) {
      const recycler = await prisma.recyclerProfile.findUnique({
        where: { userId: user.id },
      });
      if (!recycler) {
        throw AppError.notFound('Recycler profile not found');
      }
      return {
        recyclerProfileId: recycler.id,
        isCollector: false,
        isAdmin: false,
        isRecycler: true,
      };
    }

    throw AppError.forbidden('Unauthorized role for earnings ledger');
  }

  /**
   * Build base filter for transactions
   */
  buildWhereClause(scope, filters = {}) {
    const where = {
      transactionStatus: { not: TRANSACTION_STATUS.CANCELLED },
    };

    if (scope.isCollector) {
      where.collectorId = scope.collectorProfileId;
    } else if (scope.isAdmin && scope.collectorProfileId) {
      where.collectorId = scope.collectorProfileId;
    } else if (scope.isRecycler) {
      where.recyclerId = scope.recyclerProfileId;
    }

    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.subcategory) {
      where.subcategory = filters.subcategory;
    }
    if (filters.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }
    if (filters.recyclerId && !scope.isRecycler) {
      where.recyclerId = filters.recyclerId;
    }

    const { startDate, endDate } = this.calculateDateBounds(
      filters.period,
      filters.startDate,
      filters.endDate
    );

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = startDate;
      if (endDate) where.transactionDate.lte = endDate;
    }

    return where;
  }

  /**
   * Get Earnings Summary (Sales Recorded, Money Received, Money Pending)
   * @param {object|string} actor
   * @param {object} filters
   * @returns {Promise<object>}
   */
  async getEarningsSummary(actor, filters = {}) {
    const scope = await this.resolveCollectorScope(actor, filters.collectorId);
    const where = this.buildWhereClause(scope, filters);

    // Fetch contributing transactions
    const transactions = await prisma.transactionRecord.findMany({
      where,
      select: {
        id: true,
        finalSaleValue: true,
        amountPaid: true,
        amountDue: true,
        paymentStatus: true,
        transactionStatus: true,
      },
    });

    let totalRecordedSales = new Prisma.Decimal('0.00');
    let totalPaid = new Prisma.Decimal('0.00');
    let totalPending = new Prisma.Decimal('0.00');
    let totalPartiallyPaid = new Prisma.Decimal('0.00');

    let transactionCount = 0;
    let paidTransactionCount = 0;
    let pendingTransactionCount = 0;
    let partialTransactionCount = 0;

    for (const tx of transactions) {
      // Exclude cancelled transactions strictly
      if (tx.transactionStatus === TRANSACTION_STATUS.CANCELLED) {
        continue;
      }

      const saleValue = new Prisma.Decimal(tx.finalSaleValue);
      const paid = new Prisma.Decimal(tx.amountPaid);
      const due = new Prisma.Decimal(tx.amountDue);

      totalRecordedSales = totalRecordedSales.plus(saleValue);
      totalPaid = totalPaid.plus(paid);
      totalPending = totalPending.plus(due);
      transactionCount += 1;

      if (tx.paymentStatus === PAYMENT_STATUS.PAID) {
        paidTransactionCount += 1;
      } else if (tx.paymentStatus === PAYMENT_STATUS.PARTIALLY_PAID) {
        partialTransactionCount += 1;
        totalPartiallyPaid = totalPartiallyPaid.plus(paid);
      } else if (tx.paymentStatus === PAYMENT_STATUS.PENDING) {
        pendingTransactionCount += 1;
      }
    }

    return {
      totalRecordedSales: totalRecordedSales.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      totalPending: totalPending.toFixed(2),
      totalPartiallyPaid: totalPartiallyPaid.toFixed(2),
      transactionCount,
      paidTransactionCount,
      pendingTransactionCount,
      partialTransactionCount,
      period: filters.period || EARNINGS_PERIOD.ALL_TIME,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get Transactions contributing to the ledger (with pagination and filters)
   */
  async getEarningsTransactions(actor, filters = {}) {
    const scope = await this.resolveCollectorScope(actor, filters.collectorId);
    const where = this.buildWhereClause(scope, filters);

    const page = parseInt(filters.page, 10) || 1;
    const limit = Math.min(parseInt(filters.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.transactionRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { transactionDate: 'desc' },
        include: {
          handover: {
            select: { referenceNumber: true },
          },
          recycler: {
            select: {
              id: true,
              facilityName: true,
              user: {
                select: { name: true },
              },
            },
          },
        },
      }),
      prisma.transactionRecord.count({ where }),
    ]);

    return {
      transactions: transactions.map((tx) => ({
        id: tx.id,
        referenceNumber: tx.referenceNumber,
        category: tx.category,
        subcategory: tx.subcategory,
        quantity: Number(tx.quantity),
        unit: tx.unit,
        finalSaleValue: Number(tx.finalSaleValue).toFixed(2),
        amountPaid: Number(tx.amountPaid).toFixed(2),
        amountDue: Number(tx.amountDue).toFixed(2),
        paymentMethod: tx.paymentMethod,
        paymentStatus: tx.paymentStatus,
        transactionStatus: tx.transactionStatus,
        transactionDate: tx.transactionDate.toISOString(),
        handoverReference: tx.handover?.referenceNumber || null,
        recycler: {
          id: tx.recycler.id,
          businessName: tx.recycler.user?.name || tx.recycler.facilityName,
          facilityName: tx.recycler.facilityName,
        },
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get Pending Dues (Dedicated outstanding dues response)
   * Only PENDING or PARTIALLY_PAID. Oldest first by default.
   */
  async getPendingDues(actor, filters = {}) {
    const scope = await this.resolveCollectorScope(actor, filters.collectorId);
    const where = this.buildWhereClause(scope, filters);

    // Strict Pending / Partially Paid restriction
    if (filters.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    } else {
      where.paymentStatus = {
        in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PARTIALLY_PAID],
      };
    }

    const page = parseInt(filters.page, 10) || 1;
    const limit = Math.min(parseInt(filters.limit, 10) || 50, 100);
    const skip = (page - 1) * limit;

    // Oldest transaction first by default
    const [transactions, total] = await Promise.all([
      prisma.transactionRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { transactionDate: 'asc' },
        include: {
          handover: {
            select: { referenceNumber: true },
          },
          recycler: {
            select: {
              id: true,
              facilityName: true,
              user: {
                select: { name: true },
              },
            },
          },
        },
      }),
      prisma.transactionRecord.count({ where }),
    ]);

    let totalPendingAmount = new Prisma.Decimal('0.00');

    const mappedTransactions = transactions.map((tx) => {
      const due = new Prisma.Decimal(tx.amountDue);
      totalPendingAmount = totalPendingAmount.plus(due);

      return {
        id: tx.id,
        referenceNumber: tx.referenceNumber,
        category: tx.category,
        subcategory: tx.subcategory,
        quantity: Number(tx.quantity),
        unit: tx.unit,
        finalSaleValue: Number(tx.finalSaleValue).toFixed(2),
        amountPaid: Number(tx.amountPaid).toFixed(2),
        amountDue: due.toFixed(2),
        paymentStatus: tx.paymentStatus,
        transactionDate: tx.transactionDate.toISOString(),
        handoverReference: tx.handover?.referenceNumber || null,
        recycler: {
          id: tx.recycler.id,
          businessName: tx.recycler.user?.name || tx.recycler.facilityName,
          facilityName: tx.recycler.facilityName,
        },
      };
    });

    return {
      pendingDues: mappedTransactions,
      totalPendingAmount: totalPendingAmount.toFixed(2),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get Monthly Earnings Breakdown (Historical only, no future projections)
   */
  async getMonthlyEarnings(actor, filters = {}) {
    const scope = await this.resolveCollectorScope(actor, filters.collectorId);
    const where = this.buildWhereClause(scope, filters);

    if (filters.year) {
      const startOfYear = new Date(filters.year, 0, 1, 0, 0, 0, 0);
      const endOfYear = new Date(filters.year, 11, 31, 23, 59, 59, 999);
      where.transactionDate = {
        gte: startOfYear,
        lte: endOfYear,
      };
    }

    const transactions = await prisma.transactionRecord.findMany({
      where,
      select: {
        finalSaleValue: true,
        amountPaid: true,
        amountDue: true,
        transactionDate: true,
        transactionStatus: true,
      },
      orderBy: { transactionDate: 'asc' },
    });

    const monthlyMap = new Map();

    for (const tx of transactions) {
      if (tx.transactionStatus === TRANSACTION_STATUS.CANCELLED) {
        continue;
      }

      const d = new Date(tx.transactionDate);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthKey,
          recordedSales: new Prisma.Decimal('0.00'),
          amountPaid: new Prisma.Decimal('0.00'),
          amountPending: new Prisma.Decimal('0.00'),
          transactionCount: 0,
        });
      }

      const entry = monthlyMap.get(monthKey);
      entry.recordedSales = entry.recordedSales.plus(new Prisma.Decimal(tx.finalSaleValue));
      entry.amountPaid = entry.amountPaid.plus(new Prisma.Decimal(tx.amountPaid));
      entry.amountPending = entry.amountPending.plus(new Prisma.Decimal(tx.amountDue));
      entry.transactionCount += 1;
    }

    // Convert map to array sorted descending (newest month first)
    const monthlyList = Array.from(monthlyMap.values())
      .map((entry) => ({
        month: entry.month,
        recordedSales: entry.recordedSales.toFixed(2),
        amountPaid: entry.amountPaid.toFixed(2),
        amountPending: entry.amountPending.toFixed(2),
        transactionCount: entry.transactionCount,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));

    return {
      monthly: monthlyList,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Helper to convert numbers to Indian words for speech synthesis
   */
  numberToIndianWords(num, language = 'en') {
    num = Math.round(Number(num));
    if (isNaN(num) || num <= 0) {
      return language === 'hi' ? 'शून्य' : language === 'mr' ? 'शून्य' : language === 'or' ? 'ଶୂନ' : 'zero';
    }

    const enOnes = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const enTens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    const hiOnes = ['', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ', 'दस', 'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस', 'बीस', 'इक्कीस', 'बाईस', 'तेईस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताईस', 'अट्ठाईस', 'उनतीस', 'तीस'];
    const mrOnes = ['', 'एक', 'दोन', 'तीन', 'चार', 'पाच', 'सहा', 'सात', 'आठ', 'नऊ', 'दहा', 'अकरा', 'बारा', 'तेरा', 'चौदा', 'पंधरा', 'सोळा', 'सतरा', 'अठरा', 'एकोणीस', 'वीस', 'एकवीस', 'बावीस', 'तेवीस', 'चोवीस', 'पंचवीस', 'सव्वीस', 'सत्तावीस', 'अठ्ठावीस', 'एकोणतीस', 'तीस'];
    const orOnes = ['', 'ଏକ', 'ଦୁଇ', 'ତିନି', 'ଚାରି', 'ପାଞ୍ଚ', 'ଛଅ', 'ସାତ', 'ଆଠ', 'ନଅ', 'ଦଶ', 'ଏଗାର', 'ବାର', 'ତେର', 'ଚଉଦ', 'ପନ୍ଦର', 'ଷୋହଳ', 'ସତର', 'ଅଠର', 'ଉଣାଇଶ', 'କୋଡ଼ିଏ', 'ଏକୋଇଶ', 'ବାଇଶ', 'ତେଇଶ', 'ଚବିଶ', 'ପଚିଶ', 'ଛବିଶ', 'ସତାଇଶ', 'ଅଠାଇଶ', 'ଅଣତିରିଶ', 'ତିରିଶ'];

    if (language === 'en') {
      const parts = [];
      const crores = Math.floor(num / 10000000);
      num %= 10000000;
      const lakhs = Math.floor(num / 100000);
      num %= 100000;
      const thousands = Math.floor(num / 1000);
      num %= 1000;
      const hundreds = Math.floor(num / 100);
      num %= 100;

      const getUnderHundred = (n) => {
        if (n < 20) return enOnes[n];
        const t = Math.floor(n / 10);
        const o = n % 10;
        return `${enTens[t]}${o ? ' ' + enOnes[o] : ''}`;
      };

      if (crores > 0) parts.push(`${getUnderHundred(crores)} crore`);
      if (lakhs > 0) parts.push(`${getUnderHundred(lakhs)} lakh`);
      if (thousands > 0) parts.push(`${getUnderHundred(thousands)} thousand`);
      if (hundreds > 0) parts.push(`${enOnes[hundreds]} hundred`);
      if (num > 0) parts.push(getUnderHundred(num));

      return parts.join(' ').trim();
    }

    if (language === 'hi') {
      const parts = [];
      const crores = Math.floor(num / 10000000);
      num %= 10000000;
      const lakhs = Math.floor(num / 100000);
      num %= 100000;
      const thousands = Math.floor(num / 1000);
      num %= 1000;
      const hundreds = Math.floor(num / 100);
      num %= 100;

      if (crores > 0) parts.push(`${hiOnes[crores] || crores} करोड़`);
      if (lakhs > 0) parts.push(`${hiOnes[lakhs] || lakhs} लाख`);
      if (thousands > 0) parts.push(`${hiOnes[thousands] || thousands} हजार`);
      if (hundreds > 0) parts.push(`${hiOnes[hundreds] || hundreds} सौ`);
      if (num > 0) parts.push(`${hiOnes[num] || num}`);

      return parts.join(' ').trim();
    }

    if (language === 'mr') {
      const parts = [];
      const crores = Math.floor(num / 10000000);
      num %= 10000000;
      const lakhs = Math.floor(num / 100000);
      num %= 100000;
      const thousands = Math.floor(num / 1000);
      num %= 1000;
      const hundreds = Math.floor(num / 100);
      num %= 100;

      if (crores > 0) parts.push(`${mrOnes[crores] || crores} कोटी`);
      if (lakhs > 0) parts.push(`${mrOnes[lakhs] || lakhs} लाख`);
      if (thousands > 0) parts.push(`${mrOnes[thousands] || thousands} हजार`);
      if (hundreds > 0) parts.push(`${mrOnes[hundreds] || hundreds} शे`);
      if (num > 0) parts.push(`${mrOnes[num] || num}`);

      return parts.join(' ').trim();
    }

    if (language === 'or') {
      const parts = [];
      const crores = Math.floor(num / 10000000);
      num %= 10000000;
      const lakhs = Math.floor(num / 100000);
      num %= 100000;
      const thousands = Math.floor(num / 1000);
      num %= 1000;
      const hundreds = Math.floor(num / 100);
      num %= 100;

      if (crores > 0) parts.push(`${orOnes[crores] || crores} କୋଟି`);
      if (lakhs > 0) parts.push(`${orOnes[lakhs] || lakhs} ଲକ୍ଷ`);
      if (thousands > 0) parts.push(`${orOnes[thousands] || thousands} ହଜାର`);
      if (hundreds > 0) parts.push(`${orOnes[hundreds] || hundreds} ଶହ`);
      if (num > 0) parts.push(`${orOnes[num] || num}`);

      return parts.join(' ').trim();
    }

    return String(num);
  }

  /**
   * Generate multilingual speech text for low-literacy TTS playback
   * @param {object} summary - Summary object containing totals
   * @param {string} language - 'en' | 'hi' | 'mr' | 'or'
   * @returns {string}
   */
  generateSpeechText(summary, language = 'en') {
    const salesNum = Math.round(Number(summary.totalRecordedSales) || 0);
    const paidNum = Math.round(Number(summary.totalPaid) || 0);
    const pendingNum = Math.round(Number(summary.totalPending) || 0);

    const salesWords = this.numberToIndianWords(salesNum, language);
    const paidWords = this.numberToIndianWords(paidNum, language);
    const pendingWords = this.numberToIndianWords(pendingNum, language);

    if (language === 'hi') {
      return `आपकी दर्ज बिक्री ${salesWords} रुपये है। आपको ${paidWords} रुपये प्राप्त हुए हैं। ${pendingWords} रुपये बाकी हैं।`;
    }

    if (language === 'mr') {
      return `तुमची नोंदणीकृत विक्री ${salesWords} रुपये आहे. तुम्हाला ${paidWords} रुपये मिळाले आहेत. ${pendingWords} रुपये बाकी आहेत.`;
    }

    if (language === 'or') {
      return `ଆପଣଙ୍କର ରେକର୍ଡ ହୋଇଥିବା ବିକ୍ରି ${salesWords} ଟଙ୍କା ଅଟେ। ଆପଣ ${paidWords} ଟଙ୍କା ପାଇଛନ୍ତି। ${pendingWords} ଟଙ୍କା ବାକି ଅଛି।`;
    }

    // Default English
    return `Your recorded sales are ${salesWords} rupees. You have received ${paidWords} rupees. ${pendingWords} rupees are pending.`;
  }
}

module.exports = new EarningsService();
