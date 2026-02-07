import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { calendarId } = await req.json();
    if (!calendarId) {
      throw new Error('Calendar ID required');
    }

    // Get the calendar day info
    const { data: calendarDay, error: calendarError } = await supabase
      .from('christmas_calendar')
      .select('*')
      .eq('id', calendarId)
      .single();

    if (calendarError || !calendarDay) {
      throw new Error('Invalid calendar day');
    }

    // Check if today is the unlock date or later
    const today = new Date().toISOString().split('T')[0];
    if (today < calendarDay.unlock_date) {
      throw new Error(`This reward unlocks on ${calendarDay.unlock_date}`);
    }

    // Check if already claimed
    const { data: existingClaim } = await supabase
      .from('christmas_claims')
      .select('id')
      .eq('user_id', user.id)
      .eq('calendar_id', calendarId)
      .single();

    if (existingClaim) {
      throw new Error('You have already claimed this reward');
    }

    // Create the claim
    const { error: claimError } = await supabase
      .from('christmas_claims')
      .insert({
        user_id: user.id,
        calendar_id: calendarId,
      });

    if (claimError) {
      console.error('Claim error:', claimError);
      throw new Error('Failed to claim reward');
    }

    // Use service role for awarding rewards
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Award the reward based on type
    const { reward_type, reward_amount } = calendarDay;
    let rewardMessage = '';

    switch (reward_type) {
      case 'shop_points':
        // Add shop points to profile
        const { data: profile } = await serviceSupabase
          .from('profiles')
          .select('shop_points')
          .eq('user_id', user.id)
          .single();
        
        await serviceSupabase
          .from('profiles')
          .update({ shop_points: (profile?.shop_points || 0) + reward_amount })
          .eq('user_id', user.id);
        
        rewardMessage = `You received ${reward_amount} Shop Points! 🎄`;
        break;

      case 'prediction_points':
        // Add prediction points to profile
        const { data: predProfile } = await serviceSupabase
          .from('profiles')
          .select('total_points')
          .eq('user_id', user.id)
          .single();
        
        await serviceSupabase
          .from('profiles')
          .update({ total_points: (predProfile?.total_points || 0) + reward_amount })
          .eq('user_id', user.id);
        
        rewardMessage = `You received ${reward_amount} Prediction Points! ⭐`;
        break;

      case 'streak_freeze':
        // Add streak freeze to inventory
        const { data: inventory } = await serviceSupabase
          .from('user_inventory')
          .select('quantity')
          .eq('user_id', user.id)
          .eq('item_type', 'streak_freeze')
          .maybeSingle();

        await serviceSupabase
          .from('user_inventory')
          .upsert({
            user_id: user.id,
            item_type: 'streak_freeze',
            quantity: (inventory?.quantity || 0) + reward_amount,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,item_type' });
        
        rewardMessage = `You received ${reward_amount} Streak Freeze! ❄️`;
        break;

      case 'double_points':
        // Add double points powerup
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry
        
        await serviceSupabase
          .from('active_powerups')
          .insert({
            user_id: user.id,
            powerup_type: 'double_points',
            uses_remaining: reward_amount,
            expires_at: expiresAt.toISOString(),
          });
        
        rewardMessage = `You received ${reward_amount}x Double Points powerup! 2️⃣`;
        break;

      case 'mystery_box':
        // Award random reward
        const mysteryRewards = [
          { type: 'shop_points', amount: 100, msg: '100 Shop Points' },
          { type: 'prediction_points', amount: 200, msg: '200 Prediction Points' },
          { type: 'streak_freeze', amount: 2, msg: '2 Streak Freezes' },
        ];
        const mystery = mysteryRewards[Math.floor(Math.random() * mysteryRewards.length)];
        
        // Recursively apply the mystery reward (simplified - just shop points for now)
        const { data: mysteryProfile } = await serviceSupabase
          .from('profiles')
          .select('shop_points, total_points')
          .eq('user_id', user.id)
          .single();

        if (mystery.type === 'shop_points') {
          await serviceSupabase
            .from('profiles')
            .update({ shop_points: (mysteryProfile?.shop_points || 0) + mystery.amount })
            .eq('user_id', user.id);
        } else if (mystery.type === 'prediction_points') {
          await serviceSupabase
            .from('profiles')
            .update({ total_points: (mysteryProfile?.total_points || 0) + mystery.amount })
            .eq('user_id', user.id);
        }
        
        rewardMessage = `Mystery Box contained: ${mystery.msg}! 🎁`;
        break;

      case 'xp_boost':
        // Add XP boost (treat as prediction points bonus)
        const { data: xpProfile } = await serviceSupabase
          .from('profiles')
          .select('total_points')
          .eq('user_id', user.id)
          .single();
        
        const xpBonus = 50 * reward_amount;
        await serviceSupabase
          .from('profiles')
          .update({ total_points: (xpProfile?.total_points || 0) + xpBonus })
          .eq('user_id', user.id);
        
        rewardMessage = `XP Boost activated! +${xpBonus} points! 🚀`;
        break;

      default:
        rewardMessage = `Reward claimed! 🎄`;
    }

    // Create notification
    await serviceSupabase.from('user_notifications').insert({
      user_id: user.id,
      type: 'christmas_reward',
      title: '🎄 Christmas Calendar Reward!',
      message: rewardMessage,
      metadata: { day: calendarDay.day_number, reward_type, reward_amount },
    });

    console.log(`User ${user.id} claimed Christmas day ${calendarDay.day_number}: ${reward_type} x${reward_amount}`);

    return new Response(
      JSON.stringify({ success: true, message: rewardMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in claim-christmas-reward:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
