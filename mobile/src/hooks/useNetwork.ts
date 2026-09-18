import { useContext } from 'react';
import { NetworkContext, NetworkContextValue } from '../context/NetworkContext';

export const useNetwork = (): NetworkContextValue => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

export default useNetwork;
