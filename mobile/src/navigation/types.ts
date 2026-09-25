/**
 * EcoSetu Navigation Type Definitions
 * Source of Truth: docs/09_FRONTEND_ARCHITECTURE.md Section 4.2
 */

export type AuthStackParamList = {
  Landing: { forceShow?: boolean } | undefined;
  AuthGateway: undefined;
  Login: undefined;
  Register: { initialRole?: 'CITIZEN' | 'INFORMAL_COLLECTOR' | 'RECYCLER' } | undefined;
  ForgotPassword: undefined;
  CollectorOnboarding: { idToken?: string; name?: string; email?: string } | undefined;
  RecyclerOnboarding: { idToken?: string; name?: string; email?: string } | undefined;
};

export type CitizenTabParamList = {
  CitizenHome: undefined;
  CitizenMarketplace: undefined;
  CitizenSubmit: undefined;
  CitizenRequests: undefined;
  CitizenProfile: undefined;
};

export type CitizenStackParamList = {
  CitizenTabs: undefined;
  CitizenMarketplace: undefined;
  CitizenMarketplaceItemDetail: { lotId: string; lot?: any };
  CitizenPurchases: { filterStatus?: string } | undefined;
  RequestDetail: { requestId: string };
  ItemTraceability: { itemId?: string } | undefined;
  CitizenNotifications: undefined;
  CitizenBills: undefined;
  CitizenBillDetail: { billId?: string; transactionId?: string; bill?: any };
  PaymentMethod: { transactionId: string; transaction?: any };
  CashPaymentConfirmation: { transactionId: string; transaction?: any; confirmation?: any };
  PaymentResult: { transactionId: string; status: 'SUCCESS' | 'PENDING' | 'FAILED'; paymentMethod: string; amount: number; billId?: string; errorMessage?: string };
};

export type CollectorTabParamList = {
  CollectorHome: undefined;
  CollectorSell: undefined;
  CollectorDeals: { filterStatus?: string } | undefined;
  CollectorEarnings: undefined;
  CollectorProfile: undefined;
  CollectorBrowse?: undefined;
  CollectorPickups?: undefined;
  CollectorConsign?: undefined;
};

export type CollectorStackParamList = {
  CollectorTabs: undefined;
  PickupDetail: { pickupId: string; pickup?: any };
  PickupExecution: { pickupId: string };
  RequestDetail: { requestId: string };
  Verification: undefined;
  CreateConsignment: { recyclerId?: string; recycler?: any } | undefined;
  CollectorConsignments: undefined;
  CollectorConsignmentStatus: { consignmentId: string; consignment?: any };
  CollectorRecyclerDirectory: undefined;
  CollectorRecyclerDetail: { recyclerId: string; recycler?: any; lotId?: string; preselectedCategory?: string };
  RecyclerFacilityDetail: { recyclerId: string; recycler?: any };
  CollectorMaterialCapture: undefined;
  CollectorSellFlow: undefined;
  CollectorCreateLot: {
    category?: string;
    subcategory?: string;
    condition?: string;
    sourceType?: string;
    photos?: string[];
    lotId?: string;
    existingLot?: any;
    approximateTotalWeightKg?: number;
    intent?: string;
  } | undefined;
  CollectorLots: { filterStatus?: string } | undefined;
  CollectorBrowse: undefined;
  CollectorPickups: undefined;
  CollectorLotDetail: { lotId: string; lot?: any };
  CollectorPriceBoard: { preselectedCategory?: string; preselectedLocation?: string } | undefined;
  CollectorRecyclerMatches: { lotId: string; lot?: any };
  CollectorQuotes: { lotId: string; lot?: any };
  CollectorHandover: { lotId?: string; quoteId?: string; lot?: any; quote?: any; handoverId?: string };
  CollectorHandoverReceipt: { handoverId: string; handover?: any };
  CollectorRecordSale: { handoverId: string; handover?: any };
  CollectorTransactions: undefined;
  CollectorTransactionDetail: { transactionId: string; transaction?: any };
  CollectorEarnings: undefined;
  CollectorSafetyCenter: undefined;
  CollectorSafetyDetail: { topicId: string };
  CollectorLotTrace: { lotId: string; lot?: any };
  CollectorPickupBatches: undefined;
  CollectorBatchDetail: { batchId: string; batch?: any };
  RecyclerBatchDetail: { batchId: string; batch?: any };
  CollectorDemand: undefined;
  CollectorDisputes: undefined;
  CollectorDisputeDetail: { disputeId: string; dispute?: any };
  PaymentMethod: { transactionId: string; transaction?: any };
  CashPaymentConfirmation: { transactionId: string; transaction?: any; confirmation?: any };
  PaymentResult: { transactionId: string; status: 'SUCCESS' | 'PENDING' | 'FAILED'; paymentMethod: string; amount: number; billId?: string; errorMessage?: string };
  CollectorBills: undefined;
  CollectorBillDetail: { billId?: string; transactionId?: string; bill?: any };
};

export type RecyclerTabParamList = {
  RecyclerMarket:    undefined;
  RecyclerOrders:    undefined;
  RecyclerInventory: undefined;
  RecyclerMoney:     undefined;
  RecyclerProfile:   undefined;
};

export type RecyclerStackParamList = {
  RecyclerTabs: undefined;
  Verification: undefined;
  RecyclerMarketplace: undefined;
  RecyclerLotDetail: { lotId: string; lot?: any };
  ConsignmentDetail: { consignmentId: string; consignment?: any };
  RecyclingRecordDetail: { recordId: string; record?: any };
  RecyclerCreateQuote: { lot?: any; matchData?: any; sourcingResponseId?: string; materialCategory?: string; quantity?: number; collectorId?: string };
  RecyclerHandoverConfirm: { handoverId: string; handover?: any };
  RecyclerHandoverReceipt: { handoverId: string; handover?: any };
  RecyclerTransactions: undefined;
  RecyclerTransactionDetail: { transactionId: string; transaction?: any };
  RecyclerLotTrace: { lotId: string; lot?: any };
  RecyclerPickupManagement: undefined;
  RecyclerCreateBatch: { preselectedLotIds?: string[] } | undefined;
  RecyclerBatchDetail: { batchId: string; batch?: any };
  RecyclerSourcing: undefined;
  RecyclerCreateSourcingRequest: { template?: any } | undefined;
  RecyclerSourcingDetail: { requestId: string; request?: any };
  RecyclerDisputes: undefined;
  RecyclerDisputeDetail: { disputeId: string; dispute?: any };
  PaymentMethod: { transactionId: string; transaction?: any };
  CashPaymentConfirmation: { transactionId: string; transaction?: any; confirmation?: any };
  PaymentResult: { transactionId: string; status: 'SUCCESS' | 'PENDING' | 'FAILED'; paymentMethod: string; amount: number; billId?: string; errorMessage?: string };
  RecyclerBills: undefined;
  RecyclerBillDetail: { billId?: string; transactionId?: string; bill?: any };
  RecyclerRates: undefined;
};

export type AdminTabParamList = {
  AdminHome: undefined;
  AdminVerifications: undefined;
  AdminUsers: { filterStatus?: string; filterRole?: string } | undefined;
  AdminAuditLogs: undefined;
  AdminProfile: undefined;
  AdminGeographicAnalytics: undefined;
  AdminReports: undefined;
  AdminGovernance: undefined;
  AdminSystemHealth: undefined;
  AdminNotificationCenter: { tab?: 'compose' | 'history' | 'templates' | 'analytics'; initialAudience?: string; targetUser?: any } | undefined;
  AdminHistoricalAnalytics: { initialTab?: 'prices' | 'materials' | 'transactions' | 'recyclers' | 'traceability' | 'dataQuality' } | undefined;
  AdminDisputes: undefined;
  AdminBills: undefined;
  AdminBillDetail: { billId: string; bill?: any };
};


