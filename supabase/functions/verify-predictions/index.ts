import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fetch weather data for a location and date (works for past dates too via Open-Meteo archive)
// IMPORTANT: Always fetches in CELSIUS to match stored predictions
async function fetchWeatherData(lat: number, lon: number, date: string) {
  try {
    // Determine if date is in the past (use archive API) or today/future (use forecast API)
    const today = new Date().toISOString().split('T')[0];
    const isPast = date < today;
    
    const baseUrl = isPast 
      ? 'https://archive-api.open-meteo.com/v1/archive'
      : 'https://api.open-meteo.com/v1/forecast';
    
    const weatherUrl = `${baseUrl}?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&start_date=${date}&end_date=${date}&temperature_unit=celsius&timezone=auto`;
    const weatherResponse = await fetch(weatherUrl);
    const weatherData = await weatherResponse.json();

    if (!weatherData.daily || !weatherData.daily.temperature_2m_max) {
      console.log(`No weather data available for ${date} (isPast=${isPast})`);
      return null;
    }

    // Keep raw Celsius values (no rounding for fairer comparison)
    const actualHigh = weatherData.daily.temperature_2m_max[0];
    const actualLow = weatherData.daily.temperature_2m_min[0];
    const rawWeatherCode = weatherData.daily.weathercode[0];
    const rawCondition = mapWeatherCodeToCondition(rawWeatherCode);

    // Sanity check: if values seem like Fahrenheit (> 50°C high), log warning
    if (actualHigh > 60 || actualLow > 50) {
      console.warn(`⚠️ SANITY CHECK: Suspiciously high temps for ${date} at ${lat},${lon}: high=${actualHigh}, low=${actualLow}. Possible unit mismatch!`);
    }

    console.log(`Fetched actual weather for ${date}: High=${actualHigh}°C, Low=${actualLow}°C, Condition=${rawCondition} (source: ${isPast ? 'archive' : 'forecast'})`);

    return { actualHigh, actualLow, actualCondition: rawCondition };
  } catch (error) {
    console.error(`Error fetching weather data for ${date}:`, error);
    return null;
  }
}

// Normalize user's predicted condition to match the 5 basic API conditions
function normalizePredictedCondition(condition: string): string {
  const c = condition.toLowerCase();
  if (c === 'sunny' || c === 'clear') return 'sunny';
  if (c === 'partly-cloudy') return 'partly-cloudy';
  if (c === 'cloudy' || c === 'overcast' || c === 'foggy' || c === 'windy') return 'cloudy';
  if (c === 'rainy' || c === 'drizzle' || c === 'heavy-rain' || c === 'thunderstorm') return 'rainy';
  if (c === 'snowy' || c === 'heavy-snow' || c === 'sleet') return 'snowy';
  return 'cloudy';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    const cetHour = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" })).getHours();
    
    let forceRun = false;
    try {
      const body = await req.json();
      forceRun = body?.force === true;
    } catch {
      // No body or invalid JSON
    }
    
    console.log(`Running verification at CET hour ${cetHour}${forceRun ? ' (forced)' : ''}`);

    const today = now.toISOString().split('T')[0];

    // BACKFILL: Get ALL unverified predictions (today AND past dates)
    const { data: predictions, error: fetchError } = await supabase
      .from('weather_predictions')
      .select('*')
      .eq('is_verified', false)
      .lte('prediction_date', today)
      .not('user_id', 'is', null)
      .not('predicted_high', 'is', null)
      .not('predicted_low', 'is', null)
      .not('predicted_condition', 'is', null)
      .order('prediction_date', { ascending: true })
      .limit(200);

    if (fetchError) {
      console.error('Error fetching predictions:', fetchError);
      throw fetchError;
    }

    if (!predictions || predictions.length === 0) {
      console.log('No unverified predictions found');
      return new Response(
        JSON.stringify({ message: 'No predictions to verify', verified: 0, date: today }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group predictions by date for efficient weather fetching
    const predictionsByDate = new Map<string, typeof predictions>();
    for (const p of predictions) {
      const date = p.prediction_date;
      if (!predictionsByDate.has(date)) predictionsByDate.set(date, []);
      predictionsByDate.get(date)!.push(p);
    }

    console.log(`Found ${predictions.length} unverified predictions across ${predictionsByDate.size} dates`);

    let verifiedCount = 0;

    // Cache weather data by location+date to avoid duplicate API calls
    const weatherCache = new Map<string, Awaited<ReturnType<typeof fetchWeatherData>>>();

    for (const prediction of predictions) {
      try {
        const cacheKey = `${prediction.latitude},${prediction.longitude},${prediction.prediction_date}`;
        
        if (!weatherCache.has(cacheKey)) {
          weatherCache.set(cacheKey, await fetchWeatherData(
            prediction.latitude, prediction.longitude, prediction.prediction_date
          ));
        }
        
        const weather = weatherCache.get(cacheKey);
        if (!weather) {
          console.log(`No weather data for prediction ${prediction.id} (date: ${prediction.prediction_date})`);
          continue;
        }

        const { actualHigh, actualLow, actualCondition } = weather;
        const normalizedPredictedCondition = normalizePredictedCondition(prediction.predicted_condition);
        
        const highAccurate = Math.abs(prediction.predicted_high - actualHigh) <= 3;
        const lowAccurate = Math.abs(prediction.predicted_low - actualLow) <= 3;
        const conditionAccurate = normalizedPredictedCondition === actualCondition;
        
        console.log(`Prediction ${prediction.id} (${prediction.prediction_date}): predicted=${prediction.predicted_high}/${prediction.predicted_low}/${normalizedPredictedCondition} vs actual=${actualHigh}/${actualLow}/${actualCondition} → high=${highAccurate}, low=${lowAccurate}, cond=${conditionAccurate}`);
        
        const correctParts = [highAccurate, lowAccurate, conditionAccurate].filter(Boolean).length;
        
        // Base points
        let basePoints = 0;
        let awardBonusStreakFreeze = false;
        switch (correctParts) {
          case 3: basePoints = 300; awardBonusStreakFreeze = true; break;
          case 2: basePoints = 200; break;
          case 1: basePoints = 100; break;
          case 0: basePoints = -100; break;
        }

        // Apply confidence multiplier
        const confidenceMultiplier = prediction.confidence_multiplier || 1;
        let pointsEarned = Math.round(basePoints * confidenceMultiplier);

        // Apply powerup flags
        const powerupFlags = prediction.powerup_flags || {};
        if (powerupFlags.double_points) {
          console.log(`User ${prediction.user_id} used double points powerup`);
          pointsEarned = pointsEarned * 2;
        }
        if (pointsEarned < 0 && powerupFlags.prediction_shield) {
          console.log(`User ${prediction.user_id} used prediction shield`);
          pointsEarned = 0;
        }
        
        const isCorrect = correctParts >= 1;

        // Update prediction — the DB trigger `update_prediction_points` handles adding to profiles.total_points
        const { error: updateError } = await supabase
          .from('weather_predictions')
          .update({
            actual_high: actualHigh,
            actual_low: actualLow,
            actual_condition: actualCondition,
            is_verified: true,
            is_correct: isCorrect,
            points_earned: pointsEarned,
            updated_at: new Date().toISOString(),
          })
          .eq('id', prediction.id);

        if (updateError) {
          console.error(`Error updating prediction ${prediction.id}:`, updateError);
          continue;
        }

        // NOTE: We do NOT manually update profiles.total_points here.
        // The DB trigger `update_prediction_points` fires on is_verified change and handles it.
        // This prevents double-counting.

        // Award bonus streak freeze for perfect prediction
        if (awardBonusStreakFreeze) {
          console.log(`Awarding bonus streak freeze to user ${prediction.user_id}`);
          const { data: inventory } = await supabase
            .from('user_inventory')
            .select('quantity')
            .eq('user_id', prediction.user_id)
            .eq('item_type', 'streak_freeze')
            .maybeSingle();

          await supabase
            .from('user_inventory')
            .upsert({
              user_id: prediction.user_id,
              item_type: 'streak_freeze',
              quantity: (inventory?.quantity || 0) + 1,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,item_type' });

          await supabase.from('user_notifications').insert({
            user_id: prediction.user_id,
            type: 'perfect_prediction',
            title: '🎯 Perfect Prediction!',
            message: `All 3 correct! +${pointsEarned} points${confidenceMultiplier > 1 ? ` (${confidenceMultiplier}x confidence)` : ''} AND a free Streak Freeze!`,
            metadata: { points: pointsEarned, bonus: 'streak_freeze', confidence: confidenceMultiplier },
          });
        }

        // Resolve battles if applicable
        const { data: battles } = await supabase
          .from('prediction_battles')
          .select('*')
          .eq('battle_date', prediction.prediction_date)
          .eq('status', 'accepted')
          .or(`challenger_prediction_id.eq.${prediction.id},opponent_prediction_id.eq.${prediction.id}`);

        for (const battle of battles || []) {
          const { data: challengerPred } = await supabase
            .from('weather_predictions')
            .select('points_earned, is_verified')
            .eq('id', battle.challenger_prediction_id)
            .maybeSingle();

          const { data: opponentPred } = await supabase
            .from('weather_predictions')
            .select('points_earned, is_verified')
            .eq('id', battle.opponent_prediction_id)
            .maybeSingle();

          if (challengerPred?.is_verified && opponentPred?.is_verified) {
            const challengerScore = challengerPred.points_earned || 0;
            const opponentScore = opponentPred.points_earned || 0;
            
            let winnerId = null;
            let loserId = null;
            if (challengerScore > opponentScore) {
              winnerId = battle.challenger_id;
              loserId = battle.opponent_id;
            } else if (opponentScore > challengerScore) {
              winnerId = battle.opponent_id;
              loserId = battle.challenger_id;
            }

            await supabase
              .from('prediction_battles')
              .update({
                status: 'completed',
                challenger_score: challengerScore,
                opponent_score: opponentScore,
                winner_id: winnerId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', battle.id);

            if (winnerId && loserId) {
              // Battle bonus/penalty handled via direct profile update (not via trigger)
              const { data: winnerProfile } = await supabase
                .from('profiles').select('total_points').eq('user_id', winnerId).single();
              await supabase.from('profiles')
                .update({ total_points: (winnerProfile?.total_points || 0) + 100 })
                .eq('user_id', winnerId);

              const { data: loserProfile } = await supabase
                .from('profiles').select('total_points').eq('user_id', loserId).single();
              await supabase.from('profiles')
                .update({ total_points: Math.max(0, (loserProfile?.total_points || 0) - 50) })
                .eq('user_id', loserId);

              const { data: loserName } = await supabase
                .from('profiles').select('display_name').eq('user_id', loserId).maybeSingle();
              const { data: winnerName } = await supabase
                .from('profiles').select('display_name').eq('user_id', winnerId).maybeSingle();

              await supabase.from('user_notifications').insert([
                {
                  user_id: winnerId, type: 'battle_won', title: 'Battle Victory! 🏆',
                  message: `You won against ${loserName?.display_name || 'your opponent'}! +100 bonus points!`,
                  metadata: { battle_id: battle.id, bonus_points: 100 },
                },
                {
                  user_id: loserId, type: 'battle_lost', title: 'Battle Ended',
                  message: `${winnerName?.display_name || 'Your opponent'} won. -50 points. Better luck next time!`,
                  metadata: { battle_id: battle.id, penalty_points: -50 },
                },
              ]);
              console.log(`Battle ${battle.id} completed. Winner: ${winnerId}`);
            } else {
              await supabase.from('user_notifications').insert([
                { user_id: battle.challenger_id, type: 'battle_tie', title: 'Battle Tied!', message: 'Your weather battle ended in a tie!', metadata: { battle_id: battle.id } },
                { user_id: battle.opponent_id, type: 'battle_tie', title: 'Battle Tied!', message: 'Your weather battle ended in a tie!', metadata: { battle_id: battle.id } },
              ]);
            }
          }
        }

        verifiedCount++;
        console.log(`✅ Verified prediction ${prediction.id}: ${correctParts}/3 correct, ${pointsEarned} points (confidence: ${confidenceMultiplier}x)`);
      } catch (error) {
        console.error(`Error processing prediction ${prediction.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Predictions verified successfully', 
        verified: verifiedCount,
        total: predictions.length,
        dates: [...predictionsByDate.keys()],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in verify-predictions function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function mapWeatherCodeToCondition(code: number): string {
  if (code === 0) return 'sunny';
  if (code >= 1 && code <= 3) return 'partly-cloudy';
  if (code >= 45 && code <= 48) return 'cloudy';
  if (code >= 51 && code <= 67) return 'rainy';
  if (code >= 71 && code <= 86) return 'snowy';
  if (code >= 95) return 'rainy';
  return 'cloudy';
}
