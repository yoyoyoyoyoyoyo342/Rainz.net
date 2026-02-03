import { useEffect, useState, useMemo } from "react";

interface EmbedWeatherBackgroundProps {
  condition?: string;
  theme?: "light" | "dark";
}

export function EmbedWeatherBackground({ condition, theme = "light" }: EmbedWeatherBackgroundProps) {
  const [weatherType, setWeatherType] = useState<'clear' | 'rain' | 'snow' | 'cloudy' | 'storm' | 'night'>('clear');

  useEffect(() => {
    if (!condition) return;
    
    const lowerCondition = condition.toLowerCase();
    
    if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle') || lowerCondition.includes('shower')) {
      setWeatherType('rain');
    } else if (lowerCondition.includes('snow') || lowerCondition.includes('sleet') || lowerCondition.includes('ice')) {
      setWeatherType('snow');
    } else if (lowerCondition.includes('thunder') || lowerCondition.includes('storm')) {
      setWeatherType('storm');
    } else if (lowerCondition.includes('cloud') || lowerCondition.includes('overcast') || lowerCondition.includes('fog')) {
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

      {/* Animated clouds for cloudy weather */}
      {(weatherType === 'cloudy' || weatherType === 'rain' || weatherType === 'storm') && (
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

      {/* Subtle sun glow for clear day */}
      {weatherType === 'clear' && !isDark && (
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-yellow-300/30 rounded-full blur-xl" />
      )}

      {/* Moon glow for night */}
      {weatherType === 'night' && (
        <div className="absolute top-4 right-4 w-10 h-10 bg-slate-200/80 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)]" />
      )}

      <style>{`
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
