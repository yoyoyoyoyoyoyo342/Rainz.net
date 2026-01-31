import { createContext, useContext, ReactNode } from 'react';

// Subscription system removed - all features are now free
interface SubscriptionContextType {
  isSubscribed: boolean;
  isLoading: boolean;
  subscriptionEnd: string | null;
  productId: string | null;
  grantReason: string | null;
  checkSubscription: () => Promise<void>;
  openCheckout: () => Promise<void>;
  openPortal: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  // All features are now free - always return subscribed
  const value: SubscriptionContextType = {
    isSubscribed: true,
    isLoading: false,
    subscriptionEnd: null,
    productId: null,
    grantReason: 'free_for_all',
    checkSubscription: async () => {},
    openCheckout: async () => {},
    openPortal: async () => {},
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    // Return free access even without provider
    return {
      isSubscribed: true,
      isLoading: false,
      subscriptionEnd: null,
      productId: null,
      grantReason: 'free_for_all',
      checkSubscription: async () => {},
      openCheckout: async () => {},
      openPortal: async () => {},
    };
  }
  return context;
}
