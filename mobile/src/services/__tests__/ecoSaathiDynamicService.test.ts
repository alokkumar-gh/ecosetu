/**
 * EcoSetu — Eco-Saathi Dynamic Data Resolver Unit Tests
 * Source of Truth: docs/ECOSETU_ECO-SAATHI_IMPLEMENTATION_ARCHITECTURE_v1.0.md
 * 
 * Verifies that dynamic data resolvers:
 * 1. Fetch only verified live data from real services without fabricating numbers
 * 2. Properly enforce authentication
 * 3. Handle offline and network error conditions gracefully
 * 4. Protect private user data from leakage
 * 5. Return safe navigation actions without mutating state
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveEcoSaathiDynamicIntent } from '../ecoSaathiDynamicService';
import { EcoSaathiDynamicContext } from '../../types/ecoSaathi';
import earningsService from '../earningsService';
import { priceService } from '../priceService';
import { materialLotService } from '../materialLotService';
import { quoteService } from '../quoteService';
import { requestService } from '../requestService';
import disputeService from '../disputeService';
import { networkService } from '../networkService';

describe('Eco-Saathi Dynamic Service (STEP 5)', () => {
  const mockAuthContext: EcoSaathiDynamicContext = {
    userId: 'user_123',
    role: 'INFORMAL_COLLECTOR',
    language: 'en',
    isAuthenticated: true,
    isOnline: true,
    user: {
      id: 'user_123',
      name: 'Ramesh Kumar',
      email: 'ramesh@example.com',
      role: 'INFORMAL_COLLECTOR',
      status: 'VERIFIED',
      isVerified: true,
    },
  };

  const mockUnauthContext: EcoSaathiDynamicContext = {
    userId: null,
    role: null,
    language: 'en',
    isAuthenticated: false,
    isOnline: true,
    user: null,
  };

  describe('1. Authentication & Security Enforcement', () => {
    it('returns UNAUTHORIZED for authenticated-only resolvers when user is not logged in', async () => {
      const result = await resolveEcoSaathiDynamicIntent(
        'INTENT_VIEW_EARNINGS',
        'RESOLVE_USER_EARNINGS',
        mockUnauthContext
      );

      assert.equal(result.status, 'UNAUTHORIZED');
      assert.ok(result.message.includes('Please sign in'));
      assert.equal(result.action?.targetRoute, 'Login');
    });

    it('returns UNAUTHORIZED in Hindi when language is hi', async () => {
      const result = await resolveEcoSaathiDynamicIntent(
        'INTENT_VIEW_EARNINGS',
        'RESOLVE_USER_EARNINGS',
        { ...mockUnauthContext, language: 'hi' }
      );

      assert.equal(result.status, 'UNAUTHORIZED');
      assert.ok(result.message.includes('लॉगिन करें'));
    });

    it('allows Price Board inquiry without authentication', async () => {
      const origGetPriceBoard = priceService.getPriceBoard;
      priceService.getPriceBoard = async () => ({
        location: 'Berhampur',
        prices: [
          {
            id: 'p1',
            category: 'Copper',
            subcategory: null,
            buyingPrice: 450,
            quotedPrice: null,
            marketRangeLow: 400,
            marketRangeHigh: 480,
            unit: 'kg',
            currency: 'INR',
            location: 'Berhampur',
            source: 'SYSTEM',
            status: 'ACTIVE',
            effectiveDate: '2026-09-25',
            expiryDate: null,
            lastUpdatedAt: '2026-09-25T10:00:00Z',
          },
        ],
        count: 1,
        lastUpdatedAt: '2026-09-25T10:00:00Z',
      });

      const result = await resolveEcoSaathiDynamicIntent(
        'INTENT_TODAYS_PRICE',
        'RESOLVE_PRICE_BOARD',
        mockUnauthContext
      );

      assert.equal(result.status, 'SUCCESS');
      assert.ok(result.message.includes('Copper: ₹450/kg'));
      priceService.getPriceBoard = origGetPriceBoard;
    });
  });

  describe('2. Price Discovery Resolver (RESOLVE_PRICE_BOARD)', () => {
    it('returns verified benchmark prices with explicit non-guarantee disclaimer', async () => {
      const origGetPriceBoard = priceService.getPriceBoard;
      priceService.getPriceBoard = async () => ({
        location: 'Bhubaneswar',
        prices: [
          {
            id: 'p1',
            category: 'Mobile PCB',
            subcategory: null,
            buyingPrice: 1200,
            quotedPrice: null,
            marketRangeLow: 1100,
            marketRangeHigh: 1300,
            unit: 'kg',
            currency: 'INR',
            location: 'Bhubaneswar',
            source: 'SYSTEM',
            status: 'ACTIVE',
            effectiveDate: '2026-09-25',
            expiryDate: null,
            lastUpdatedAt: '2026-09-25T10:00:00Z',
          },
          {
            id: 'p2',
            category: 'Battery',
            subcategory: null,
            buyingPrice: 85,
            quotedPrice: null,
            marketRangeLow: 75,
            marketRangeHigh: 95,
            unit: 'kg',
            currency: 'INR',
            location: 'Bhubaneswar',
            source: 'SYSTEM',
            status: 'ACTIVE',
            effectiveDate: '2026-09-25',
            expiryDate: null,
            lastUpdatedAt: '2026-09-25T10:00:00Z',
          },
        ],
        count: 2,
        lastUpdatedAt: '2026-09-25T10:00:00Z',
        isCached: false,
      });

      const result = await resolveEcoSaathiDynamicIntent(
        'INTENT_TODAYS_PRICE',
        'RESOLVE_PRICE_BOARD',
        mockAuthContext
      );

      assert.equal(result.status, 'SUCCESS');
      assert.ok(result.message.includes('Mobile PCB: ₹1200/kg'));
      assert.ok(result.message.includes('Battery: ₹85/kg'));
      assert.ok(result.message.includes('reference benchmark prices'));
      assert.equal(result.action?.targetRoute, 'CollectorPriceBoard');
      priceService.getPriceBoard = origGetPriceBoard;
    });

    it('labels cached data with Last synchronized note', async () => {
      const origGetPriceBoard = priceService.getPriceBoard;
      priceService.getPriceBoard = async () => ({
        location: 'Cuttack',
        prices: [
          {
            id: 'p1',
            category: 'Copper',
            subcategory: null,
            buyingPrice: 400,
            quotedPrice: null,
            marketRangeLow: 380,
            marketRangeHigh: 420,
            unit: 'kg',
            currency: 'INR',
            location: 'Cuttack',
            source: 'SYSTEM',
            status: 'ACTIVE',
            effectiveDate: '2026-09-25',
            expiryDate: null,
            lastUpdatedAt: '2026-09-25T10:00:00Z',
          },
        ],
        count: 1,
        lastUpdatedAt: '2026-09-25T10:00:00Z',
        isCached: true,
      });

      const result = await resolveEcoSaathiDynamicIntent(
        'INTENT_TODAYS_PRICE',
        'RESOLVE_PRICE_BOARD',
        mockAuthContext
      );

      assert.equal(result.status, 'SUCCESS');
      assert.equal(result.isCached, true);
      assert.ok(result.message.includes('Last synchronized information'));
      priceService.getPriceBoard = origGetPriceBoard;
    });

    it('handles empty price board with UNAVAILABLE status', async () => {
      const origGetPriceBoard = priceService.getPriceBoard;
      priceService.getPriceBoard = async () => ({
        location: 'Berhampur',
        prices: [],
        count: 0,
        lastUpdatedAt: '2026-09-25T10:00:00Z',
      });

      const result = await resolveEcoSaathiDynamicIntent(
        'INTENT_TODAYS_PRICE',
        'RESOLVE_PRICE_BOARD',
        mockAuthContext
      );

      assert.equal(result.status, 'UNAVAILABLE');
      assert.ok(result.message.includes('No current market prices'));
      priceService.getPriceBoard = origGetPriceBoard;
    });
  });

  describe('3. Collector Earnings Resolver (RESOLVE_USER_EARNINGS)', () => {
    it('returns actual authenticated earnings summary without fabrication', async () => {
      const origGetEarningsSummary = earningsService.getEarningsSummary;
      earningsService.getEarningsSummary = async () => ({
        totalRecordedSales: '15400.00',
        totalPaid: '12000.00',
        totalPending: '3400.00',
        totalPartiallyPaid: '0.00',
        transactionCount: 5,
        paidTransactionCount: 2,
        pendingTransactionCount: 3,
        partialTransactionCount: 0,
        period: 'ALL_TIME',
        generatedAt: '2026-09-25T10:00:00Z',
        isCached: false,
      });

      const result = await resolveEcoSaathiDynamicIntent(
        'INTENT_VIEW_EARNINGS',
        'RESOLVE_USER_EARNINGS',
        mockAuthContext
      );

      assert.equal(result.status, 'SUCCESS');
      assert.ok(result.message.includes('₹15400.00'));
      assert.ok(result.message.includes('₹12000.00'));
      assert.ok(result.message.includes('₹3400.00'));
      assert.ok(result.message.includes('3 pending transaction'));
      assert.equal(result.action?.targetRoute, 'CollectorEarnings');
      earningsService.getEarningsSummary = origGetEarningsSummary;
    });

    it('returns multilingual earnings in Marathi', async () => {
      const origGetEarningsSummary = earningsService.getEarningsSummary;
      earningsService.getEarningsSummary = async () => ({
        totalRecordedSales: '5000.00',
        totalPaid: '5000.00',
        totalPending: '0.00',
        totalPartiallyPaid: '0.00',
        transactionCount: 2,
        paidTransactionCount: 2,
        pendingTransactionCount: 0,
        partialTransactionCount: 0,
        period: 'ALL_TIME',
        generatedAt: '2026-09-25T10:00:00Z',
        isCached: false,
      });

      const result = await resolveEcoSaathiDynamicIntent(
        'INTENT_VIEW_EARNINGS',
        'RESOLVE_USER_EARNINGS',
        { ...mockAuthContext, language: 'mr' }
      );

      assert.equal(result.status, 'SUCCESS');
      assert.ok(result.message.includes('एकूण नोंदवलेली विक्री: ₹5000.00'));
      earningsService.getEarningsSummary = origGetEarningsSummary;
    });
  });

  describe('4. Collector Lots Resolver (RESOLVE_USER_LOTS)', () => {
    it('fetches real active lots count and latest lot details', async () => {
      const origListLots = materialLotService.listLots;
      materialLotService.listLots = async () => ({
        lots: [
          {
            id: 'lot_1',
            referenceNumber: 'LOT-2026-001',
            collectorId: 'c1',
            category: 'Smartphones',
            status: 'OPEN',
            approximateTotalWeightKg: 12,
            createdAt: '2026-09-25T10:00:00Z',
            updatedAt: '2026-09-25T10:00:00Z',
          },
          {
            id: 'lot_2',
            referenceNumber: 'LOT-2026-002',
            collectorId: 'c1',
            category: 'PCBs',
            status: 'DRAFT',
            approximateTotalWeightKg: 5,
            createdAt: '2026-09-25T10:00:00Z',
            updatedAt: '2026-09-25T10:00:00Z',
          },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      });

      const result = await resolveEcoSaathiDynamicIntent(
        'INTENT_MY_LOTS_STATUS',
        'RESOLVE_USER_LOTS',
        mockAuthContext
      );

      assert.equal(result.status, 'SUCCESS');
      assert.ok(result.message.includes('Active / Open Lots: 2'));
      assert.ok(result.message.includes('Smartphones (12kg, Status: OPEN)'));
      assert.equal(result.action?.targetRoute, 'CollectorLots');
      materialLotService.listLots = origListLots;
    });
  });

  describe('5. Deals & Offers Resolver (RESOLVE_USER_DEALS)', () => {
    it('resolves active negotiations for collector', async () => {
      const origListLots = materialLotService.listLots;
      materialLotService.listLots = async () => ({
        lots: [
          {
            id: 'lot_1',
            referenceNumber: 'LOT-2026-001',
            collectorId: 'c1',
            category: 'PCBs',
            status: 'NEGOTIATING',
            createdAt: '2026-09-25T10:00:00Z',
            updatedAt: '2026-09-25T10:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        totalPages: 1,
      });

      const result = await resolveEcoSaathiDynamicIntent(
        'INTENT_VIEW_OFFERS',
        'RESOLVE_USER_DEALS',
        mockAuthContext
      );

      assert.equal(result.status, 'SUCCESS');
      assert.ok(result.message.includes('Total Active Negotiations: 1'));
      assert.equal(result.action?.targetRoute, 'CollectorDeals');
      materialLotService.listLots = origListLots;
    });

    it('resolves purchase offers for citizen', async () => {
      const citizenContext: EcoSaathiDynamicContext = {
        ...mockAuthContext,
        role: 'CITIZEN',
        user: { ...mockAuthContext.user!, role: 'CITIZEN' },
      };

      const origGetCitizenQuotes = quoteService.getCitizenQuotes;
      quoteService.getCitizenQuotes = async () => [
        {
          id: 'quote_1',
          referenceNumber: 'QUO-2026-001',
          materialLotId: 'lot_1',
          category: 'Mobile',
          quotedUnitPrice: 3500,
          unit: 'PER_UNIT',
          currency: 'INR',
          status: 'SENT',
          validFrom: '2026-09-25T00:00:00Z',
          validUntil: '2026-10-01T00:00:00Z',
          createdAt: '2026-09-25T10:00:00Z',
        },
      ];

      const result = await resolveEcoSaathiDynamicIntent(
        'INTENT_VIEW_OFFERS',
        'RESOLVE_USER_DEALS',
        citizenContext
      );

      assert.equal(result.status, 'SUCCESS');
      assert.ok(result.message.includes('Latest Purchase Offer: ₹3500 (SENT)'));
      quoteService.getCitizenQuotes = origGetCitizenQuotes;
    });
  });

  describe('6. Payment Status Resolver (RESOLVE_PAYMENT_STATUS)', () => {
    it('summarizes paid and pending settlements accurately', async () => {
      const origGetEarningsSummary = earningsService.getEarningsSummary;
      earningsService.getEarningsSummary = async () => ({
        totalRecordedSales: '12000.00',
        totalPaid: '10500.00',
        totalPending: '1500.00',
        totalPartiallyPaid: '0.00',
        transactionCount: 10,
        paidTransactionCount: 8,
        pendingTransactionCount: 2,
        partialTransactionCount: 0,
        period: 'ALL_TIME',
        generatedAt: '2026-09-25T10:00:00Z',
      });

      const result = await resolveEcoSaathiDynamicIntent(
        'INTENT_PAYMENT_STATUS',
        'RESOLVE_PAYMENT_STATUS',
        mockAuthContext
      );

      assert.equal(result.status, 'SUCCESS');
      assert.ok(result.message.includes('Settled / Paid Transactions: 8'));
      assert.ok(result.message.includes('Pending Settlements: 2 (₹1500.00)'));
      assert.equal(result.action?.targetRoute, 'CollectorTransactions');
      earningsService.getEarningsSummary = origGetEarningsSummary;
    });
  });

  describe('7. Citizen Requests Status Resolver (RESOLVE_CITIZEN_REQUESTS)', () => {
    it('returns pickup requests summary for citizen', async () => {
      const origGetRequests = requestService.getRequests;
      requestService.getRequests = async () => [
        { id: 'req_1', status: 'SUBMITTED' },
        { id: 'req_2', status: 'COMPLETED' },
      ];

      const result = await resolveEcoSaathiDynamicIntent(
        'INTENT_CITIZEN_REQUESTS_STATUS',
        'RESOLVE_CITIZEN_REQUESTS',
        mockAuthContext
      );

      assert.equal(result.status, 'SUCCESS');
      assert.ok(result.message.includes('Total Requests: 2'));
      assert.ok(result.message.includes('In Progress / Submitted: 1'));
      assert.ok(result.message.includes('Completed Pickups: 1'));
      assert.equal(result.action?.targetRoute, 'CitizenRequests');
      requestService.getRequests = origGetRequests;
    });
  });

  describe('8. Account Verification Status Resolver (RESOLVE_VERIFICATION_STATUS)', () => {
    it('returns verified status for verified collector', async () => {
      const result = await resolveEcoSaathiDynamicIntent(
        'INTENT_VERIFICATION_STATUS',
        'RESOLVE_VERIFICATION_STATUS',
        mockAuthContext
      );

      assert.equal(result.status, 'SUCCESS');
      assert.ok(result.message.includes('Verified Account'));
      assert.equal(result.action?.targetRoute, 'CollectorProfile');
    });

    it('returns pending status for pending user in Odia', async () => {
      const pendingContext: EcoSaathiDynamicContext = {
        ...mockAuthContext,
        language: 'or',
        user: {
          ...mockAuthContext.user!,
          isVerified: false,
          status: 'PENDING_VERIFICATION',
        },
      };

      const result = await resolveEcoSaathiDynamicIntent(
        'INTENT_VERIFICATION_STATUS',
        'RESOLVE_VERIFICATION_STATUS',
        pendingContext
      );

      assert.equal(result.status, 'SUCCESS');
      assert.ok(result.message.includes('ଆଡମିନ୍ ଯାଞ୍ଚ ପେଣ୍ଡିଂ'));
    });
  });

  describe('9. Disputes Status Resolver (RESOLVE_USER_DISPUTES)', () => {
    it('returns count of open dispute tickets', async () => {
      const origGetDisputes = disputeService.getDisputes;
      disputeService.getDisputes = async () => ({
        data: {
          disputes: [
            { id: 'disp_1', disputeReference: 'DISP-2026-001', status: 'OPEN' },
          ],
        },
      } as any);

      const result = await resolveEcoSaathiDynamicIntent(
        'INTENT_REPORT_DISPUTE',
        'RESOLVE_USER_DISPUTES',
        mockAuthContext
      );

      assert.equal(result.status, 'SUCCESS');
      assert.ok(result.message.includes('Active/Open Tickets: 1'));
      assert.ok(result.message.includes('#DISP-2026-001'));
      assert.equal(result.action?.targetRoute, 'CollectorDisputes');
      disputeService.getDisputes = origGetDisputes;
    });
  });

  describe('10. Offline & Error Safeguards', () => {
    it('handles network error without leaking stack traces or internal URLs', async () => {
      const origGetEarningsSummary = earningsService.getEarningsSummary;
      earningsService.getEarningsSummary = async () => {
        throw new Error('Prisma database connection error at localhost:5432');
      };

      const result = await resolveEcoSaathiDynamicIntent(
        'INTENT_VIEW_EARNINGS',
        'RESOLVE_USER_EARNINGS',
        mockAuthContext
      );

      assert.equal(result.status, 'ERROR');
      assert.ok(!result.message.includes('Prisma'));
      assert.ok(!result.message.includes('localhost'));
      assert.ok(!result.message.includes('5432'));
      assert.ok(result.message.includes('Unable to retrieve your verified live data'));
      earningsService.getEarningsSummary = origGetEarningsSummary;
    });

    it('handles offline state cleanly when isConnected is false', async () => {
      const origIsConnected = networkService.isConnected;
      networkService.isConnected = () => false;

      const origListLots = materialLotService.listLots;
      materialLotService.listLots = async () => {
        const netErr: any = new Error('Network request failed');
        netErr.isNetworkError = true;
        throw netErr;
      };

      const result = await resolveEcoSaathiDynamicIntent(
        'INTENT_MY_LOTS_STATUS',
        'RESOLVE_USER_LOTS',
        mockAuthContext
      );

      assert.equal(result.status, 'OFFLINE');
      assert.ok(result.message.includes("You're offline"));
      networkService.isConnected = origIsConnected;
      materialLotService.listLots = origListLots;
    });

    it('returns NOT_IMPLEMENTED for unknown resolver keys without crashing', async () => {
      const result = await resolveEcoSaathiDynamicIntent(
        'INTENT_UNKNOWN',
        'RESOLVE_NON_EXISTENT_KEY',
        mockAuthContext
      );

      assert.equal(result.status, 'NOT_IMPLEMENTED');
    });
  });
});
