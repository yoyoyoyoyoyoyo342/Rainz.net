import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useAuth } from './use-auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Rainz+ product info
export const RAINZ_PLUS = {
  product_id: "prod_TdzVEL9ACxncTQ",
  price_id: "price_1SghW18mRhH1c6KOK1yEPelt",
  name: "Rainz+",
  price: "€2",
  interval: "month",
};

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

// Cache subscription check result to avoid repeated API calls
const subscriptionCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute cache

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [grantReason, setGrantReason] = useState<string | null>(null);
  const checkInProgress = useRef(false);

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token || !user?.id) {
      setIsSubscribed(false);
      setSubscriptionEnd(null);
      setProductId(null);
      setGrantReason(null);
      setIsLoading(false);
      return;
    }

    // Check cache first
    const cached = subscriptionCache.get(user.id);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setIsSubscribed(cached.data.subscribed ?? false);
      setSubscriptionEnd(cached.data.subscription_end ?? null);
      setProductId(cached.data.product_id ?? null);
      setGrantReason(cached.data.grant_reason ?? null);
      setIsLoading(false);
      return;
    }

    // Prevent concurrent checks
    if (checkInProgress.current) return;
    checkInProgress.current = true;

    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        setIsSubscribed(false);
        return;
      }

      // Cache the result
      subscriptionCache.set(user.id, { data, timestamp: Date.now() });

      setIsSubscribed(data?.subscribed ?? false);
      setSubscriptionEnd(data?.subscription_end ?? null);
      setProductId(data?.product_id ?? null);
      setGrantReason(data?.grant_reason ?? null);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
      checkInProgress.current = false;
    }
  }, [session?.access_token, user?.id]);

  const openCheckout = useCallback(async () => {
    if (!session?.access_token) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to subscribe to Rainz+.',
        variant: 'destructive',
      });
      throw new Error('No active session');
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        toast({
          title: 'Checkout failed',
          description: error.message || 'Unable to start checkout. Please try again.',
          variant: 'destructive',
        });
        throw new Error(error.message);
      }

      if (!data?.url) {
        toast({
          title: 'Checkout unavailable',
          description: 'No checkout link was returned. Please try again.',
          variant: 'destructive',
        });
        throw new Error('No checkout URL returned');
      }

      window.location.href = data.url;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error opening checkout:', error);
      toast({
        title: 'Could not open checkout',
        description: message || 'Please try again in a moment.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [session?.access_token, toast]);

  const openPortal = useCallback(async () => {
    if (!session?.access_token) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to manage your subscription.',
        variant: 'destructive',
      });
      throw new Error('No active session');
    }

    try {
      toast({
        title: 'Opening subscription portal...',
        description: 'Please wait while we redirect you to Stripe.',
      });
      
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error creating portal session:', error);
        toast({
          title: 'Portal unavailable',
          description: error.message || 'Unable to open the customer portal. Please try again.',
          variant: 'destructive',
        });
        throw new Error(error.message);
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: 'Portal unavailable',
          description: 'No portal URL was returned. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      throw error;
    }
  }, [session?.access_token, toast]);

  // Check subscription on auth change
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Periodic refresh every 5 minutes (reduced from 1 minute for performance)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      // Clear cache and recheck
      subscriptionCache.delete(user.id);
      checkSubscription();
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        isSubscribed,
        isLoading,
        subscriptionEnd,
        productId,
        grantReason,
        checkSubscription,
        openCheckout,
        openPortal,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
