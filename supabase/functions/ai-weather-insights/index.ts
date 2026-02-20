import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const groqApiKey = Deno.env.get('GROQ_API_KEY');
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const huggingFaceToken = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to call Groq API
async function callGroq(systemPrompt: string, userPrompt: string, maxTokens: number = 800): Promise<string | null> {
  if (!groqApiKey) {
    console.log('GROQ_API_KEY not configured, skipping Groq');
    return null;
  }

  try {
    console.log('Calling Groq API...');
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      if (response.status === 429) {
        console.log('Groq rate limited, will try fallback');
        return null;
      }
      throw new Error(`Groq API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    console.log('Groq response received successfully');
    return content || null;
  } catch (error) {
    console.error('Groq call failed:', error);
    return null;
  }
}

// Helper function to call Hugging Face Inference API - Mixtral (free backup #1)
async function callHuggingFaceMixtral(systemPrompt: string, userPrompt: string, maxTokens: number = 800): Promise<string | null> {
  if (!huggingFaceToken) {
    console.log('HUGGING_FACE_ACCESS_TOKEN not configured, skipping HuggingFace');
    return null;
  }

  try {
    console.log('Calling Hugging Face Mixtral API...');
    const response = await fetch('https://router.huggingface.co/hf-inference/models/mistralai/Mixtral-8x7B-Instruct-v0.1', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${huggingFaceToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: `<s>[INST] ${systemPrompt}\n\n${userPrompt} [/INST]`,
        parameters: {
          max_new_tokens: maxTokens,
          temperature: 0.7,
          return_full_text: false,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hugging Face Mixtral error:', response.status, errorText);
      return null;
    }

    const result = await response.json();
    const content = Array.isArray(result) ? result[0]?.generated_text : result?.generated_text;
    console.log('Hugging Face Mixtral response received');
    return content || null;
  } catch (error) {
    console.error('Hugging Face Mixtral call failed:', error);
    return null;
  }
}

// Helper function to call Hugging Face - Llama 3.1 (free backup #2)
async function callHuggingFaceLlama(systemPrompt: string, userPrompt: string, maxTokens: number = 800): Promise<string | null> {
  if (!huggingFaceToken) {
    return null;
  }

  try {
    console.log('Calling Hugging Face Llama API...');
    const response = await fetch('https://router.huggingface.co/hf-inference/models/meta-llama/Llama-3.1-8B-Instruct', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${huggingFaceToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n${systemPrompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n${userPrompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>`,
        parameters: {
          max_new_tokens: maxTokens,
          temperature: 0.7,
          return_full_text: false,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hugging Face Llama error:', response.status, errorText);
      return null;
    }

    const result = await response.json();
    const content = Array.isArray(result) ? result[0]?.generated_text : result?.generated_text;
    console.log('Hugging Face Llama response received');
    return content || null;
  } catch (error) {
    console.error('Hugging Face Llama call failed:', error);
    return null;
  }
}

// Helper function to call OpenAI as last fallback
async function callOpenAI(systemPrompt: string, userPrompt: string, maxTokens: number = 800): Promise<string | null> {
  if (!openAIApiKey) {
    console.log('OPENAI_API_KEY not configured, skipping OpenAI fallback');
    return null;
  }

  try {
    console.log('Calling OpenAI API as last fallback...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return null;
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    console.log('OpenAI response received successfully');
    return content || null;
  } catch (error) {
    console.error('OpenAI call failed:', error);
    return null;
  }
}

// Main LLM call: Groq -> HuggingFace Mixtral -> HuggingFace Llama -> OpenAI
async function callLLM(systemPrompt: string, userPrompt: string, maxTokens: number = 800): Promise<string> {
  // Try Groq first
  let response = await callGroq(systemPrompt, userPrompt, maxTokens);
  
  // If Groq fails, try Hugging Face Mixtral
  if (!response) {
    console.log('Groq failed, trying HuggingFace Mixtral...');
    response = await callHuggingFaceMixtral(systemPrompt, userPrompt, maxTokens);
  }
  
  // If Mixtral fails, try Hugging Face Llama
  if (!response) {
    console.log('Mixtral failed, trying HuggingFace Llama...');
    response = await callHuggingFaceLlama(systemPrompt, userPrompt, maxTokens);
  }
  
  // If all HuggingFace models fail, try OpenAI as last resort
  if (!response) {
    console.log('HuggingFace failed, trying OpenAI as last resort...');
    response = await callOpenAI(systemPrompt, userPrompt, maxTokens);
  }
  
  if (!response) {
    throw new Error('All LLM providers failed (Groq, HuggingFace Mixtral, HuggingFace Llama, OpenAI)');
  }
  
  return response;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let type = ''; // Define outside try block for error handling
  
  try {
    const requestData = await req.json();
    type = requestData.type;
    const { message, weatherData, location, isImperial, conversationHistory, userRoutines, language } = requestData;

    if (!groqApiKey && !openAIApiKey) {
      throw new Error('No LLM API keys configured (GROQ_API_KEY or OPENAI_API_KEY)');
    }

    console.log('AI Weather Insights request:', { type, location, hasWeatherData: !!weatherData, language, usingGroq: !!groqApiKey });

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'proactive_insights') {
      // Convert temperatures if user prefers Celsius
      const temp = isImperial ? weatherData.currentWeather.temperature : Math.round((weatherData.currentWeather.temperature - 32) * 5/9);
      const feelsLike = isImperial ? weatherData.currentWeather.feelsLike : Math.round((weatherData.currentWeather.feelsLike - 32) * 5/9);
      const condition = weatherData.currentWeather.condition;
      const humidity = weatherData.currentWeather.humidity;
      const windSpeed = isImperial ? weatherData.currentWeather.windSpeed : Math.round(weatherData.currentWeather.windSpeed * 1.60934);
      const uvIndex = weatherData.currentWeather.uvIndex;
      const visibility = isImperial ? weatherData.currentWeather.visibility : Math.round(weatherData.currentWeather.visibility * 1.60934);
      const pressure = weatherData.currentWeather.pressure;
      
      systemPrompt = `You are an AI Weather Companion that provides personalized, actionable weather insights. You analyze real weather data and provide 3-5 specific, practical recommendations that help users make informed decisions about their day.

Key Guidelines:
- Focus on actionable advice (what to wear, when to travel, activities to plan/avoid)
- Consider comfort, safety, and optimization of daily activities
- Be concise but specific (each insight should be 15-25 words)
- Include relevant emojis for visual appeal
- Consider both immediate and near-future conditions
- Use ${isImperial ? 'Fahrenheit and mph' : 'Celsius and km/h'} units
- Be specific about timing and conditions
${userRoutines && userRoutines.length > 0 ? `
- IMPORTANT: Tailor advice to the user's daily routines:
${userRoutines.filter((r: any) => r?.days_of_week).map((r: any) => `  * ${r.name || 'Routine'} at ${r.time || 'unspecified time'} on ${(r.days_of_week || []).join(', ')} - ${r.activity_type || 'general'} activity`).join('\n')}
- Consider which routines happen today and provide weather-specific advice for them` : ''}

Current Weather in ${location}:
- Temperature: ${temp}°${isImperial ? 'F' : 'C'} (feels like ${feelsLike}°${isImperial ? 'F' : 'C'})
- Condition: ${condition}
- Humidity: ${humidity}%
- Wind Speed: ${windSpeed} ${isImperial ? 'mph' : 'km/h'}
- UV Index: ${uvIndex}/10
- Visibility: ${visibility} ${isImperial ? 'miles' : 'km'}
- Pressure: ${pressure} hPa`;

      userPrompt = `Based on the current weather in ${location}, generate 3-5 specific, actionable insights. Focus on what the user should do RIGHT NOW based on these conditions. Return ONLY a JSON array of strings.

Current conditions to consider:
- Temperature: ${temp}°${isImperial ? 'F' : 'C'} (feels like ${feelsLike}°${isImperial ? 'F' : 'C'})
- Weather: ${condition}
- Humidity: ${humidity}%
- Wind: ${windSpeed} ${isImperial ? 'mph' : 'km/h'}
- UV Index: ${uvIndex}/10

Examples of good insights:
- "🧥 Feels ${feelsLike}°${isImperial ? 'F' : 'C'} - grab a light jacket for comfort!"
- "☀️ UV ${uvIndex}/10 - apply SPF 30+ for outdoor activities"
- "💨 Winds at ${windSpeed} ${isImperial ? 'mph' : 'km/h'} - secure loose items if heading out"
- "💧 ${humidity}% humidity - stay hydrated and dress breathable"
- "👁️ Visibility ${visibility} ${isImperial ? 'miles' : 'km'} - drive carefully if conditions are poor"`;

    } else if (type === 'morning_review') {
      // Morning briefing - comprehensive start-of-day summary
      const temp = isImperial ? weatherData.currentWeather.temperature : Math.round((weatherData.currentWeather.temperature - 32) * 5/9);
      const feelsLike = isImperial ? weatherData.currentWeather.feelsLike : Math.round((weatherData.currentWeather.feelsLike - 32) * 5/9);
      const condition = weatherData.currentWeather.condition;
      const humidity = weatherData.currentWeather.humidity;
      const windSpeed = isImperial ? weatherData.currentWeather.windSpeed : Math.round(weatherData.currentWeather.windSpeed * 1.60934);
      const uvIndex = weatherData.currentWeather.uvIndex;
      
      // Get high pollen types
      const pollenData = weatherData.currentWeather?.pollenData || {};
      const highPollens = Object.entries(pollenData)
        .filter(([_, value]) => value > 6)
        .map(([type]) => type);

      // Extract hourly forecast for the whole day to make consistent clothing recommendations
      const hourlyForecast = weatherData.hourlyForecast?.slice(0, 24) || [];
      const dailyTemps = hourlyForecast.map((h: any) => {
        const t = h.temperature || h.temp || 0;
        return isImperial ? t : Math.round((t - 32) * 5/9);
      });
      const dailyConditions = hourlyForecast.map((h: any) => h.condition || 'Unknown');
      const hasRain = dailyConditions.some((c: string) => c.toLowerCase().includes('rain') || c.toLowerCase().includes('shower') || c.toLowerCase().includes('drizzle'));
      const hasClouds = dailyConditions.some((c: string) => c.toLowerCase().includes('cloud') || c.toLowerCase().includes('overcast'));
      const minTemp = dailyTemps.length > 0 ? Math.min(...dailyTemps) : temp;
      const maxTemp = dailyTemps.length > 0 ? Math.max(...dailyTemps) : temp;

      // Map language codes to language names for AI prompt
      const languageMap: Record<string, string> = {
        'en-GB': 'British English',
        'en-US': 'American English',
        'da': 'Danish',
        'sv': 'Swedish',
        'no': 'Norwegian',
        'fr': 'French',
        'it': 'Italian'
      };
      const targetLanguage = languageMap[language] || 'English';

      systemPrompt = `You are creating a personalized morning weather briefing. Provide a warm, helpful summary that helps the user plan their ENTIRE day.

CRITICAL: You MUST respond in ${targetLanguage}. All text in your response must be in ${targetLanguage}, including the greeting, weather description, clothing suggestions, and activity recommendations.

IMPORTANT: Base your outfit recommendations on the FULL DAY forecast, not just the morning. Consider the temperature range throughout the day.

Current Weather in ${location}:
- Current Temperature: ${temp}°${isImperial ? 'F' : 'C'} (feels like ${feelsLike}°${isImperial ? 'F' : 'C'})
- Current Condition: ${condition}
- Humidity: ${humidity}%
- Wind: ${windSpeed} ${isImperial ? 'mph' : 'km/h'}
- UV Index: ${uvIndex}/10
${highPollens.length > 0 ? `- High Pollen: ${highPollens.join(', ')}` : ''}

Full Day Forecast:
- Temperature Range: ${minTemp}°${isImperial ? 'F' : 'C'} to ${maxTemp}°${isImperial ? 'F' : 'C'}
- Rain Expected Today: ${hasRain ? 'Yes - bring umbrella/rain jacket' : 'No'}
- Cloudy Periods: ${hasClouds ? 'Yes' : 'No'}

Return ONLY a JSON object (no markdown code blocks) with these fields:
{
  "summary": "A warm 2-sentence greeting with weather overview mentioning temp range",
  "outfit": "VERY SPECIFIC clothing items list that works for the FULL DAY temperature range (${minTemp}° to ${maxTemp}°). Include layers if temp varies significantly. ${hasRain ? 'MUST include rain protection (umbrella or rain jacket).' : ''} Never say just 'dress appropriately'. Always list actual clothing items.",
  "pollenAlerts": ["Array of specific pollen warnings if any high levels detected"],
  "activityRecommendation": "SPECIFIC activity suggestions based on FULL DAY weather analysis. Consider when it will be warmest/coolest. ${hasRain ? 'Account for rain timing.' : ''}",
  "keyInsight": "One important thing to remember for the day based on full forecast"
}`;

      userPrompt = `Create a morning briefing for ${location}. Be warm, specific, and actionable. 

CRITICAL REQUIREMENTS:
1. LANGUAGE: You MUST write the ENTIRE response in ${targetLanguage}. Every single word must be in ${targetLanguage}.
2. For "outfit": Consider the FULL DAY temperature range of ${minTemp}° to ${maxTemp}°${isImperial ? 'F' : 'C'}. List SPECIFIC clothing items that work for the entire day. ${hasRain ? 'MUST include umbrella or rain jacket!' : ''} Include layers if there's a significant temperature swing. NEVER say "dress appropriately" or generic advice.
3. For "activityRecommendation": Analyze the FULL DAY weather and suggest SPECIFIC activities with optimal timing in ${targetLanguage}. Consider when temps are best for outdoor activities.
4. IMPORTANT: Return ONLY pure JSON. Do NOT wrap the response in markdown code blocks. Do NOT include \`\`\`json or \`\`\`. Just return the raw JSON object.

Weather summary: Current ${temp}°, ranging from ${minTemp}° to ${maxTemp}° throughout the day. ${hasRain ? 'Rain expected.' : ''} ${condition} conditions. ${highPollens.length > 0 ? 'High pollen levels.' : ''}`;

    } else if (type === 'chat') {
      // Convert temperatures and units for chat context
      const chatTemp = isImperial ? weatherData.currentWeather.temperature : Math.round((weatherData.currentWeather.temperature - 32) * 5/9);
      const chatFeelsLike = isImperial ? weatherData.currentWeather.feelsLike : Math.round((weatherData.currentWeather.feelsLike - 32) * 5/9);
      const chatWindSpeed = isImperial ? weatherData.currentWeather.windSpeed : Math.round(weatherData.currentWeather.windSpeed * 1.60934);
      const chatVisibility = isImperial ? weatherData.currentWeather.visibility : Math.round(weatherData.currentWeather.visibility * 1.60934);
      
      systemPrompt = `You are PAI (Personal AI), an AI Weather Companion - friendly, knowledgeable, and helpful. You specialize in weather-related conversations and provide personalized advice based on current conditions.

Current Weather Context for ${location}:
- Temperature: ${chatTemp}°${isImperial ? 'F' : 'C'} (feels like ${chatFeelsLike}°${isImperial ? 'F' : 'C'})
- Condition: ${weatherData.currentWeather.condition}
- Humidity: ${weatherData.currentWeather.humidity}%
- Wind: ${chatWindSpeed} ${isImperial ? 'mph' : 'km/h'}
- UV Index: ${weatherData.currentWeather.uvIndex}
- Visibility: ${chatVisibility} ${isImperial ? 'miles' : 'km'}
${userRoutines && userRoutines.length > 0 ? `
User's Daily Routines:
${userRoutines.filter((r: any) => r?.days_of_week).map((r: any) => `- ${r.name || 'Routine'} at ${r.time || 'unspecified time'} on ${(r.days_of_week || []).join(', ')} (${r.activity_type || 'general'} activity)`).join('\n')}
Consider these routines when providing weather advice.` : ''}

Guidelines:
- Be conversational and helpful
- Provide specific, actionable advice
- Reference current weather conditions when relevant
- Consider the user's routines and tailor advice accordingly
- Use emojis appropriately
- If asked about non-weather topics, gently redirect to weather
- Consider user's location and current conditions in all responses

Recent conversation context: ${conversationHistory?.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n') || 'None'}`;

      userPrompt = message;
    } else if (type === 'support_chat') {
      // Support chat for Rainz app help
      systemPrompt = `You are the Rainz Support Assistant, a helpful AI that assists users with the Rainz weather app. You should be friendly, concise, and helpful.

You can help with:
- How to use Rainz features (weather predictions, games, leaderboards, morning review, etc.)
- Understanding weather data and what it means
- Troubleshooting common issues
- General weather-related questions

Key Rainz features (all free for everyone):
- AI Morning Review with personalized outfit and activity recommendations
- AI Weather Chat (PAI) for real-time weather assistance
- Offline weather caching
- Animated weather backgrounds
- Compact mode and customization options
- Enhanced weather data with AI processing
- Weather predictions, battles, and leaderboards

Guidelines:
- Be concise and helpful (keep responses under 100 words when possible)
- Use friendly, casual language
- Provide specific, actionable answers
- All features are completely free — no paid tiers exist
- If you don't know something, suggest using the feedback form
- Don't make up features that don't exist

Recent conversation:
${conversationHistory?.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n') || 'None'}`;

      userPrompt = message;
    }

    // Call LLM (Groq primary, OpenAI fallback)
    console.log('Calling LLM for type:', type);
    const aiResponse = await callLLM(systemPrompt, userPrompt, type === 'proactive_insights' ? 300 : 800);
    
    console.log('LLM response:', aiResponse.substring(0, 150) + '...');

    if (type === 'morning_review') {
      try {
        // Strip markdown code blocks if present
        let cleanResponse = aiResponse.trim();
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }
        
        console.log('Cleaned response:', cleanResponse.substring(0, 100) + '...');
        
        const review = JSON.parse(cleanResponse);
        return new Response(JSON.stringify({ review }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (parseError) {
        console.error('Failed to parse morning review:', parseError);
        console.error('Raw AI response:', aiResponse);
        // Return a basic structure if parsing fails
        return new Response(JSON.stringify({ 
          review: {
            summary: "Good morning! Check the weather details below for your day.",
            outfit: "Warm jacket, long sleeves, comfortable trousers, and sturdy shoes for the current temperature.",
            pollenAlerts: [],
            activityRecommendation: "Check the hourly forecast and plan outdoor activities during the warmest parts of the day.",
            keyInsight: "Stay weather-aware and dress in layers for comfort!"
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else if (type === 'proactive_insights') {
      try {
        // Try to parse as JSON array
        const insights = JSON.parse(aiResponse);
        return new Response(JSON.stringify({ insights }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch {
        // If parsing fails, split by lines and clean up
        const insights = aiResponse
          .split('\n')
          .filter(line => line.trim() && !line.includes('```'))
          .map(line => line.replace(/^[-*]\s*/, '').trim())
          .filter(line => line.length > 10)
          .slice(0, 5);

        return new Response(JSON.stringify({ insights }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // For chat responses, try to extract any recommendations
      const recommendations = [];
      const lines = aiResponse.split('\n');
      
      for (const line of lines) {
        if (line.includes('💡') || line.includes('🔥') || line.includes('⚡') || 
            line.toLowerCase().includes('tip') || line.toLowerCase().includes('recommend')) {
          recommendations.push(line.trim());
        }
      }

      return new Response(JSON.stringify({ 
        response: aiResponse,
        recommendations: recommendations.slice(0, 3)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in ai-weather-insights function:', error);
    return new Response(JSON.stringify({ 
      error: "Unable to generate weather insights. Please try again.",
      fallback: type === 'proactive_insights' ? 
        ["Check the weather before heading out today!", "Stay hydrated and dress appropriately for the conditions"] :
        "I'm having trouble connecting right now, but I'm here to help with weather insights!"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
