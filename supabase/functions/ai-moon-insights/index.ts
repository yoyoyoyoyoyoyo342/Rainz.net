import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const groqApiKey = Deno.env.get('GROQ_API_KEY');
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callGroq(systemPrompt: string, userPrompt: string): Promise<string | null> {
  if (!groqApiKey) return null;

  try {
    console.log('Calling Groq API for moon insights...');
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
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('Groq API error:', response.status);
      return null;
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error('Groq call failed:', error);
    return null;
  }
}

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string | null> {
  if (!openAIApiKey) return null;

  try {
    console.log('Calling OpenAI API for moon insights...');
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
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      return null;
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error('OpenAI call failed:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { moonPhase, moonIllumination, latitude, longitude, moonrise, moonset, sunrise, sunset } = await req.json();

    console.log('AI Moon Insights request:', { moonPhase, moonIllumination, latitude, longitude, moonrise, moonset });

    // Calculate current date and time info for accurate insights
    const now = new Date();
    const currentHour = now.getHours();
    const isNight = currentHour < 6 || currentHour > 20;
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    
    // Calculate moon visibility window
    const moonVisibleHours = moonrise && moonset ? 
      `Moon rises at ${moonrise} and sets at ${moonset}` : 
      'Moon visibility times not available';

    const systemPrompt = `You are an expert lunar astronomer and lifestyle advisor. You provide SPECIFIC, DATA-DRIVEN insights about the moon based on REAL astronomical data provided.

CRITICAL: Use the EXACT data provided. Do not make up values. Reference specific times, illumination percentages, and phase details accurately.

Generate 5 unique, highly specific insights based on the REAL moon data below. Each insight must:
1. Reference actual data (illumination %, rise/set times, phase name)
2. Give specific, actionable advice for TODAY
3. Be accurate to the current phase and timing

Categories:
1. 📷 Photography/Stargazing - MUST mention actual illumination % and visibility window
2. 🌱 Gardening/Nature - Phase-specific planting/harvesting advice  
3. 😴 Sleep & Wellness - How tonight's specific moon affects rest
4. 🏃 Outdoor Activities - Best times based on actual moonrise/set
5. ✨ Cultural/Folklore - Phase-specific traditions

Return ONLY a valid JSON array (no markdown, no code blocks):
[{"title": "Title", "description": "Specific insight with real data (max 30 words)", "icon": "emoji"}]`;

    const userPrompt = `REAL MOON DATA FOR ${dateStr}:
- Phase: ${moonPhase || 'Unknown'}
- Illumination: ${moonIllumination || 50}% (this is the actual percentage of moon's surface lit)
- Moonrise: ${moonrise || 'N/A'}
- Moonset: ${moonset || 'N/A'}
- Sunrise: ${sunrise || 'N/A'}
- Sunset: ${sunset || 'N/A'}
- Location: ${latitude?.toFixed(2) || 'N/A'}°, ${longitude?.toFixed(2) || 'N/A'}°
- Current time: ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
- ${isNight ? 'Currently nighttime' : 'Currently daytime'}

Generate 5 insights using THIS EXACT DATA. Reference the actual ${moonIllumination || 50}% illumination and ${moonPhase || 'current'} phase in your responses.`;

    // Try Groq first, then OpenAI
    let response = await callGroq(systemPrompt, userPrompt);
    if (!response) {
      response = await callOpenAI(systemPrompt, userPrompt);
    }

    if (!response) {
      // Return default insights if all AI providers fail
      console.log('All AI providers failed, returning defaults');
      return new Response(
        JSON.stringify({
          insights: [
            { title: "Night Photography", description: `${moonIllumination || 50}% illumination provides ${(moonIllumination || 50) > 70 ? 'great moonlight' : 'good stargazing'} conditions tonight.`, icon: "📷" },
            { title: "Gardening Tip", description: moonPhase?.includes("Waxing") ? "Waxing moon favors planting above-ground crops." : "Good time for pruning and root vegetables.", icon: "🌱" },
            { title: "Sleep Quality", description: moonPhase === "Full Moon" ? "Full moon may affect sleep. Try calming activities before bed." : "Moon phase unlikely to disrupt sleep tonight.", icon: "😴" },
            { title: "Outdoor Activity", description: `${(moonIllumination || 50) > 50 ? 'Good visibility for evening walks or night hiking.' : 'Less moonlight - great for stargazing.'}`, icon: "🏃" },
            { title: "Lunar Folklore", description: `The ${moonPhase || 'current phase'} has been associated with reflection and renewal in many cultures.`, icon: "✨" },
          ]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the AI response
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.slice(7);
      }
      if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.slice(3);
      }
      if (cleanResponse.endsWith('```')) {
        cleanResponse = cleanResponse.slice(0, -3);
      }
      cleanResponse = cleanResponse.trim();

      const insights = JSON.parse(cleanResponse);
      console.log('Successfully parsed moon insights:', insights.length);

      return new Response(
        JSON.stringify({ insights }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, 'Response:', response);
      // Return defaults on parse error
      return new Response(
        JSON.stringify({
          insights: [
            { title: "Moon Viewing", description: `Tonight's ${moonPhase || 'moon'} offers unique viewing opportunities.`, icon: "🔭" },
            { title: "Natural Rhythms", description: "Many animals and plants follow lunar cycles in their behavior.", icon: "🌱" },
            { title: "Wellness", description: "Consider syncing your routine with lunar phases for better energy.", icon: "🧘" },
            { title: "Night Activities", description: "Plan evening activities based on moonlight availability.", icon: "🌙" },
            { title: "Reflection", description: "The moon has inspired artists and thinkers throughout history.", icon: "✨" },
          ]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in ai-moon-insights:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        insights: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
