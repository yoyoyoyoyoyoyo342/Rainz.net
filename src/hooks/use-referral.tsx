import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './use-auth';
import * as amplitude from '@amplitude/unified';

const REFERRAL_POINTS = 50; // Points for both referrer and referee

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function useReferral() {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralStats, setReferralStats] = useState({ totalReferred: 0, pointsEarned: 0 });
  const [loading, setLoading] = useState(false);

  // Get or create referral code for current user
  useEffect(() => {
    if (!user) return;

    const fetchOrCreate = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', user.id)
        .single();

      if (profile?.referral_code) {
        setReferralCode(profile.referral_code);
      } else {
        const code = generateCode();
        await supabase
          .from('profiles')
          .update({ referral_code: code })
          .eq('user_id', user.id);
        setReferralCode(code);
      }
    };

    fetchOrCreate();
  }, [user]);

  // Fetch referral stats
  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const { data, count } = await supabase
        .from('referrals')
        .select('*', { count: 'exact' })
        .eq('referrer_id', user.id);

      const awarded = (data || []).filter(r => r.points_awarded).length;
      setReferralStats({
        totalReferred: count || 0,
        pointsEarned: awarded * REFERRAL_POINTS,
      });
    };

    fetchStats();
  }, [user]);

  const getReferralLink = useCallback(() => {
    if (!referralCode) return '';
    return `https://rainz.net/?ref=${referralCode}`;
  }, [referralCode]);

  const shareReferralLink = useCallback(async () => {
    const link = getReferralLink();
    if (!link) return;

    amplitude.track('referral_link_shared', { referral_code: referralCode });

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Rainz',
          text: 'Check out Rainz for weather predictions, competitions, and more!',
          url: link,
        });
        return;
      } catch {}
    }

    await navigator.clipboard.writeText(link);
  }, [getReferralLink, referralCode]);

  // Process a referral signup (called from Auth page)
  const processReferral = useCallback(async (refCode: string, newUserId: string) => {
    if (!refCode || !newUserId) return;
    setLoading(true);

    try {
      // Find the referrer by code
      const { data: referrerProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('referral_code', refCode)
        .single();

      if (!referrerProfile || referrerProfile.user_id === newUserId) return;

      // Create referral record
      const { error } = await supabase.from('referrals').insert({
        referrer_id: referrerProfile.user_id,
        referee_id: newUserId,
        referral_code: refCode,
      });

      if (error) {
        console.log('Referral already recorded or error:', error.message);
        return;
      }

      amplitude.track('referral_signup_completed', {
        referral_code: refCode,
        referrer_id: referrerProfile.user_id,
        referee_id: newUserId,
      });

      // Award points to both users
      await supabase.rpc('handle_new_user' as any); // trigger already handles profile creation

      // Award referrer
      await supabase
        .from('profiles')
        .update({ shop_points: (referrerProfile as any).shop_points + REFERRAL_POINTS })
        .eq('user_id', referrerProfile.user_id);

      // Award referee  
      await supabase
        .from('profiles')
        .update({ shop_points: REFERRAL_POINTS })
        .eq('user_id', newUserId);

      // Mark as awarded
      await supabase
        .from('referrals')
        .update({ points_awarded: true })
        .eq('referee_id', newUserId);

    } catch (err) {
      console.error('Error processing referral:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    referralCode,
    referralLink: getReferralLink(),
    referralStats,
    shareReferralLink,
    processReferral,
    loading,
  };
}
