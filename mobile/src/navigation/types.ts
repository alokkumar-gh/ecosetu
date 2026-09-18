/**
 * EcoSetu Navigation Type Definitions
 * Source of Truth: docs/09_FRONTEND_ARCHITECTURE.md Section 4.2
 */

export type AuthStackParamList = {
  Landing: undefined;
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
  PickupExecution: { pickupId: string };
  RequestDetail: { requestId: string };
  Verification: undefined;
  CreateConsignment: { recyclerId?: string; recycler?: any } | undefined;
  CollectorConsignments: undefined;
  CollectorConsignmentStatus: { consignmentId: string; consignment?: any };
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
};

export type AdminTabParamList = {
  AdminHome: undefined;
  AdminVerifications: undefined;
  AdminUsers: undefined;
  AdminAuditLogs: undefined;
  AdminProfile: undefined;
};
