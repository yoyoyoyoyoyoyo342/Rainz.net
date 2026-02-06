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
    // Additional capitals with landmarks
    'madrid': { name: 'Royal Palace Madrid', description: 'Madrid Spain' },
    'warsaw': { name: 'Palace of Culture and Science', description: 'Warsaw Poland' },
    'budapest': { name: 'Hungarian Parliament Building', description: 'Budapest Hungary' },
    'bucharest': { name: 'Palace of Parliament', description: 'Bucharest Romania' },
    'kiev': { name: 'Saint Sophia Cathedral', description: 'Kyiv Ukraine' },
    'kyiv': { name: 'Saint Sophia Cathedral', description: 'Kyiv Ukraine' },
    'minsk': { name: 'National Library of Belarus', description: 'Minsk Belarus' },
    'bratislava': { name: 'Bratislava Castle', description: 'Bratislava Slovakia' },
    'ljubljana': { name: 'Ljubljana Castle', description: 'Ljubljana Slovenia' },
    'zagreb': { name: 'Zagreb Cathedral', description: 'Zagreb Croatia' },
    'belgrade': { name: 'Belgrade Fortress', description: 'Belgrade Serbia' },
    'sofia': { name: 'Alexander Nevsky Cathedral', description: 'Sofia Bulgaria' },
    'tirana': { name: 'Skanderbeg Square', description: 'Tirana Albania' },
    'skopje': { name: 'Skopje Fortress', description: 'Skopje North Macedonia' },
    'sarajevo': { name: 'Sebilj fountain', description: 'Sarajevo Bosnia' },
    'podgorica': { name: 'Millennium Bridge', description: 'Podgorica Montenegro' },
    'vilnius': { name: 'Gediminas Tower', description: 'Vilnius Lithuania' },
    'riga': { name: 'House of Blackheads', description: 'Riga Latvia' },
    'tallinn': { name: 'Tallinn Old Town', description: 'Tallinn Estonia' },
    'reykjavik': { name: 'Hallgrimskirkja', description: 'Reykjavik Iceland' },
    'luxembourg': { name: 'Grand Ducal Palace', description: 'Luxembourg' },
    'monaco': { name: 'Monte Carlo Casino', description: 'Monaco' },
    'andorra la vella': { name: 'Casa de la Vall', description: 'Andorra' },
    'valletta': { name: 'St Johns Co-Cathedral', description: 'Valletta Malta' },
    'nicosia': { name: 'Selimiye Mosque', description: 'Nicosia Cyprus' },
    'bern': { name: 'Zytglogge', description: 'Bern Switzerland' },
    'vaduz': { name: 'Vaduz Castle', description: 'Vaduz Liechtenstein' },
    'san marino': { name: 'Guaita Tower', description: 'San Marino' },
    'vatican': { name: 'St Peters Basilica', description: 'Vatican City' },
    // Asian capitals
    'kuala lumpur': { name: 'Petronas Towers', description: 'Kuala Lumpur Malaysia' },
    'jakarta': { name: 'National Monument', description: 'Jakarta Indonesia' },
    'manila': { name: 'Rizal Monument', description: 'Manila Philippines' },
    'hanoi': { name: 'Ho Chi Minh Mausoleum', description: 'Hanoi Vietnam' },
    'phnom penh': { name: 'Royal Palace', description: 'Phnom Penh Cambodia' },
    'vientiane': { name: 'Patuxai', description: 'Vientiane Laos' },
    'yangon': { name: 'Shwedagon Pagoda', description: 'Yangon Myanmar' },
    'dhaka': { name: 'National Parliament House', description: 'Dhaka Bangladesh' },
    'kathmandu': { name: 'Boudhanath Stupa', description: 'Kathmandu Nepal' },
    'colombo': { name: 'Lotus Tower', description: 'Colombo Sri Lanka' },
    'islamabad': { name: 'Faisal Mosque', description: 'Islamabad Pakistan' },
    'kabul': { name: 'Darul Aman Palace', description: 'Kabul Afghanistan' },
    'tehran': { name: 'Azadi Tower', description: 'Tehran Iran' },
    'baghdad': { name: 'Al-Shaheed Monument', description: 'Baghdad Iraq' },
    'riyadh': { name: 'Kingdom Centre', description: 'Riyadh Saudi Arabia' },
    'doha': { name: 'Museum of Islamic Art', description: 'Doha Qatar' },
    'abu dhabi': { name: 'Sheikh Zayed Mosque', description: 'Abu Dhabi UAE' },
    'muscat': { name: 'Sultan Qaboos Grand Mosque', description: 'Muscat Oman' },
    'amman': { name: 'Citadel of Amman', description: 'Amman Jordan' },
    'beirut': { name: 'Mohammad Al-Amin Mosque', description: 'Beirut Lebanon' },
    'damascus': { name: 'Umayyad Mosque', description: 'Damascus Syria' },
    'jerusalem': { name: 'Dome of the Rock', description: 'Jerusalem' },
    'tel aviv': { name: 'Azrieli Center', description: 'Tel Aviv Israel' },
    'taipei': { name: 'Taipei 101', description: 'Taipei Taiwan' },
    'shanghai': { name: 'Oriental Pearl Tower', description: 'Shanghai China' },
    'osaka': { name: 'Osaka Castle', description: 'Osaka Japan' },
    // African capitals
    'nairobi': { name: 'Kenyatta International Convention Centre', description: 'Nairobi Kenya' },
    'addis ababa': { name: 'Holy Trinity Cathedral', description: 'Addis Ababa Ethiopia' },
    'dar es salaam': { name: 'Askari Monument', description: 'Dar es Salaam Tanzania' },
    'kampala': { name: 'Uganda National Mosque', description: 'Kampala Uganda' },
    'kigali': { name: 'Kigali Convention Centre', description: 'Kigali Rwanda' },
    'lagos': { name: 'National Theatre Lagos', description: 'Lagos Nigeria' },
    'accra': { name: 'Independence Arch', description: 'Accra Ghana' },
    'dakar': { name: 'African Renaissance Monument', description: 'Dakar Senegal' },
    'casablanca': { name: 'Hassan II Mosque', description: 'Casablanca Morocco' },
    'rabat': { name: 'Hassan Tower', description: 'Rabat Morocco' },
    'algiers': { name: 'Martyrs Memorial', description: 'Algiers Algeria' },
    'tunis': { name: 'Zitouna Mosque', description: 'Tunis Tunisia' },
    'tripoli': { name: 'Red Castle', description: 'Tripoli Libya' },
    'johannesburg': { name: 'Carlton Centre', description: 'Johannesburg South Africa' },
    'pretoria': { name: 'Union Buildings', description: 'Pretoria South Africa' },
    // Oceania capitals
    'wellington': { name: 'Beehive Parliament', description: 'Wellington New Zealand' },
    'canberra': { name: 'Parliament House', description: 'Canberra Australia' },
    'suva': { name: 'Suva Clock Tower', description: 'Suva Fiji' },
    'port moresby': { name: 'Parliament House', description: 'Port Moresby Papua New Guinea' },
    // South American capitals
    'lima': { name: 'Plaza Mayor', description: 'Lima Peru' },
    'bogota': { name: 'Monserrate', description: 'Bogota Colombia' },
    'santiago': { name: 'La Moneda Palace', description: 'Santiago Chile' },
    'caracas': { name: 'Avila Mountain', description: 'Caracas Venezuela' },
    'quito': { name: 'Basilica del Voto Nacional', description: 'Quito Ecuador' },
    'la paz': { name: 'Plaza Murillo', description: 'La Paz Bolivia' },
    'asuncion': { name: 'Panteon Nacional', description: 'Asuncion Paraguay' },
    'montevideo': { name: 'Palacio Salvo', description: 'Montevideo Uruguay' },
    'brasilia': { name: 'Cathedral of Brasilia', description: 'Brasilia Brazil' },
    'sao paulo': { name: 'Paulista Avenue', description: 'Sao Paulo Brazil' },
    // Central American capitals
    'panama city': { name: 'Casco Viejo', description: 'Panama City Panama' },
    'san jose': { name: 'National Theatre Costa Rica', description: 'San Jose Costa Rica' },
    'guatemala city': { name: 'National Palace Guatemala', description: 'Guatemala City' },
    'havana': { name: 'El Capitolio', description: 'Havana Cuba' },
    // North American cities
    'ottawa': { name: 'Parliament Hill', description: 'Ottawa Canada' },
    'calgary': { name: 'Calgary Tower', description: 'Calgary Canada' },
    'edmonton': { name: 'West Edmonton Mall', description: 'Edmonton Canada' },
    'winnipeg': { name: 'Canadian Museum for Human Rights', description: 'Winnipeg Canada' },
    'quebec city': { name: 'Chateau Frontenac', description: 'Quebec City Canada' },
    'halifax': { name: 'Halifax Citadel', description: 'Halifax Canada' },
    'denver': { name: 'Colorado State Capitol', description: 'Denver USA' },
    'phoenix': { name: 'Camelback Mountain', description: 'Phoenix USA' },
    'houston': { name: 'Space Center Houston', description: 'Houston USA' },
    'dallas': { name: 'Reunion Tower', description: 'Dallas USA' },
    'atlanta': { name: 'Georgia Aquarium', description: 'Atlanta USA' },
    'new orleans': { name: 'French Quarter', description: 'New Orleans USA' },
    'nashville': { name: 'Parthenon Nashville', description: 'Nashville USA' },
    'detroit': { name: 'Renaissance Center', description: 'Detroit USA' },
    'minneapolis': { name: 'Stone Arch Bridge', description: 'Minneapolis USA' },
    'san diego': { name: 'Balboa Park', description: 'San Diego USA' },
    'portland': { name: 'Portland Japanese Garden', description: 'Portland USA' },
    'austin': { name: 'Texas State Capitol', description: 'Austin USA' },
  };

  // Fallback mapping for smaller towns/suburbs to larger cities (50+ capitals with suburbs)
  const localityFallbacks: Record<string, string> = {
    // ==================== DENMARK - Copenhagen ====================
    'ørestad': 'copenhagen',
    'ørestad syd': 'copenhagen',
    'valby': 'copenhagen',
    'amager': 'copenhagen',
    'frederiksberg': 'copenhagen',
    'nørrebro': 'copenhagen',
    'vesterbro': 'copenhagen',
    'capital region': 'copenhagen',
    'emdrup': 'copenhagen',
    'brønshøj': 'copenhagen',
    'vanløse': 'copenhagen',
    'bispebjerg': 'copenhagen',
    'østerbro': 'copenhagen',
    'christianshavn': 'copenhagen',
    'islands brygge': 'copenhagen',
    'sydhavn': 'copenhagen',
    'nordvest': 'copenhagen',
    'husum': 'copenhagen',
    'utterslev': 'copenhagen',
    'bellahøj': 'copenhagen',
    'hellerup': 'copenhagen',
    'gentofte': 'copenhagen',
    'charlottenlund': 'copenhagen',
    'klampenborg': 'copenhagen',
    'lyngby': 'copenhagen',
    'virum': 'copenhagen',
    'gladsaxe': 'copenhagen',
    'herlev': 'copenhagen',
    'rødovre': 'copenhagen',
    'hvidovre': 'copenhagen',
    'tårnby': 'copenhagen',
    'dragør': 'copenhagen',
    'kastrup': 'copenhagen',
    'sundby': 'copenhagen',
    'kongens lyngby': 'copenhagen',
    'bagsværd': 'copenhagen',
    'søborg': 'copenhagen',
    'brøndby': 'copenhagen',
    'albertslund': 'copenhagen',
    'taastrup': 'copenhagen',
    'ballerup': 'copenhagen',
    'ishøj': 'copenhagen',
    'greve': 'copenhagen',
    'solrød': 'copenhagen',
    'køge': 'copenhagen',

    // ==================== USA - New York ====================
    'bronx': 'new york',
    'brooklyn': 'new york',
    'queens': 'new york',
    'manhattan': 'new york',
    'staten island': 'new york',
    'harlem': 'new york',
    'soho': 'new york',
    'tribeca': 'new york',
    'chelsea': 'new york',
    'midtown': 'new york',
    'upper east side': 'new york',
    'upper west side': 'new york',
    'lower east side': 'new york',
    'greenwich village': 'new york',
    'east village': 'new york',
    'williamsburg': 'new york',
    'bushwick': 'new york',
    'astoria': 'new york',
    'long island city': 'new york',
    'flushing': 'new york',
    'jamaica': 'new york',
    'jersey city': 'new york',
    'hoboken': 'new york',
    'newark': 'new york',
    'yonkers': 'new york',
    'new rochelle': 'new york',
    'white plains': 'new york',

    // ==================== USA - Los Angeles ====================
    'hollywood': 'los angeles',
    'beverly hills': 'los angeles',
    'santa monica': 'los angeles',
    'venice beach': 'los angeles',
    'malibu': 'los angeles',
    'pasadena': 'los angeles',
    'burbank': 'los angeles',
    'glendale': 'los angeles',
    'long beach': 'los angeles',
    'anaheim': 'los angeles',
    'irvine': 'los angeles',
    'torrance': 'los angeles',
    'inglewood': 'los angeles',
    'compton': 'los angeles',
    'culver city': 'los angeles',
    'west hollywood': 'los angeles',
    'koreatown': 'los angeles',
    'downtown la': 'los angeles',
    'silver lake': 'los angeles',
    'echo park': 'los angeles',

    // ==================== USA - Chicago ====================
    'evanston': 'chicago',
    'oak park': 'chicago',
    'cicero': 'chicago',
    'skokie': 'chicago',
    'wicker park': 'chicago',
    'lincoln park': 'chicago',
    'logan square': 'chicago',
    'hyde park': 'chicago',
    'south loop': 'chicago',
    'river north': 'chicago',
    'gold coast': 'chicago',
    'lakeview': 'chicago',
    'pilsen': 'chicago',
    'naperville': 'chicago',
    'aurora': 'chicago',
    'joliet': 'chicago',

    // ==================== USA - Washington DC ====================
    'georgetown': 'washington',
    'capitol hill': 'washington',
    'dupont circle': 'washington',
    'adams morgan': 'washington',
    'foggy bottom': 'washington',
    'arlington': 'washington',
    'alexandria': 'washington',
    'bethesda': 'washington',
    'silver spring': 'washington',
    'rockville': 'washington',
    'fairfax': 'washington',
    'tysons': 'washington',
    'reston': 'washington',

    // ==================== UK - London ====================
    'camden': 'london',
    'westminster': 'london',
    'hackney': 'london',
    'greenwich': 'london',
    'islington': 'london',
    'kensington': 'london',
    'brixton': 'london',
    'shoreditch': 'london',
    'mayfair': 'london',
    'notting hill': 'london',
    'soho london': 'london',
    'covent garden': 'london',
    'south bank': 'london',
    'canary wharf': 'london',
    'stratford': 'london',
    'hammersmith': 'london',
    'fulham': 'london',
    'battersea': 'london',
    'clapham': 'london',
    'wimbledon': 'london',
    'richmond': 'london',
    'kingston': 'london',
    'croydon': 'london',
    'lewisham': 'london',
    'southwark': 'london',
    'tower hamlets': 'london',
    'newham': 'london',
    'barking': 'london',
    'wembley': 'london',
    'ealing': 'london',
    'hounslow': 'london',
    'heathrow': 'london',

    // ==================== FRANCE - Paris ====================
    'montmartre': 'paris',
    'marais': 'paris',
    'le marais': 'paris',
    'latin quarter': 'paris',
    'quartier latin': 'paris',
    'belleville': 'paris',
    'bastille': 'paris',
    'opera': 'paris',
    'champs elysees': 'paris',
    'saint germain': 'paris',
    'pigalle': 'paris',
    'oberkampf': 'paris',
    'la defense': 'paris',
    'boulogne': 'paris',
    'neuilly': 'paris',
    'vincennes': 'paris',
    'saint denis': 'paris',
    'versailles': 'paris',
    'nanterre': 'paris',
    'creteil': 'paris',
    'montreuil': 'paris',
    'argenteuil': 'paris',
    'bobigny': 'paris',

    // ==================== GERMANY - Berlin ====================
    'kreuzberg': 'berlin',
    'prenzlauer berg': 'berlin',
    'mitte': 'berlin',
    'friedrichshain': 'berlin',
    'neukölln': 'berlin',
    'charlottenburg': 'berlin',
    'schöneberg': 'berlin',
    'wilmersdorf': 'berlin',
    'tempelhof': 'berlin',
    'steglitz': 'berlin',
    'zehlendorf': 'berlin',
    'spandau': 'berlin',
    'wedding': 'berlin',
    'moabit': 'berlin',
    'potsdam': 'berlin',

    // ==================== NETHERLANDS - Amsterdam ====================
    'jordaan': 'amsterdam',
    'de pijp': 'amsterdam',
    'oud-west': 'amsterdam',
    'centrum': 'amsterdam',
    'oost': 'amsterdam',
    'noord': 'amsterdam',
    'zuid': 'amsterdam',
    'west': 'amsterdam',
    'amstelveen': 'amsterdam',
    'zaandam': 'amsterdam',
    'haarlem': 'amsterdam',
    'almere': 'amsterdam',
    'hoofddorp': 'amsterdam',
    'schiphol': 'amsterdam',
    'diemen': 'amsterdam',

    // ==================== SPAIN - Madrid ====================
    'sol': 'madrid',
    'gran via': 'madrid',
    'malasaña': 'madrid',
    'chueca': 'madrid',
    'la latina': 'madrid',
    'lavapies': 'madrid',
    'salamanca': 'madrid',
    'retiro': 'madrid',
    'chamberi': 'madrid',
    'moncloa': 'madrid',
    'tetuan': 'madrid',
    'alcobendas': 'madrid',
    'getafe': 'madrid',
    'leganes': 'madrid',
    'alcala de henares': 'madrid',
    'mostoles': 'madrid',
    'fuenlabrada': 'madrid',
    'alcorcon': 'madrid',

    // ==================== SPAIN - Barcelona ====================
    'gracia': 'barcelona',
    'eixample': 'barcelona',
    'el born': 'barcelona',
    'gothic quarter': 'barcelona',
    'raval': 'barcelona',
    'barceloneta': 'barcelona',
    'poblenou': 'barcelona',
    'sant marti': 'barcelona',
    'sants': 'barcelona',
    'les corts': 'barcelona',
    'sarria': 'barcelona',
    'sant gervasi': 'barcelona',
    'hospitalet': 'barcelona',
    'badalona': 'barcelona',
    'terrassa': 'barcelona',
    'sabadell': 'barcelona',
    'mataro': 'barcelona',

    // ==================== ITALY - Rome ====================
    'trastevere': 'rome',
    'testaccio': 'rome',
    'monti': 'rome',
    'prati': 'rome',
    'san giovanni': 'rome',
    'termini': 'rome',
    'ostiense': 'rome',
    'eur': 'rome',
    'san lorenzo': 'rome',
    'nomentano': 'rome',
    'parioli': 'rome',
    'flaminio': 'rome',
    'trionfale': 'rome',
    'fiumicino': 'rome',
    'ostia': 'rome',

    // ==================== JAPAN - Tokyo ====================
    'shibuya': 'tokyo',
    'shinjuku': 'tokyo',
    'harajuku': 'tokyo',
    'ginza': 'tokyo',
    'roppongi': 'tokyo',
    'akihabara': 'tokyo',
    'asakusa': 'tokyo',
    'ikebukuro': 'tokyo',
    'ueno': 'tokyo',
    'odaiba': 'tokyo',
    'ebisu': 'tokyo',
    'meguro': 'tokyo',
    'nakano': 'tokyo',
    'kichijoji': 'tokyo',
    'shimokitazawa': 'tokyo',
    'setagaya': 'tokyo',
    'nerima': 'tokyo',
    'edogawa': 'tokyo',
    'koto': 'tokyo',
    'chiba': 'tokyo',
    'yokohama': 'tokyo',
    'kawasaki': 'tokyo',
    'saitama': 'tokyo',

    // ==================== SOUTH KOREA - Seoul ====================
    'gangnam': 'seoul',
    'hongdae': 'seoul',
    'itaewon': 'seoul',
    'myeongdong': 'seoul',
    'insadong': 'seoul',
    'bukchon': 'seoul',
    'jongno': 'seoul',
    'mapo': 'seoul',
    'yongsan': 'seoul',
    'songpa': 'seoul',
    'nowon': 'seoul',
    'dobong': 'seoul',
    'incheon': 'seoul',
    'suwon': 'seoul',
    'seongnam': 'seoul',
    'goyang': 'seoul',
    'yongin': 'seoul',

    // ==================== CHINA - Beijing ====================
    'chaoyang': 'beijing',
    'dongcheng': 'beijing',
    'xicheng': 'beijing',
    'haidian': 'beijing',
    'fengtai': 'beijing',
    'shijingshan': 'beijing',
    'tongzhou': 'beijing',
    'shunyi': 'beijing',
    'changping': 'beijing',
    'daxing': 'beijing',

    // ==================== CHINA - Shanghai ====================
    'pudong': 'shanghai',
    'jing an': 'shanghai',
    'huangpu': 'shanghai',
    'xuhui': 'shanghai',
    'changning': 'shanghai',
    'putuo': 'shanghai',
    'hongkou': 'shanghai',
    'yangpu': 'shanghai',
    'minhang': 'shanghai',
    'baoshan': 'shanghai',
    'jiading': 'shanghai',

    // ==================== AUSTRALIA - Sydney ====================
    'bondi': 'sydney',
    'surry hills': 'sydney',
    'darlinghurst': 'sydney',
    'newtown': 'sydney',
    'manly': 'sydney',
    'paddington': 'sydney',
    'redfern': 'sydney',
    'glebe': 'sydney',
    'pyrmont': 'sydney',
    'barangaroo': 'sydney',
    'parramatta': 'sydney',
    'chatswood': 'sydney',
    'north sydney': 'sydney',
    'coogee': 'sydney',
    'cronulla': 'sydney',
    'bankstown': 'sydney',
    'liverpool': 'sydney',
    'blacktown': 'sydney',
    'penrith': 'sydney',
    'campbelltown': 'sydney',

    // ==================== AUSTRALIA - Melbourne ====================
    'st kilda': 'melbourne',
    'fitzroy': 'melbourne',
    'collingwood': 'melbourne',
    'richmond': 'melbourne',
    'south yarra': 'melbourne',
    'prahran': 'melbourne',
    'carlton': 'melbourne',
    'brunswick': 'melbourne',
    'northcote': 'melbourne',
    'footscray': 'melbourne',
    'docklands': 'melbourne',
    'southbank': 'melbourne',
    'geelong': 'melbourne',
    'dandenong': 'melbourne',
    'frankston': 'melbourne',
    'box hill': 'melbourne',

    // ==================== CANADA - Toronto ====================
    'downtown toronto': 'toronto',
    'yorkville': 'toronto',
    'queen west': 'toronto',
    'kensington market': 'toronto',
    'distillery district': 'toronto',
    'liberty village': 'toronto',
    'leslieville': 'toronto',
    'the beaches': 'toronto',
    'scarborough': 'toronto',
    'etobicoke': 'toronto',
    'north york': 'toronto',
    'mississauga': 'toronto',
    'brampton': 'toronto',
    'vaughan': 'toronto',
    'markham': 'toronto',
    'richmond hill': 'toronto',
    'oakville': 'toronto',
    'burlington': 'toronto',
    'hamilton': 'toronto',

    // ==================== CANADA - Vancouver ====================
    'gastown': 'vancouver',
    'yaletown': 'vancouver',
    'kitsilano': 'vancouver',
    'west end': 'vancouver',
    'mount pleasant': 'vancouver',
    'commercial drive': 'vancouver',
    'main street': 'vancouver',
    'burnaby': 'vancouver',
    'richmond': 'vancouver',
    'surrey': 'vancouver',
    'new westminster': 'vancouver',
    'coquitlam': 'vancouver',
    'north vancouver': 'vancouver',
    'west vancouver': 'vancouver',
    'delta': 'vancouver',
    'langley': 'vancouver',

    // ==================== BRAZIL - Rio de Janeiro ====================
    'copacabana': 'rio de janeiro',
    'ipanema': 'rio de janeiro',
    'leblon': 'rio de janeiro',
    'botafogo': 'rio de janeiro',
    'flamengo': 'rio de janeiro',
    'lapa': 'rio de janeiro',
    'santa teresa': 'rio de janeiro',
    'centro rio': 'rio de janeiro',
    'barra da tijuca': 'rio de janeiro',
    'tijuca': 'rio de janeiro',
    'niteroi': 'rio de janeiro',

    // ==================== BRAZIL - Sao Paulo ====================
    'jardins': 'sao paulo',
    'vila madalena': 'sao paulo',
    'pinheiros': 'sao paulo',
    'itaim bibi': 'sao paulo',
    'moema': 'sao paulo',
    'consolacao': 'sao paulo',
    'liberdade': 'sao paulo',
    'bela vista': 'sao paulo',
    'centro sp': 'sao paulo',
    'santana': 'sao paulo',
    'guarulhos': 'sao paulo',
    'osasco': 'sao paulo',
    'abc paulista': 'sao paulo',

    // ==================== ARGENTINA - Buenos Aires ====================
    'palermo': 'buenos aires',
    'recoleta': 'buenos aires',
    'san telmo': 'buenos aires',
    'la boca': 'buenos aires',
    'belgrano': 'buenos aires',
    'puerto madero': 'buenos aires',
    'microcentro': 'buenos aires',
    'caballito': 'buenos aires',
    'almagro': 'buenos aires',
    'villa crespo': 'buenos aires',
    'nunez': 'buenos aires',
    'colegiales': 'buenos aires',

    // ==================== MEXICO - Mexico City ====================
    'condesa': 'mexico city',
    'roma norte': 'mexico city',
    'polanco': 'mexico city',
    'coyoacan': 'mexico city',
    'centro historico': 'mexico city',
    'santa fe': 'mexico city',
    'xochimilco': 'mexico city',
    'chapultepec': 'mexico city',
    'tlalpan': 'mexico city',
    'iztapalapa': 'mexico city',
    'ecatepec': 'mexico city',
    'naucalpan': 'mexico city',
    'tlalnepantla': 'mexico city',
    'nezahualcoyotl': 'mexico city',

    // ==================== INDIA - Delhi ====================
    'new delhi': 'delhi',
    'old delhi': 'delhi',
    'connaught place': 'delhi',
    'hauz khas': 'delhi',
    'karol bagh': 'delhi',
    'paharganj': 'delhi',
    'defence colony': 'delhi',
    'south delhi': 'delhi',
    'dwarka': 'delhi',
    'rohini': 'delhi',
    'noida': 'delhi',
    'gurgaon': 'delhi',
    'gurugram': 'delhi',
    'faridabad': 'delhi',
    'ghaziabad': 'delhi',
    'greater noida': 'delhi',

    // ==================== INDIA - Mumbai ====================
    'bandra': 'mumbai',
    'andheri': 'mumbai',
    'colaba': 'mumbai',
    'worli': 'mumbai',
    'juhu': 'mumbai',
    'powai': 'mumbai',
    'lower parel': 'mumbai',
    'dadar': 'mumbai',
    'kurla': 'mumbai',
    'navi mumbai': 'mumbai',
    'thane': 'mumbai',
    'kalyan': 'mumbai',
    'dombivli': 'mumbai',
    'borivali': 'mumbai',

    // ==================== THAILAND - Bangkok ====================
    'sukhumvit': 'bangkok',
    'silom': 'bangkok',
    'sathorn': 'bangkok',
    'khao san': 'bangkok',
    'chinatown': 'bangkok',
    'rattanakosin': 'bangkok',
    'thonglor': 'bangkok',
    'ekkamai': 'bangkok',
    'ari': 'bangkok',
    'chatuchak': 'bangkok',
    'ratchada': 'bangkok',
    'asoke': 'bangkok',
    'bang na': 'bangkok',
    'lat phrao': 'bangkok',
    'nonthaburi': 'bangkok',
    'pathum thani': 'bangkok',
    'samut prakan': 'bangkok',

    // ==================== SINGAPORE ====================
    'orchard': 'singapore',
    'marina bay': 'singapore',
    'bugis': 'singapore',
    'little india': 'singapore',
    'chinatown sg': 'singapore',
    'clarke quay': 'singapore',
    'sentosa': 'singapore',
    'jurong': 'singapore',
    'tampines': 'singapore',
    'bedok': 'singapore',
    'woodlands': 'singapore',
    'ang mo kio': 'singapore',
    'bishan': 'singapore',
    'toa payoh': 'singapore',
    'geylang': 'singapore',
    'punggol': 'singapore',

    // ==================== UAE - Dubai ====================
    'downtown dubai': 'dubai',
    'dubai marina': 'dubai',
    'jumeirah': 'dubai',
    'palm jumeirah': 'dubai',
    'deira': 'dubai',
    'bur dubai': 'dubai',
    'business bay': 'dubai',
    'jbr': 'dubai',
    'silicon oasis': 'dubai',
    'al barsha': 'dubai',
    'sharjah': 'dubai',
    'ajman': 'dubai',

    // ==================== TURKEY - Istanbul ====================
    'sultanahmet': 'istanbul',
    'beyoglu': 'istanbul',
    'taksim': 'istanbul',
    'kadikoy': 'istanbul',
    'besiktas': 'istanbul',
    'uskudar': 'istanbul',
    'sisli': 'istanbul',
    'bakirkoy': 'istanbul',
    'fatih': 'istanbul',
    'galata': 'istanbul',
    'karakoy': 'istanbul',
    'nisantasi': 'istanbul',
    'eminonu': 'istanbul',
    'ortakoy': 'istanbul',
    'bebek': 'istanbul',

    // ==================== RUSSIA - Moscow ====================
    'arbat': 'moscow',
    'tverskaya': 'moscow',
    'red square': 'moscow',
    'kitay gorod': 'moscow',
    'zamoskvorechye': 'moscow',
    'khamovniki': 'moscow',
    'sokolniki': 'moscow',
    'ostankino': 'moscow',
    'khimki': 'moscow',
    'mytishchi': 'moscow',
    'korolev': 'moscow',
    'lyubertsy': 'moscow',
    'balashikha': 'moscow',
    'podolsk': 'moscow',

    // ==================== AUSTRIA - Vienna ====================
    'innere stadt': 'vienna',
    'leopoldstadt': 'vienna',
    'landstrasse': 'vienna',
    'wieden': 'vienna',
    'margareten': 'vienna',
    'mariahilf': 'vienna',
    'neubau': 'vienna',
    'josefstadt': 'vienna',
    'alsergrund': 'vienna',
    'favoriten': 'vienna',
    'simmering': 'vienna',
    'meidling': 'vienna',
    'hietzing': 'vienna',
    'döbling': 'vienna',
    'floridsdorf': 'vienna',
    'donaustadt': 'vienna',

    // ==================== SWEDEN - Stockholm ====================
    'gamla stan': 'stockholm',
    'södermalm': 'stockholm',
    'östermalm': 'stockholm',
    'norrmalm': 'stockholm',
    'kungsholmen': 'stockholm',
    'vasastan': 'stockholm',
    'djurgården': 'stockholm',
    'hammarby': 'stockholm',
    'bromma': 'stockholm',
    'solna': 'stockholm',
    'sundbyberg': 'stockholm',
    'nacka': 'stockholm',
    'lidingö': 'stockholm',
    'täby': 'stockholm',
    'sollentuna': 'stockholm',
    'huddinge': 'stockholm',
    'botkyrka': 'stockholm',

    // ==================== NORWAY - Oslo ====================
    'sentrum': 'oslo',
    'grünerløkka': 'oslo',
    'majorstuen': 'oslo',
    'frogner': 'oslo',
    'st hanshaugen': 'oslo',
    'tøyen': 'oslo',
    'gamle oslo': 'oslo',
    'sagene': 'oslo',
    'ullern': 'oslo',
    'bærum': 'oslo',
    'asker': 'oslo',
    'lørenskog': 'oslo',
    'lillestrøm': 'oslo',
    'ski': 'oslo',
    'drammen': 'oslo',

    // ==================== FINLAND - Helsinki ====================
    'kallio': 'helsinki',
    'kamppi': 'helsinki',
    'punavuori': 'helsinki',
    'ullanlinna': 'helsinki',
    'töölö': 'helsinki',
    'kruununhaka': 'helsinki',
    'sörnäinen': 'helsinki',
    'vallila': 'helsinki',
    'pasila': 'helsinki',
    'lauttasaari': 'helsinki',
    'espoo': 'helsinki',
    'vantaa': 'helsinki',
    'kauniainen': 'helsinki',
    'järvenpää': 'helsinki',
    'kerava': 'helsinki',

    // ==================== POLAND - Warsaw ====================
    'stare miasto': 'warsaw',
    'nowe miasto': 'warsaw',
    'srodmiescie': 'warsaw',
    'praga': 'warsaw',
    'mokotow': 'warsaw',
    'zoliborz': 'warsaw',
    'wola': 'warsaw',
    'ochota': 'warsaw',
    'ursynow': 'warsaw',
    'wilanow': 'warsaw',
    'bielany': 'warsaw',
    'bemowo': 'warsaw',
    'targowek': 'warsaw',

    // ==================== CZECH REPUBLIC - Prague ====================
    'stare mesto': 'prague',
    'nove mesto': 'prague',
    'mala strana': 'prague',
    'hradcany': 'prague',
    'vinohrady': 'prague',
    'zizkov': 'prague',
    'karlin': 'prague',
    'smichov': 'prague',
    'holesovice': 'prague',
    'dejvice': 'prague',
    'vysehrad': 'prague',
    'letna': 'prague',
    'brevnov': 'prague',

    // ==================== HUNGARY - Budapest ====================
    'buda': 'budapest',
    'pest': 'budapest',
    'castle district': 'budapest',
    'belvaros': 'budapest',
    'erzsebetvaros': 'budapest',
    'terezvaros': 'budapest',
    'lipotvaros': 'budapest',
    'ujlipotvaros': 'budapest',
    'obuda': 'budapest',
    'margit island': 'budapest',
    'kelenföld': 'budapest',
    'budafok': 'budapest',
    'csepel': 'budapest',

    // ==================== PORTUGAL - Lisbon ====================
    'alfama': 'lisbon',
    'baixa': 'lisbon',
    'bairro alto': 'lisbon',
    'chiado': 'lisbon',
    'belem': 'lisbon',
    'alcantara': 'lisbon',
    'santos': 'lisbon',
    'lapa': 'lisbon',
    'mouraria': 'lisbon',
    'graca': 'lisbon',
    'principe real': 'lisbon',
    'campo de ourique': 'lisbon',
    'parque das nacoes': 'lisbon',
    'cascais': 'lisbon',
    'sintra': 'lisbon',
    'amadora': 'lisbon',
    'almada': 'lisbon',
    'setubal': 'lisbon',

    // ==================== GREECE - Athens ====================
    'plaka': 'athens',
    'monastiraki': 'athens',
    'psyrri': 'athens',
    'syntagma': 'athens',
    'kolonaki': 'athens',
    'exarchia': 'athens',
    'koukaki': 'athens',
    'pangrati': 'athens',
    'kifisia': 'athens',
    'glyfada': 'athens',
    'piraeus': 'athens',
    'marousi': 'athens',
    'chalandri': 'athens',
    'peristeri': 'athens',
    'kallithea': 'athens',
    'nea smyrni': 'athens',

    // ==================== IRELAND - Dublin ====================
    'temple bar': 'dublin',
    'grafton street': 'dublin',
    'smithfield': 'dublin',
    'rathmines': 'dublin',
    'ranelagh': 'dublin',
    'portobello': 'dublin',
    'dun laoghaire': 'dublin',
    'ballsbridge': 'dublin',
    'howth': 'dublin',
    'dalkey': 'dublin',
    'sandymount': 'dublin',
    'clontarf': 'dublin',
    'drumcondra': 'dublin',
    'glasnevin': 'dublin',
    'tallaght': 'dublin',
    'swords': 'dublin',
    'blanchardstown': 'dublin',
    'lucan': 'dublin',
    'bray': 'dublin',

    // ==================== BELGIUM - Brussels ====================
    'grand place': 'brussels',
    'ixelles': 'brussels',
    'saint gilles': 'brussels',
    'schaerbeek': 'brussels',
    'etterbeek': 'brussels',
    'uccle': 'brussels',
    'forest': 'brussels',
    'anderlecht': 'brussels',
    'molenbeek': 'brussels',
    'jette': 'brussels',
    'evere': 'brussels',
    'woluwe': 'brussels',
    'auderghem': 'brussels',
    'watermael': 'brussels',

    // ==================== SOUTH AFRICA - Cape Town ====================
    'waterfront': 'cape town',
    'sea point': 'cape town',
    'camps bay': 'cape town',
    'clifton': 'cape town',
    'green point': 'cape town',
    'gardens': 'cape town',
    'woodstock': 'cape town',
    'observatory': 'cape town',
    'rondebosch': 'cape town',
    'claremont': 'cape town',
    'constantia': 'cape town',
    'muizenberg': 'cape town',
    'kalk bay': 'cape town',
    'simons town': 'cape town',
    'stellenbosch': 'cape town',
    'paarl': 'cape town',
    'franschhoek': 'cape town',

    // ==================== EGYPT - Cairo ====================
    'downtown cairo': 'cairo',
    'zamalek': 'cairo',
    'maadi': 'cairo',
    'heliopolis': 'cairo',
    'nasr city': 'cairo',
    'garden city': 'cairo',
    'islamic cairo': 'cairo',
    'coptic cairo': 'cairo',
    'giza': 'cairo',
    'dokki': 'cairo',
    'mohandessin': 'cairo',
    'new cairo': 'cairo',
    '6th of october': 'cairo',
    'sheikh zayed': 'cairo',

    // ==================== NEW ZEALAND - Auckland ====================
    'cbd auckland': 'auckland',
    'ponsonby': 'auckland',
    'parnell': 'auckland',
    'newmarket': 'auckland',
    'mount eden': 'auckland',
    'grey lynn': 'auckland',
    'freemans bay': 'auckland',
    'mission bay': 'auckland',
    'devonport': 'auckland',
    'takapuna': 'auckland',
    'north shore': 'auckland',
    'manukau': 'auckland',
    'henderson': 'auckland',
    'waitakere': 'auckland',
    'howick': 'auckland',
    'botany': 'auckland',
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
