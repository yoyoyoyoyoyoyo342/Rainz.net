import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fetch LLM-processed weather data for a location and date
async function fetchLLMWeatherData(lat: number, lon: number, date: string) {
  try {
    // Fetch raw weather data from Open-Meteo in CELSIUS (users predict in Celsius)
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&start_date=${date}&end_date=${date}&temperature_unit=celsius&timezone=auto`;
    const weatherResponse = await fetch(weatherUrl);
    const weatherData = await weatherResponse.json();

    if (!weatherData.daily || !weatherData.daily.temperature_2m_max) {
      console.log(`No weather data available for ${date}`);
      return null;
    }

    const rawActualHigh = Math.round(weatherData.daily.temperature_2m_max[0]);
    const rawActualLow = Math.round(weatherData.daily.temperature_2m_min[0]);
    const rawWeatherCode = weatherData.daily.weathercode[0];
    const rawCondition = mapWeatherCodeToCondition(rawWeatherCode);

    console.log(`Fetched actual weather for ${date}: High=${rawActualHigh}°C, Low=${rawActualLow}°C, Condition=${rawCondition}`);

    return { actualHigh: rawActualHigh, actualLow: rawActualLow, actualCondition: rawCondition };
  } catch (error) {
    console.error("Error fetching weather data:", error);
    return null;
  }
}

// Normalize user's predicted condition to match the 5 basic API conditions
// This ensures fair comparison since API only returns: sunny, partly-cloudy, cloudy, rainy, snowy
function normalizePredictedCondition(condition: string): string {
  const c = condition.toLowerCase();
  
  // Sunny conditions
  if (c === 'sunny' || c === 'clear') return 'sunny';
  
  // Partly cloudy
  if (c === 'partly-cloudy') return 'partly-cloudy';
  
  // Cloudy conditions (overcast, foggy, windy map to cloudy)
  if (c === 'cloudy' || c === 'overcast' || c === 'foggy' || c === 'windy') return 'cloudy';
  
  // Rainy conditions (drizzle, rain, heavy-rain, thunderstorm all map to rainy)
  if (c === 'rainy' || c === 'drizzle' || c === 'heavy-rain' || c === 'thunderstorm') return 'rainy';
  
  // Snowy conditions (snow, heavy-snow, sleet all map to snowy)
  if (c === 'snowy' || c === 'heavy-snow' || c === 'sleet') return 'snowy';
  
  return 'cloudy'; // Default fallback
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

    // Check if current time is 10 PM CET (21:00 UTC in winter, 20:00 UTC in summer)
    const now = new Date();
    const cetHour = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" })).getHours();
    
    // Only run at 10 PM CET (22:00 in Europe/Paris timezone)
    // Allow a 30-minute window (21:45 - 22:15) for cron job timing flexibility
    if (cetHour !== 22 && cetHour !== 21) {
      console.log(`Current CET hour is ${cetHour}, waiting for 22:00 CET to verify predictions`);
      return new Response(
        JSON.stringify({ message: 'Not yet 10 PM CET, skipping verification', currentCetHour: cetHour }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get today's date (we verify predictions for today at 10 PM, using actual day's data)
    const today = now.toISOString().split('T')[0];

    console.log(`Verifying predictions for date: ${today} at 10 PM CET`);

    // Get all unverified predictions for today that were explicitly created by users
    // We verify at end of day (10 PM CET) with actual weather data from the day
    const { data: predictions, error: fetchError } = await supabase
      .from('weather_predictions')
      .select('*')
      .eq('prediction_date', today)
      .eq('is_verified', false)
      .not('user_id', 'is', null)
      .not('predicted_high', 'is', null)
      .not('predicted_low', 'is', null)
      .not('predicted_condition', 'is', null);

    if (fetchError) {
      console.error('Error fetching predictions:', fetchError);
      throw fetchError;
    }

    if (!predictions || predictions.length === 0) {
      console.log('No valid predictions to verify for today');
      return new Response(
        JSON.stringify({ message: 'No predictions to verify', verified: 0, date: today }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${predictions.length} valid predictions to verify`);

    let verifiedCount = 0;

    // Verify each prediction using actual day's weather data
    for (const prediction of predictions) {
      try {
        // Fetch actual weather data for today (the day of the prediction)
        const llmWeather = await fetchLLMWeatherData(
          prediction.latitude, 
          prediction.longitude, 
          today
        );

        if (!llmWeather) {
          console.log(`No weather data available for prediction ${prediction.id}`);
          continue;
        }

        const actualHigh = llmWeather.actualHigh;
        const actualLow = llmWeather.actualLow;
        const actualCondition = llmWeather.actualCondition;

        // Normalize user's condition to compare fairly with API's basic conditions
        const normalizedPredictedCondition = normalizePredictedCondition(prediction.predicted_condition);
        
        // Check if prediction is correct (within 3 degrees for temps, condition categories match)
        const highAccurate = Math.abs(prediction.predicted_high - actualHigh) <= 3;
        const lowAccurate = Math.abs(prediction.predicted_low - actualLow) <= 3;
        const conditionAccurate = normalizedPredictedCondition === actualCondition;
        
        console.log(`Comparing prediction ${prediction.id}: predicted=${prediction.predicted_high}/${prediction.predicted_low}/${normalizedPredictedCondition} vs actual=${actualHigh}/${actualLow}/${actualCondition}`);
        console.log(`Results: highAccurate=${highAccurate}, lowAccurate=${lowAccurate}, conditionAccurate=${conditionAccurate}`);
        
        // Count how many parts are correct
        const correctParts = [highAccurate, lowAccurate, conditionAccurate].filter(Boolean).length;
        
        // Calculate tiered accuracy points
        let pointsEarned = 0;
        switch (correctParts) {
          case 3:
            pointsEarned = 300;  // All correct
            break;
          case 2:
            pointsEarned = 200;  // 2 correct
            break;
          case 1:
            pointsEarned = 100;  // 1 correct
            break;
          case 0:
            pointsEarned = -100; // All wrong (penalty)
            break;
        }
        
        // is_correct is true if at least 1 part is correct
        const isCorrect = correctParts >= 1;

        // Update prediction with verification
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

        // Update user's total points in profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('total_points')
          .eq('user_id', prediction.user_id)
          .single();

        // Ensure total points don't go below 0
        const newTotalPoints = Math.max(0, (profile?.total_points || 0) + pointsEarned);

        await supabase
          .from('profiles')
          .update({ total_points: newTotalPoints })
          .eq('user_id', prediction.user_id);

        // Check if this prediction is part of a battle and resolve it
        const { data: battles } = await supabase
          .from('prediction_battles')
          .select('*')
          .eq('battle_date', today)
          .eq('status', 'accepted')
          .or(`challenger_prediction_id.eq.${prediction.id},opponent_prediction_id.eq.${prediction.id}`);

        for (const battle of battles || []) {
          // Check if both predictions are now verified
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
            // If tied, no winner or loser

            // Update battle with results
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

            // Award 100 bonus points to the winner, deduct 50 from loser
            if (winnerId && loserId) {
              // Winner gets +100 points
              const { data: winnerProfile } = await supabase
                .from('profiles')
                .select('total_points')
                .eq('user_id', winnerId)
                .single();

              const newWinnerPoints = (winnerProfile?.total_points || 0) + 100;

              await supabase
                .from('profiles')
                .update({ total_points: newWinnerPoints })
                .eq('user_id', winnerId);

              // Loser gets -50 points
              const { data: loserProfile } = await supabase
                .from('profiles')
                .select('total_points')
                .eq('user_id', loserId)
                .single();

              const newLoserPoints = Math.max(0, (loserProfile?.total_points || 0) - 50);

              await supabase
                .from('profiles')
                .update({ total_points: newLoserPoints })
                .eq('user_id', loserId);

              // Notify the winner
              const { data: loserDisplayName } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('user_id', loserId)
                .maybeSingle();

              await supabase.from('user_notifications').insert({
                user_id: winnerId,
                type: 'battle_won',
                title: 'Battle Victory! 🏆',
                message: `You won the weather battle against ${loserDisplayName?.display_name || 'your opponent'}! +100 bonus points!`,
                metadata: { battle_id: battle.id, bonus_points: 100 },
              });

              // Notify the loser
              const { data: winnerProfileName } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('user_id', winnerId)
                .maybeSingle();

              await supabase.from('user_notifications').insert({
                user_id: loserId,
                type: 'battle_lost',
                title: 'Battle Ended',
                message: `${winnerProfileName?.display_name || 'Your opponent'} won the weather battle. -50 points. Better luck next time!`,
                metadata: { battle_id: battle.id, penalty_points: -50 },
              });

              console.log(`Battle ${battle.id} completed. Winner: ${winnerId} (+100 points), Loser: ${loserId} (-50 points)`);
            } else {
              // Notify both users of a tie
              await supabase.from('user_notifications').insert([
                {
                  user_id: battle.challenger_id,
                  type: 'battle_tie',
                  title: 'Battle Tied!',
                  message: 'Your weather battle ended in a tie! No bonus points awarded.',
                  metadata: { battle_id: battle.id },
                },
                {
                  user_id: battle.opponent_id,
                  type: 'battle_tie',
                  title: 'Battle Tied!',
                  message: 'Your weather battle ended in a tie! No bonus points awarded.',
                  metadata: { battle_id: battle.id },
                },
              ]);
              console.log(`Battle ${battle.id} completed with a tie.`);
            }
          }
        }

        verifiedCount++;
        console.log(`Verified prediction ${prediction.id}: ${isCorrect ? 'Correct' : 'Incorrect'} (${pointsEarned} points)`);
      } catch (error) {
        console.error(`Error processing prediction ${prediction.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Predictions verified successfully', 
        verified: verifiedCount,
        total: predictions.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in verify-predictions function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function mapWeatherCodeToCondition(code: number): string {
  if (code === 0) return 'sunny';
  if (code >= 1 && code <= 3) return 'partly-cloudy';
  if (code >= 45 && code <= 48) return 'cloudy';
  if (code >= 51 && code <= 67) return 'rainy';
  if (code >= 71 && code <= 86) return 'snowy';
  if (code >= 95) return 'rainy'; // thunderstorms as rainy
  return 'cloudy';
}