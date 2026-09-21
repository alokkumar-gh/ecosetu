/**
 * EcoSetu Navigation Type Definitions
 * Source of Truth: docs/09_FRONTEND_ARCHITECTURE.md Section 4.2
 */

export type AuthStackParamList = {
  Landing: { forceShow?: boolean } | undefined;
  Login: undefined;
  Register: { initialRole?: 'CITIZEN' | 'INFORMAL_COLLECTOR' | 'RECYCLER' } | undefined;
};

export type CitizenTabParamList = {
  CitizenHome: undefined;
  CitizenSubmit: undefined;
  CitizenRequests: undefined;
  CitizenNotifications: undefined;
  CitizenProfile: undefined;
};

export type CitizenStackParamList = {
  CitizenTabs: undefined;
  RequestDetail: { requestId: string };
  ItemTraceability: { itemId: string };
};

export type CollectorTabParamList = {
  CollectorHome: undefined;
  CollectorBrowse: undefined;
  CollectorPickups: undefined;
  CollectorConsign: undefined;
  CollectorProfile: undefined;
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
  CollectorCreateLot: {
    category?: string;
    subcategory?: string;
    condition?: string;
    sourceType?: string;
    photos?: string[];
    lotId?: string;
    existingLot?: any;
  } | undefined;
  CollectorLots: { filterStatus?: string } | undefined;
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
};

export type RecyclerTabParamList = {
  RecyclerHome: undefined;
  RecyclerIncoming: undefined;
  RecyclerRecords: undefined;
  RecyclerProfile: undefined;
};

export type RecyclerStackParamList = {
  RecyclerTabs: undefined;
  Verification: undefined;
  ConsignmentDetail: { consignmentId: string; consignment?: any };
  RecyclingRecordDetail: { recordId: string; record?: any };
  RecyclerCreateQuote: { lot: any; matchData?: any };
  RecyclerHandoverConfirm: { handoverId: string; handover?: any };
  RecyclerHandoverReceipt: { handoverId: string; handover?: any };
  RecyclerTransactions: undefined;
  RecyclerTransactionDetail: { transactionId: string; transaction?: any };
  RecyclerLotTrace: { lotId: string; lot?: any };
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
};

