import React, { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { globalLoadingManager } from '../services/loadingManager';

type LoadingContextValue = {
  isLoading: boolean;
  activeCount: number;
};

const LoadingContext = createContext<LoadingContextValue | null>(null);

const subscribe = (onStoreChange: () => void) => {
  return globalLoadingManager.subscribe(() => onStoreChange());
};

const getSnapshot = () => globalLoadingManager.getCount();

export const LoadingProvider = ({ children }: { children: React.ReactNode }) => {
  const activeCount = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const value = useMemo(
    () => ({
      isLoading: activeCount > 0,
      activeCount,
    }),
    [activeCount],
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
      <LoadingOverlay isLoading={value.isLoading} />
    </LoadingContext.Provider>
  );
};

export const useGlobalLoading = () => {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error('useGlobalLoading must be used within LoadingProvider');
  return ctx;
};
