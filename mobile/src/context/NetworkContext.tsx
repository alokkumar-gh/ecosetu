import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { networkService } from '../services/networkService';
import { offlineQueue } from '../services/offlineQueue';

export interface NetworkContextValue {
  isConnected: boolean;
  isInternetReachable: boolean;
  connectionType: string;
  pendingActionsCount: number;
  triggerSync: () => Promise<void>;
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

  useEffect(() => {
    // 1. Subscribe to network changes
    const unsubscribeNetwork = networkService.addListener((state: { isConnected: boolean; isInternetReachable: boolean; type: string }) => {
      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable);
      setConnectionType(state.type);
    });

    // 2. Subscribe to queue count changes
    const unsubscribeQueue = offlineQueue.addListener((queueState: { pendingCount: number }) => {
      setPendingActionsCount(queueState.pendingCount);
    });

    // Initial count
    offlineQueue.getPendingCount().then((count: number) => {
      setPendingActionsCount(count);
    });

    return () => {
      unsubscribeNetwork();
      unsubscribeQueue();
    };
  }, []);

  const triggerSync = async () => {
    await offlineQueue.sync();
  };

  return (
    <NetworkContext.Provider
      value={{
        isConnected,
        isInternetReachable,
        connectionType,
        pendingActionsCount,
        triggerSync,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};
