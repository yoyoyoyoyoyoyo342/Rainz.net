import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "npm:zod@3.22.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const LocationSchema = z.object({
  location: z.string().min(1, "Location cannot be empty").max(200, "Location too long").trim(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Known landmarks for major cities - define at the top
  const landmarkDatabase: Record<string, { name: string; description: string }> = {
    'copenhagen': { name: 'Little Mermaid statue', description: 'Copenhagen Denmark' },
    'paris': { name: 'Eiffel Tower', description: 'Paris France' },
    'london': { name: 'Big Ben', description: 'London UK' },
    'new york': { name: 'Statue of Liberty', description: 'New York USA' },
    'rome': { name: 'Colosseum', description: 'Rome Italy' },
    'tokyo': { name: 'Tokyo Tower', description: 'Tokyo Japan' },
    'sydney': { name: 'Sydney Opera House', description: 'Sydney Australia' },
    'dubai': { name: 'Burj Khalifa', description: 'Dubai UAE' },
    'barcelona': { name: 'Sagrada Familia', description: 'Barcelona Spain' },
    'berlin': { name: 'Brandenburg Gate', description: 'Berlin Germany' },
    'amsterdam': { name: 'Amsterdam canal houses', description: 'Amsterdam Netherlands' },
    'prague': { name: 'Prague Castle', description: 'Prague Czech Republic' },
    'moscow': { name: 'Saint Basils Cathedral', description: 'Moscow Russia' },
    'istanbul': { name: 'Hagia Sophia', description: 'Istanbul Turkey' },
    'athens': { name: 'Parthenon', description: 'Athens Greece' },
    'venice': { name: 'Rialto Bridge', description: 'Venice Italy' },
    'singapore': { name: 'Marina Bay Sands', description: 'Singapore' },
    'hong kong': { name: 'Victoria Harbour', description: 'Hong Kong' },
    'beijing': { name: 'Forbidden City', description: 'Beijing China' },
    'san francisco': { name: 'Golden Gate Bridge', description: 'San Francisco USA' },
    'miami': { name: 'South Beach', description: 'Miami USA' },
    'las vegas': { name: 'Las Vegas Strip', description: 'Las Vegas USA' },
    'chicago': { name: 'Cloud Gate Bean', description: 'Chicago USA' },
    'los angeles': { name: 'Hollywood Sign', description: 'Los Angeles USA' },
    'seattle': { name: 'Space Needle', description: 'Seattle USA' },
    'boston': { name: 'Faneuil Hall', description: 'Boston USA' },
    'washington': { name: 'Washington Monument', description: 'Washington DC USA' },
    'philadelphia': { name: 'Liberty Bell', description: 'Philadelphia USA' },
    'toronto': { name: 'CN Tower', description: 'Toronto Canada' },
    'vancouver': { name: 'Stanley Park', description: 'Vancouver Canada' },
    'montreal': { name: 'Notre-Dame Basilica', description: 'Montreal Canada' },
    'rio de janeiro': { name: 'Christ the Redeemer', description: 'Rio Brazil' },
    'buenos aires': { name: 'Obelisco', description: 'Buenos Aires Argentina' },
    'mexico city': { name: 'Palacio de Bellas Artes', description: 'Mexico City Mexico' },
    'mumbai': { name: 'Gateway of India', description: 'Mumbai India' },
    'delhi': { name: 'India Gate', description: 'Delhi India' },
    'bangkok': { name: 'Wat Arun', description: 'Bangkok Thailand' },
    'seoul': { name: 'N Seoul Tower', description: 'Seoul Korea' },
    'melbourne': { name: 'Flinders Street Station', description: 'Melbourne Australia' },
    'auckland': { name: 'Sky Tower', description: 'Auckland New Zealand' },
    'cairo': { name: 'Great Pyramid of Giza', description: 'Cairo Egypt' },
    'cape town': { name: 'Table Mountain', description: 'Cape Town South Africa' },
    'lisbon': { name: 'Belem Tower', description: 'Lisbon Portugal' },
    'vienna': { name: 'Schonbrunn Palace', description: 'Vienna Austria' },
    'brussels': { name: 'Atomium', description: 'Brussels Belgium' },
    'zurich': { name: 'Grossmunster', description: 'Zurich Switzerland' },
    'stockholm': { name: 'Stockholm City Hall', description: 'Stockholm Sweden' },
    'oslo': { name: 'Oslo Opera House', description: 'Oslo Norway' },
    'helsinki': { name: 'Helsinki Cathedral', description: 'Helsinki Finland' },
    'dublin': { name: 'Hapenny Bridge', description: 'Dublin Ireland' },
    'edinburgh': { name: 'Edinburgh Castle', description: 'Edinburgh Scotland' },
    'maidenhead': { name: 'Maidenhead Railway Bridge', description: 'Maidenhead UK' },
    // Danish cities and regions
    'capital region': { name: 'Little Mermaid statue', description: 'Copenhagen Denmark' },
    'south denmark': { name: 'Sonderborg Castle', description: 'Southern Denmark' },
    'southern denmark': { name: 'Sonderborg Castle', description: 'Southern Denmark' },
    'sonderborg': { name: 'Sonderborg Castle', description: 'Sonderborg Denmark' },
    'sønderborg': { name: 'Sonderborg Castle', description: 'Sonderborg Denmark' },
    'aarhus': { name: 'ARoS Art Museum', description: 'Aarhus Denmark' },
    'odense': { name: 'Hans Christian Andersen Museum', description: 'Odense Denmark' },
    'aalborg': { name: 'Aalborg Tower', description: 'Aalborg Denmark' },
    'esbjerg': { name: 'Men at Sea sculpture', description: 'Esbjerg Denmark' },
    'roskilde': { name: 'Roskilde Cathedral', description: 'Roskilde Denmark' },
    'helsingør': { name: 'Kronborg Castle', description: 'Helsingor Denmark' },
    'kolding': { name: 'Koldinghus Castle', description: 'Kolding Denmark' },
    'ørestad': { name: 'Little Mermaid statue', description: 'Copenhagen Denmark' },
    'ørestad syd': { name: 'Little Mermaid statue', description: 'Copenhagen Denmark' },
    'valby': { name: 'Little Mermaid statue', description: 'Copenhagen Denmark' },
    'amager': { name: 'Little Mermaid statue', description: 'Copenhagen Denmark' },
    'frederiksberg': { name: 'Little Mermaid statue', description: 'Copenhagen Denmark' },
    'nørrebro': { name: 'Little Mermaid statue', description: 'Copenhagen Denmark' },
    'vesterbro': { name: 'Little Mermaid statue', description: 'Copenhagen Denmark' },
  };

  // Fallback mapping for smaller towns to larger cities
  const localityFallbacks: Record<string, string> = {
    'ørestad': 'copenhagen',
    'ørestad syd': 'copenhagen',
    'valby': 'copenhagen',
    'amager': 'copenhagen',
    'frederiksberg': 'copenhagen',
    'nørrebro': 'copenhagen',
    'vesterbro': 'copenhagen',
    'capital region': 'copenhagen',
    'bronx': 'new york',
    'brooklyn': 'new york',
    'queens': 'new york',
    'manhattan': 'new york',
    'staten island': 'new york',
    'camden': 'london',
    'westminster': 'london',
    'hackney': 'london',
    'greenwich': 'london',
  };

  try {
    const body = await req.json();
    
    // Validate input
    const validationResult = LocationSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid location parameter",
          image: null
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { location } = validationResult.data;
    const unsplashToken = Deno.env.get('UNSPLASH_ACCESS_KEY');

    if (!unsplashToken) {
      console.error('UNSPLASH_ACCESS_KEY not configured');
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable" }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse location to extract actual city name
    // Format might be: "District, City, Region, Country" or "City, Country"
    const locationParts = location.split(',').map((p: string) => p.trim());
    
    // Check if any part looks like coordinates (numbers with decimal points)
    const isCoordinate = (str: string) => /^-?\d+\.?\d*$/.test(str.trim());
    const nonCoordinateParts = locationParts.filter((p: string) => !isCoordinate(p));
    
    // If all parts are coordinates, return null (no image available)
    if (nonCoordinateParts.length === 0) {
      console.log('Location appears to be coordinates only, no landmark available');
      return new Response(
        JSON.stringify({ 
          image: null, 
          landmark: null,
          error: 'Coordinates-only location, no landmark available'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Try to identify the actual city:
    // - If there are 4+ non-coordinate parts, use the 2nd part (likely the city)
    // - If there are 3 parts, use the 2nd part
    // - If there are 2 parts, use the 1st part
    // - Otherwise use the first non-coordinate part
    let actualCity = nonCoordinateParts[0];
    if (nonCoordinateParts.length >= 3) {
      actualCity = nonCoordinateParts[1]; // Usually the actual city
    } else if (nonCoordinateParts.length === 2) {
      actualCity = nonCoordinateParts[0]; // First part is likely the city
    }
    
    const cityName = actualCity.trim().toLowerCase();
    console.log('Finding photo for city:', actualCity, 'from full location:', location);

    // Check if we need to fallback to a larger city
    const fallbackCity = localityFallbacks[cityName];
    const searchCity = fallbackCity || cityName;
    
    // Get landmark from database (using fallback city if available)
    const landmark = landmarkDatabase[searchCity] || landmarkDatabase[cityName];
    const searchQuery = landmark 
      ? `${landmark.name} iconic famous monument ${landmark.description}`
      : `${searchCity} famous landmark iconic monument`;
    
    console.log('Using search city:', searchCity, 'Landmark:', landmark?.name || 'generic search');
    
    console.log('Searching Unsplash for:', searchQuery);

    
    // Search Unsplash for real photos with strict landmark filtering
    const unsplashResponse = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=3&orientation=portrait&content_filter=high`,
      {
        headers: {
          'Authorization': `Client-ID ${unsplashToken}`,
        },
      }
    );

    if (!unsplashResponse.ok) {
      const errorText = await unsplashResponse.text();
      console.error('Unsplash API error:', unsplashResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable" }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const unsplashData = await unsplashResponse.json();
    console.log('Found', unsplashData.results?.length || 0, 'photos');

    if (!unsplashData.results || unsplashData.results.length === 0) {
      console.log('No photos found, returning fallback');
      return new Response(
        JSON.stringify({ 
          image: null, 
          landmark: landmark?.name || cityName,
          error: 'No photos found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the first high-quality photo
    const photo = unsplashData.results[0];
    const imageUrl = photo.urls.regular; // High quality but not too large
    
    console.log('Successfully found photo for:', landmark?.name || cityName);
    return new Response(
      JSON.stringify({ 
        image: imageUrl, 
        landmark: landmark?.name || cityName,
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating landmark image:', error);
    return new Response(
      JSON.stringify({ error: "Service temporarily unavailable" }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
