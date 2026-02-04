import { useEffect, useState, useMemo } from "react";

interface EmbedWeatherBackgroundProps {
  condition?: string;
  theme?: "light" | "dark";
}

export function EmbedWeatherBackground({ condition, theme = "light" }: EmbedWeatherBackgroundProps) {
  const [weatherType, setWeatherType] = useState<'clear' | 'partly_cloudy' | 'cloudy' | 'overcast' | 'rain' | 'snow' | 'storm' | 'fog' | 'night'>('clear');

  useEffect(() => {
    if (!condition) return;
    
    const lowerCondition = condition.toLowerCase();
    
    // More specific condition matching
    if (lowerCondition.includes('thunder') || lowerCondition.includes('storm')) {
      setWeatherType('storm');
    } else if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle') || lowerCondition.includes('shower')) {
      setWeatherType('rain');
    } else if (lowerCondition.includes('snow') || lowerCondition.includes('sleet') || lowerCondition.includes('ice') || lowerCondition.includes('blizzard')) {
      setWeatherType('snow');
    } else if (lowerCondition.includes('fog') || lowerCondition.includes('mist') || lowerCondition.includes('haze')) {
      setWeatherType('fog');
    } else if (lowerCondition.includes('overcast')) {
      setWeatherType('overcast');
    } else if (lowerCondition.includes('partly') || lowerCondition.includes('mostly sunny') || lowerCondition.includes('mostly clear')) {
      setWeatherType('partly_cloudy');
    } else if (lowerCondition.includes('cloud') || lowerCondition.includes('mostly cloudy')) {
      setWeatherType('cloudy');
    } else if (lowerCondition.includes('night') || lowerCondition.includes('clear night')) {
      setWeatherType('night');
    } else {
      setWeatherType('clear');
    }
  }, [condition]);

  // Generate particles once
  const raindrops = useMemo(() => 
    Array.from({ length: 20 }).map((_, i) => ({
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      duration: `${0.4 + Math.random() * 0.3}s`
    })), []);

  const snowflakes = useMemo(() => 
    Array.from({ length: 15 }).map((_, i) => ({
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 4}s`,
      duration: `${3 + Math.random() * 3}s`,
      size: `${8 + Math.random() * 6}px`
    })), []);

  const stars = useMemo(() => 
    Array.from({ length: 20 }).map((_, i) => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 50}%`,
      delay: `${Math.random() * 2}s`,
      duration: `${1.5 + Math.random() * 1.5}s`
    })), []);

  const isDark = theme === "dark";

  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl">
      {/* Base gradient background */}
      <div className={`absolute inset-0 transition-all duration-700 ${
        weatherType === 'night' ? 'bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950' :
        weatherType === 'clear' ? (isDark 
          ? 'bg-gradient-to-br from-blue-900 via-blue-800 to-sky-900' 
          : 'bg-gradient-to-br from-sky-400 via-blue-400 to-blue-500') :
        weatherType === 'partly_cloudy' ? (isDark
          ? 'bg-gradient-to-br from-blue-800 via-slate-700 to-blue-900'
          : 'bg-gradient-to-br from-sky-400 via-blue-300 to-sky-300') :
        weatherType === 'cloudy' ? (isDark
          ? 'bg-gradient-to-br from-slate-700 via-gray-700 to-slate-800'
          : 'bg-gradient-to-br from-gray-400 via-gray-300 to-gray-200') :
        weatherType === 'overcast' ? (isDark
          ? 'bg-gradient-to-br from-slate-800 via-gray-800 to-slate-900'
          : 'bg-gradient-to-br from-slate-500 via-gray-500 to-slate-400') :
        weatherType === 'fog' ? (isDark
          ? 'bg-gradient-to-br from-slate-700 via-gray-600 to-slate-700'
          : 'bg-gradient-to-br from-gray-300 via-slate-300 to-gray-400') :
        weatherType === 'rain' ? (isDark
          ? 'bg-gradient-to-br from-slate-800 via-gray-700 to-slate-800'
          : 'bg-gradient-to-br from-slate-500 via-gray-400 to-slate-400') :
        weatherType === 'snow' ? (isDark
          ? 'bg-gradient-to-br from-slate-800 via-blue-900 to-slate-700'
          : 'bg-gradient-to-br from-blue-200 via-slate-200 to-blue-100') :
        weatherType === 'storm' ? (isDark
          ? 'bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900'
          : 'bg-gradient-to-br from-slate-600 via-gray-500 to-slate-500') :
        isDark 
          ? 'bg-gradient-to-br from-slate-700 via-gray-700 to-slate-800'
          : 'bg-gradient-to-br from-gray-300 via-slate-300 to-gray-400'
      }`} />

      {/* Subtle sun glow for clear day */}
      {weatherType === 'clear' && !isDark && (
        <div className="embed-clear-sun" />
      )}

      {/* Partial sun and clouds for partly cloudy */}
      {weatherType === 'partly_cloudy' && (
        <>
          {!isDark && <div className="embed-partial-sun" />}
          <div className={`embed-cloud embed-cloud-partial-1 ${isDark ? 'opacity-25' : 'opacity-50'}`} />
          <div className={`embed-cloud embed-cloud-partial-2 ${isDark ? 'opacity-20' : 'opacity-40'}`} />
        </>
      )}

      {/* Regular clouds for cloudy weather */}
      {weatherType === 'cloudy' && (
        <>
          <div className={`embed-cloud embed-cloud-1 ${isDark ? 'opacity-20' : 'opacity-35'}`} />
          <div className={`embed-cloud embed-cloud-2 ${isDark ? 'opacity-15' : 'opacity-30'}`} />
        </>
      )}

      {/* Heavy overcast clouds */}
      {weatherType === 'overcast' && (
        <>
          <div className={`embed-overcast-layer embed-overcast-1 ${isDark ? 'opacity-40' : 'opacity-50'}`} />
          <div className={`embed-overcast-layer embed-overcast-2 ${isDark ? 'opacity-30' : 'opacity-40'}`} />
          <div className={`embed-overcast-cloud embed-overcast-cloud-1 ${isDark ? 'opacity-50' : 'opacity-60'}`} />
          <div className={`embed-overcast-cloud embed-overcast-cloud-2 ${isDark ? 'opacity-40' : 'opacity-50'}`} />
        </>
      )}

      {/* Fog effect */}
      {weatherType === 'fog' && (
        <>
          <div className={`embed-fog embed-fog-1 ${isDark ? 'opacity-40' : 'opacity-50'}`} />
          <div className={`embed-fog embed-fog-2 ${isDark ? 'opacity-30' : 'opacity-40'}`} />
          <div className={`embed-fog embed-fog-3 ${isDark ? 'opacity-20' : 'opacity-30'}`} />
        </>
      )}

      {/* Clouds for rain/storm */}
      {(weatherType === 'rain' || weatherType === 'storm') && (
        <>
          <div className={`embed-cloud embed-cloud-1 ${isDark ? 'opacity-20' : 'opacity-30'}`} />
          <div className={`embed-cloud embed-cloud-2 ${isDark ? 'opacity-15' : 'opacity-25'}`} />
        </>
      )}

      {/* Rain animation */}
      {(weatherType === 'rain' || weatherType === 'storm') && (
        <div className="absolute inset-0 overflow-hidden">
          {raindrops.map((drop, i) => (
            <div 
              key={i} 
              className="embed-raindrop"
              style={{
                left: drop.left,
                animationDelay: drop.delay,
                animationDuration: drop.duration
              }} 
            />
          ))}
        </div>
      )}

      {/* Snow animation */}
      {weatherType === 'snow' && (
        <div className="absolute inset-0 overflow-hidden">
          {snowflakes.map((flake, i) => (
            <div 
              key={i} 
              className={`embed-snowflake ${isDark ? 'text-blue-200' : 'text-white'}`}
              style={{
                left: flake.left,
                animationDelay: flake.delay,
                animationDuration: flake.duration,
                fontSize: flake.size
              }}
            >
              ❄
            </div>
          ))}
        </div>
      )}

      {/* Stars for night */}
      {weatherType === 'night' && (
        <div className="absolute inset-0 overflow-hidden">
          {stars.map((star, i) => (
            <div 
              key={i} 
              className="embed-star"
              style={{
                left: star.left,
                top: star.top,
                animationDelay: star.delay,
                animationDuration: star.duration
              }} 
            />
          ))}
        </div>
      )}

      {/* Lightning flash for storm */}
      {weatherType === 'storm' && (
        <div className="embed-lightning" />
      )}

      {/* Moon glow for night */}
      {weatherType === 'night' && (
        <div className="absolute top-4 right-4 w-10 h-10 bg-slate-200/80 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)]" />
      )}

      <style>{`
        /* Clear sun */
        .embed-clear-sun {
          position: absolute;
          width: 50px;
          height: 50px;
          top: 8%;
          right: 10%;
          background: radial-gradient(circle, rgba(255, 230, 100, 0.9) 0%, rgba(255, 200, 50, 0.5) 50%, transparent 70%);
          border-radius: 50%;
          box-shadow: 0 0 40px rgba(255, 230, 100, 0.4);
          animation: embedSunPulse 4s ease-in-out infinite;
        }
        
        @keyframes embedSunPulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.1); opacity: 1; }
        }
        
        /* Partial sun for partly cloudy */
        .embed-partial-sun {
          position: absolute;
          width: 40px;
          height: 40px;
          top: 6%;
          right: 15%;
          background: radial-gradient(circle, rgba(255, 230, 100, 0.8) 0%, rgba(255, 200, 50, 0.4) 50%, transparent 70%);
          border-radius: 50%;
          box-shadow: 0 0 30px rgba(255, 230, 100, 0.3);
          animation: embedSunPulse 5s ease-in-out infinite;
        }
        
        /* Partial clouds */
        .embed-cloud-partial-1 {
          width: 70px;
          height: 28px;
          top: 10%;
          right: 5%;
          animation-duration: 20s;
          background: rgba(255, 255, 255, 0.7) !important;
        }
        
        .embed-cloud-partial-1::before {
          width: 35px;
          height: 35px;
          top: -15px;
          left: 10px;
          background: rgba(255, 255, 255, 0.7) !important;
        }
        
        .embed-cloud-partial-2 {
          width: 50px;
          height: 20px;
          top: 35%;
          left: -10%;
          animation-duration: 25s;
          animation-delay: 5s;
          background: rgba(255, 255, 255, 0.5) !important;
        }
        
        .embed-cloud-partial-2::before {
          width: 25px;
          height: 25px;
          top: -10px;
          left: 8px;
          background: rgba(255, 255, 255, 0.5) !important;
        }
        
        .embed-cloud {
          position: absolute;
          background: rgba(255, 255, 255, 0.4);
          border-radius: 50px;
          animation: embedFloat 15s infinite ease-in-out;
        }
        
        .embed-cloud::before {
          content: '';
          position: absolute;
          background: rgba(255, 255, 255, 0.4);
          border-radius: 50px;
        }
        
        .embed-cloud-1 {
          width: 60px;
          height: 24px;
          top: 15%;
          left: -20%;
          animation-duration: 18s;
        }
        
        .embed-cloud-1::before {
          width: 30px;
          height: 30px;
          top: -12px;
          left: 8px;
        }
        
        .embed-cloud-2 {
          width: 50px;
          height: 20px;
          top: 40%;
          left: -15%;
          animation-duration: 22s;
          animation-delay: 3s;
        }
        
        .embed-cloud-2::before {
          width: 25px;
          height: 25px;
          top: -10px;
          left: 10px;
        }
        
        @keyframes embedFloat {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(calc(100% + 320px)); }
        }
        
        /* Overcast layers */
        .embed-overcast-layer {
          position: absolute;
          width: 100%;
          height: 35%;
          background: linear-gradient(to bottom, rgba(100, 100, 110, 0.5), transparent);
        }
        
        .embed-overcast-1 {
          top: 0;
          animation: embedOvercastDrift 25s ease-in-out infinite;
        }
        
        .embed-overcast-2 {
          top: 15%;
          animation: embedOvercastDrift 30s ease-in-out infinite reverse;
        }
        
        @keyframes embedOvercastDrift {
          0%, 100% { transform: translateX(-3%); }
          50% { transform: translateX(3%); }
        }
        
        .embed-overcast-cloud {
          position: absolute;
          background: rgba(130, 130, 140, 0.7);
          border-radius: 50px;
          animation: embedOvercastFloat 20s infinite ease-in-out;
        }
        
        .embed-overcast-cloud::before {
          content: '';
          position: absolute;
          background: rgba(130, 130, 140, 0.7);
          border-radius: 50px;
        }
        
        .embed-overcast-cloud-1 {
          width: 100px;
          height: 35px;
          top: 8%;
          left: -25%;
          animation-duration: 22s;
        }
        
        .embed-overcast-cloud-1::before {
          width: 45px;
          height: 45px;
          top: -20px;
          left: 15px;
        }
        
        .embed-overcast-cloud-2 {
          width: 80px;
          height: 28px;
          top: 30%;
          left: -20%;
          animation-duration: 28s;
          animation-delay: 6s;
        }
        
        .embed-overcast-cloud-2::before {
          width: 35px;
          height: 35px;
          top: -15px;
          left: 12px;
        }
        
        @keyframes embedOvercastFloat {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(calc(100% + 350px)); }
        }
        
        /* Fog layers */
        .embed-fog {
          position: absolute;
          width: 200%;
          height: 35%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(200, 200, 210, 0.4) 25%,
            rgba(220, 220, 230, 0.5) 50%,
            rgba(200, 200, 210, 0.4) 75%,
            transparent 100%
          );
        }
        
        .embed-fog-1 {
          top: 0;
          animation: embedFogDrift 12s ease-in-out infinite;
        }
        
        .embed-fog-2 {
          top: 25%;
          animation: embedFogDrift 16s ease-in-out infinite reverse;
        }
        
        .embed-fog-3 {
          top: 50%;
          animation: embedFogDrift 14s ease-in-out infinite;
          animation-delay: 2s;
        }
        
        @keyframes embedFogDrift {
          0%, 100% { transform: translateX(-25%); }
          50% { transform: translateX(0%); }
        }
        
        .embed-raindrop {
          position: absolute;
          top: -10px;
          width: 2px;
          height: 12px;
          background: linear-gradient(to bottom, transparent, rgba(150, 180, 220, 0.6));
          animation: embedRain linear infinite;
        }
        
        @keyframes embedRain {
          0% { transform: translateY(-10px); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(220px); opacity: 0; }
        }
        
        .embed-snowflake {
          position: absolute;
          top: -20px;
          opacity: 0.8;
          animation: embedSnow linear infinite;
        }
        
        @keyframes embedSnow {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
          10% { opacity: 0.8; }
          100% { transform: translateY(220px) rotate(360deg); opacity: 0; }
        }
        
        .embed-star {
          position: absolute;
          width: 2px;
          height: 2px;
          background: white;
          border-radius: 50%;
          animation: embedTwinkle ease-in-out infinite;
        }
        
        @keyframes embedTwinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        
        .embed-lightning {
          position: absolute;
          inset: 0;
          background: white;
          opacity: 0;
          animation: embedFlash 4s infinite;
        }
        
        @keyframes embedFlash {
          0%, 89%, 91%, 93%, 100% { opacity: 0; }
          90%, 92% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}