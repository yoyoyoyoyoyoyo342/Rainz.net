import { useEffect, useState, useMemo } from "react";

interface EmbedWeatherBackgroundProps {
  condition?: string;
  theme?: "light" | "dark";
}

// Export function to check if snow condition for text color
export function isSnowCondition(condition?: string): boolean {
  if (!condition) return false;
  const lowerCondition = condition.toLowerCase();
  return lowerCondition.includes('snow') || lowerCondition.includes('sleet') || lowerCondition.includes('ice') || lowerCondition.includes('blizzard');
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
        /* Clear sun - cartoon style with rays */
        .embed-clear-sun {
          position: absolute;
          width: 50px;
          height: 50px;
          top: 8%;
          right: 10%;
          background: radial-gradient(circle, #FFE066 0%, #FFD700 40%, #FFA500 70%, transparent 75%);
          border-radius: 50%;
          box-shadow: 
            0 0 20px rgba(255, 200, 50, 0.6),
            0 0 40px rgba(255, 200, 50, 0.3);
          animation: embedSunPulse 4s ease-in-out infinite;
        }
        
        .embed-clear-sun::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 70px;
          height: 70px;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, rgba(255, 220, 100, 0.4) 0%, transparent 70%);
          border-radius: 50%;
          animation: embedSunRays 3s ease-in-out infinite alternate;
        }
        
        @keyframes embedSunPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes embedSunRays {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
          100% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.6; }
        }
        
        /* Partial sun for partly cloudy - cartoon style */
        .embed-partial-sun {
          position: absolute;
          width: 35px;
          height: 35px;
          top: 6%;
          right: 18%;
          background: radial-gradient(circle, #FFE066 0%, #FFD700 50%, #FFA500 80%, transparent 85%);
          border-radius: 50%;
          box-shadow: 0 0 15px rgba(255, 200, 50, 0.5);
          animation: embedSunPulse 5s ease-in-out infinite;
        }
        
        /* Cartoon cloud base style */
        .embed-cloud {
          position: absolute;
          background: #ffffff;
          border-radius: 100px;
          box-shadow: 
            inset -4px -4px 0 rgba(200, 210, 230, 0.5),
            2px 4px 8px rgba(0, 0, 0, 0.1);
          animation: embedFloat 15s infinite ease-in-out;
        }
        
        .embed-cloud::before,
        .embed-cloud::after {
          content: '';
          position: absolute;
          background: #ffffff;
          border-radius: 50%;
          box-shadow: inset -3px -3px 0 rgba(200, 210, 230, 0.5);
        }
        
        /* Partly cloudy - light fluffy clouds */
        .embed-cloud-partial-1 {
          width: 55px;
          height: 22px;
          top: 12%;
          right: 3%;
          animation-duration: 20s;
          background: rgba(255, 255, 255, 0.85);
        }
        
        .embed-cloud-partial-1::before {
          width: 28px;
          height: 28px;
          top: -14px;
          left: 8px;
          background: rgba(255, 255, 255, 0.85);
        }
        
        .embed-cloud-partial-1::after {
          width: 20px;
          height: 20px;
          top: -8px;
          left: 28px;
          background: rgba(255, 255, 255, 0.85);
        }
        
        .embed-cloud-partial-2 {
          width: 40px;
          height: 16px;
          top: 38%;
          left: -15%;
          animation-duration: 25s;
          animation-delay: 5s;
          background: rgba(255, 255, 255, 0.7);
        }
        
        .embed-cloud-partial-2::before {
          width: 20px;
          height: 20px;
          top: -10px;
          left: 6px;
          background: rgba(255, 255, 255, 0.7);
        }
        
        .embed-cloud-partial-2::after {
          width: 14px;
          height: 14px;
          top: -5px;
          left: 20px;
          background: rgba(255, 255, 255, 0.7);
        }
        
        /* Regular clouds - cartoon puffy style */
        .embed-cloud-1 {
          width: 50px;
          height: 20px;
          top: 15%;
          left: -20%;
          animation-duration: 18s;
          background: rgba(255, 255, 255, 0.9);
        }
        
        .embed-cloud-1::before {
          width: 24px;
          height: 24px;
          top: -12px;
          left: 6px;
          background: rgba(255, 255, 255, 0.9);
        }
        
        .embed-cloud-1::after {
          width: 18px;
          height: 18px;
          top: -7px;
          left: 24px;
          background: rgba(255, 255, 255, 0.9);
        }
        
        .embed-cloud-2 {
          width: 40px;
          height: 16px;
          top: 42%;
          left: -15%;
          animation-duration: 22s;
          animation-delay: 3s;
          background: rgba(255, 255, 255, 0.8);
        }
        
        .embed-cloud-2::before {
          width: 20px;
          height: 20px;
          top: -10px;
          left: 5px;
          background: rgba(255, 255, 255, 0.8);
        }
        
        .embed-cloud-2::after {
          width: 14px;
          height: 14px;
          top: -5px;
          left: 18px;
          background: rgba(255, 255, 255, 0.8);
        }
        
        @keyframes embedFloat {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(calc(100% + 320px)); }
        }
        
        /* Overcast - heavy grey cartoon clouds */
        .embed-overcast-layer {
          position: absolute;
          width: 100%;
          height: 40%;
          background: linear-gradient(to bottom, rgba(120, 125, 135, 0.4), transparent);
        }
        
        .embed-overcast-1 {
          top: 0;
          animation: embedOvercastDrift 25s ease-in-out infinite;
        }
        
        .embed-overcast-2 {
          top: 12%;
          animation: embedOvercastDrift 30s ease-in-out infinite reverse;
        }
        
        @keyframes embedOvercastDrift {
          0%, 100% { transform: translateX(-3%); }
          50% { transform: translateX(3%); }
        }
        
        .embed-overcast-cloud {
          position: absolute;
          background: #9a9ea8;
          border-radius: 100px;
          box-shadow: 
            inset -5px -5px 0 rgba(80, 85, 95, 0.4),
            3px 5px 10px rgba(0, 0, 0, 0.15);
          animation: embedOvercastFloat 20s infinite ease-in-out;
        }
        
        .embed-overcast-cloud::before,
        .embed-overcast-cloud::after {
          content: '';
          position: absolute;
          background: #9a9ea8;
          border-radius: 50%;
          box-shadow: inset -4px -4px 0 rgba(80, 85, 95, 0.4);
        }
        
        .embed-overcast-cloud-1 {
          width: 80px;
          height: 28px;
          top: 8%;
          left: -25%;
          animation-duration: 22s;
        }
        
        .embed-overcast-cloud-1::before {
          width: 35px;
          height: 35px;
          top: -18px;
          left: 12px;
        }
        
        .embed-overcast-cloud-1::after {
          width: 26px;
          height: 26px;
          top: -10px;
          left: 38px;
        }
        
        .embed-overcast-cloud-2 {
          width: 60px;
          height: 22px;
          top: 32%;
          left: -18%;
          animation-duration: 28s;
          animation-delay: 6s;
        }
        
        .embed-overcast-cloud-2::before {
          width: 26px;
          height: 26px;
          top: -13px;
          left: 8px;
        }
        
        .embed-overcast-cloud-2::after {
          width: 18px;
          height: 18px;
          top: -6px;
          left: 28px;
        }
        
        @keyframes embedOvercastFloat {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(calc(100% + 350px)); }
        }
        
        /* Fog layers - soft misty cartoon style */
        .embed-fog {
          position: absolute;
          width: 200%;
          height: 35%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(220, 225, 235, 0.5) 20%,
            rgba(235, 240, 250, 0.6) 50%,
            rgba(220, 225, 235, 0.5) 80%,
            transparent 100%
          );
          border-radius: 100px;
        }
        
        .embed-fog-1 {
          top: 5%;
          animation: embedFogDrift 12s ease-in-out infinite;
        }
        
        .embed-fog-2 {
          top: 30%;
          animation: embedFogDrift 16s ease-in-out infinite reverse;
        }
        
        .embed-fog-3 {
          top: 55%;
          animation: embedFogDrift 14s ease-in-out infinite;
          animation-delay: 2s;
        }
        
        @keyframes embedFogDrift {
          0%, 100% { transform: translateX(-25%); }
          50% { transform: translateX(0%); }
        }
        
        /* Rain - cartoon droplets */
        .embed-raindrop {
          position: absolute;
          top: -10px;
          width: 3px;
          height: 14px;
          background: linear-gradient(to bottom, transparent, rgba(100, 150, 200, 0.7), rgba(130, 180, 230, 0.9));
          border-radius: 0 0 3px 3px;
          animation: embedRain linear infinite;
        }
        
        @keyframes embedRain {
          0% { transform: translateY(-10px); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(220px); opacity: 0; }
        }
        
        /* Snow - cartoon snowflakes */
        .embed-snowflake {
          position: absolute;
          top: -20px;
          opacity: 0.9;
          text-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
          animation: embedSnow linear infinite;
        }
        
        @keyframes embedSnow {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
          10% { opacity: 0.9; }
          100% { transform: translateY(220px) rotate(360deg); opacity: 0; }
        }
        
        /* Stars - twinkling cartoon style */
        .embed-star {
          position: absolute;
          width: 3px;
          height: 3px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 0 4px white;
          animation: embedTwinkle ease-in-out infinite;
        }
        
        @keyframes embedTwinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        
        /* Lightning flash */
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