import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { networkService } from '../services/networkService';
import { offlineQueue } from '../services/offlineQueue';

export interface NetworkContextValue {
  isConnected: boolean;
  isInternetReachable: boolean;
  connectionType: string;
  pendingActionsCount: number;
  failedActionsCount: number;
  conflictActionsCount: number;
  isSyncing: boolean;
  triggerSync: () => Promise<any>;
}

export const NetworkContext = createContext<NetworkContextValue | null>(null);

export interface NetworkProviderProps {
  children: ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(networkService.isConnected());
  const [isInternetReachable, setIsInternetReachable] = useState<boolean>(networkService.isInternetReachable());
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const [pendingActionsCount, setPendingActionsCount] = useState<number>(0);
  const [failedActionsCount, setFailedActionsCount] = useState<number>(0);
  const [conflictActionsCount, setConflictActionsCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    // 1. Subscribe to network changes
    const unsubscribeNetwork = networkService.addListener((state: { isConnected: boolean; isInternetReachable: boolean; type: string }) => {
      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable);
      setConnectionType(state.type);
    });

    // 2. Subscribe to queue count changes
    const unsubscribeQueue = offlineQueue.addListener((queueState: { pendingCount: number; failedCount?: number; conflictCount?: number; isSyncing?: boolean }) => {
      setPendingActionsCount(queueState.pendingCount || 0);
      if (typeof queueState.failedCount === 'number') {
        setFailedActionsCount(queueState.failedCount);
      }
      if (typeof queueState.conflictCount === 'number') {
        setConflictActionsCount(queueState.conflictCount);
      }
      if (typeof queueState.isSyncing === 'boolean') {
        setIsSyncing(queueState.isSyncing);
      }
    });

    // Initial diagnostics
    offlineQueue.getDiagnostics().then((diag) => {
      setPendingActionsCount(diag.pending);
      setFailedActionsCount(diag.failed);
      setConflictActionsCount(diag.conflict);
      setIsSyncing(diag.isSyncing);
    }).catch(() => {});

    return () => {
      unsubscribeNetwork();
      unsubscribeQueue();
    };
  }, []);

  const triggerSync = async () => {
    return await offlineQueue.syncNow();
  };

  return (
    <NetworkContext.Provider
      value={{
        isConnected,
        isInternetReachable,
        connectionType,
        pendingActionsCount,
        failedActionsCount,
        conflictActionsCount,
        isSyncing,
        triggerSync,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};
