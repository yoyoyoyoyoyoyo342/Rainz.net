import { useEffect, useState } from "react";

interface AnimatedWeatherBackgroundProps {
  condition?: string;
  sunrise?: string;
  sunset?: string;
  moonPhase?: string;
}

export function AnimatedWeatherBackground({ condition, sunrise, sunset, moonPhase }: AnimatedWeatherBackgroundProps) {
  const [weatherType, setWeatherType] = useState<'clear' | 'partly_cloudy' | 'cloudy' | 'overcast' | 'rain' | 'snow' | 'storm' | 'fog' | 'sunrise' | 'sunset' | 'night'>('clear');
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'night' | 'sunrise' | 'sunset'>('day');
  const [showConditionOverlay, setShowConditionOverlay] = useState(false);

  // Determine time of day based on sunrise/sunset
  useEffect(() => {
    if (!sunrise || !sunset) return;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    // Parse sunrise/sunset times (format: "HH:MM")
    const parseSunTime = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const sunriseTime = parseSunTime(sunrise);
    const sunsetTime = parseSunTime(sunset);
    
    // Define golden hour windows (30 minutes before/after sunrise/sunset)
    const sunriseStart = sunriseTime - 30;
    const sunriseEnd = sunriseTime + 30;
    const sunsetStart = sunsetTime - 30;
    const sunsetEnd = sunsetTime + 30;
    
    if (currentTime >= sunriseStart && currentTime <= sunriseEnd) {
      setTimeOfDay('sunrise');
    } else if (currentTime >= sunsetStart && currentTime <= sunsetEnd) {
      setTimeOfDay('sunset');
    } else if (currentTime < sunriseTime || currentTime > sunsetTime) {
      setTimeOfDay('night');
    } else {
      setTimeOfDay('day');
    }
  }, [sunrise, sunset]);

  useEffect(() => {
    if (!condition) return;
    
    const lowerCondition = condition.toLowerCase();
    
    // Determine if we should show condition overlay during special times
    const hasWeatherCondition = 
      lowerCondition.includes('cloud') || 
      lowerCondition.includes('overcast') ||
      lowerCondition.includes('rain') ||
      lowerCondition.includes('drizzle') ||
      lowerCondition.includes('snow') ||
      lowerCondition.includes('sleet') ||
      lowerCondition.includes('fog') ||
      lowerCondition.includes('mist');
    
    // Check for special time of day backgrounds first
    if (timeOfDay === 'sunrise') {
      setWeatherType('sunrise');
      setShowConditionOverlay(hasWeatherCondition);
      return;
    } else if (timeOfDay === 'sunset') {
      setWeatherType('sunset');
      setShowConditionOverlay(hasWeatherCondition);
      return;
    } else if (timeOfDay === 'night') {
      setWeatherType('night');
      setShowConditionOverlay(hasWeatherCondition);
      return;
    }
    
    // Regular weather conditions during day - more specific matching
    setShowConditionOverlay(false);
    
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
    } else {
      setWeatherType('clear');
    }
  }, [condition, timeOfDay]);

  // Helper function to get moon phase CSS class
  const getMoonPhaseClass = (phase?: string): string => {
    if (!phase) return '';
    
    const phaseMap: Record<string, string> = {
      'NEW_MOON': 'moon-new',
      'WAXING_CRESCENT': 'moon-waxing-crescent',
      'FIRST_QUARTER': 'moon-first-quarter',
      'WAXING_GIBBOUS': 'moon-waxing-gibbous',
      'FULL_MOON': '',
      'WANING_GIBBOUS': 'moon-waning-gibbous',
      'LAST_QUARTER': 'moon-last-quarter',
      'WANING_CRESCENT': 'moon-waning-crescent'
    };
    
    return phaseMap[phase] || '';
  };

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base gradient background */}
      <div className={`absolute inset-0 transition-all duration-1000 ${
        weatherType === 'sunrise' ? 'bg-gradient-to-b from-blue-300 via-blue-200 to-red-200' :
        weatherType === 'sunset' ? 'bg-gradient-to-b from-pink-400 via-orange-400 to-indigo-900' :
        weatherType === 'night' ? 'bg-gradient-to-br from-indigo-950 via-blue-950 to-blue-900' :
        weatherType === 'clear' ? 'bg-gradient-to-br from-blue-400 via-blue-300 to-blue-200' :
        weatherType === 'partly_cloudy' ? 'bg-gradient-to-br from-sky-400 via-blue-300 to-sky-300' :
        weatherType === 'cloudy' ? 'bg-gradient-to-br from-gray-400 via-gray-300 to-gray-200' :
        weatherType === 'overcast' ? 'bg-gradient-to-br from-slate-500 via-gray-500 to-slate-400' :
        weatherType === 'fog' ? 'bg-gradient-to-br from-gray-300 via-slate-300 to-gray-400' :
        weatherType === 'rain' ? 'bg-gradient-to-br from-gray-500 via-gray-400 to-gray-300' :
        weatherType === 'snow' ? 'bg-gradient-to-br from-blue-200 via-blue-100 to-gray-100' :
        weatherType === 'storm' ? 'bg-gradient-to-br from-gray-700 via-gray-600 to-gray-500' :
        'bg-gradient-to-br from-gray-400 via-gray-300 to-gray-200'
      }`} />

      {/* Moon for night */}
      {weatherType === 'night' && (
        <div className={`moon ${getMoonPhaseClass(moonPhase)}`} />
      )}

      {/* Sun for sunrise */}
      {weatherType === 'sunrise' && (
        <div className="sun sun-rise" />
      )}

      {/* Sun for sunset */}
      {weatherType === 'sunset' && (
        <div className="sun sun-set" />
      )}

      {/* Bright sun for clear weather */}
      {weatherType === 'clear' && (
        <div className="clear-sun" />
      )}

      {/* Partial sun for partly cloudy */}
      {weatherType === 'partly_cloudy' && (
        <>
          <div className="partial-sun" />
          <div className="cloud cloud-partial-1" />
          <div className="cloud cloud-partial-2" />
        </>
      )}

      {/* Regular clouds for cloudy */}
      {weatherType === 'cloudy' && (
        <>
          <div className="cloud cloud-1" />
          <div className="cloud cloud-2" />
          <div className="cloud cloud-3" />
        </>
      )}

      {/* Heavy overcast clouds */}
      {weatherType === 'overcast' && (
        <>
          <div className="overcast-layer overcast-1" />
          <div className="overcast-layer overcast-2" />
          <div className="overcast-layer overcast-3" />
          <div className="overcast-cloud overcast-cloud-1" />
          <div className="overcast-cloud overcast-cloud-2" />
          <div className="overcast-cloud overcast-cloud-3" />
        </>
      )}

      {/* Fog/mist effect */}
      {weatherType === 'fog' && (
        <>
          <div className="fog-layer fog-1" />
          <div className="fog-layer fog-2" />
          <div className="fog-layer fog-3" />
        </>
      )}

      {/* Animated clouds for rain/storm */}
      {(weatherType === 'rain' || weatherType === 'storm') && (
        <>
          <div className="cloud cloud-1" />
          <div className="cloud cloud-2" />
          <div className="cloud cloud-3" />
        </>
      )}

      {/* Condition overlay for night/sunrise/sunset */}
      {showConditionOverlay && (weatherType === 'night' || weatherType === 'sunrise' || weatherType === 'sunset') && condition && (
        <>
          {/* Show clouds for cloudy conditions */}
          {(condition.toLowerCase().includes('cloud') || condition.toLowerCase().includes('overcast')) && (
            <>
              <div className="cloud cloud-1 opacity-60" />
              <div className="cloud cloud-2 opacity-50" />
              <div className="cloud cloud-3 opacity-70" />
            </>
          )}
          
          {/* Show rain overlay */}
          {(condition.toLowerCase().includes('rain') || condition.toLowerCase().includes('drizzle')) && (
            <div className="rain-container opacity-70">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="raindrop" style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${0.5 + Math.random() * 0.5}s`
                }} />
              ))}
            </div>
          )}
          
          {/* Show snow overlay */}
          {(condition.toLowerCase().includes('snow') || condition.toLowerCase().includes('sleet')) && (
            <div className="snow-container opacity-70">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="snowflake" style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${5 + Math.random() * 5}s`,
                  fontSize: `${10 + Math.random() * 10}px`
                }}>❄</div>
              ))}
            </div>
          )}
          
          {/* Show fog/mist overlay */}
          {(condition.toLowerCase().includes('fog') || condition.toLowerCase().includes('mist')) && (
            <>
              <div className="fog-layer fog-1 opacity-50" />
              <div className="fog-layer fog-2 opacity-40" />
            </>
          )}
        </>
      )}

      {/* Rain animation */}
      {(weatherType === 'rain' || weatherType === 'storm') && (
        <div className="rain-container">
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} className="raindrop" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${0.5 + Math.random() * 0.5}s`
            }} />
          ))}
        </div>
      )}

      {/* Snow animation with snowman */}
      {weatherType === 'snow' && (
        <>
          <div className="snow-container">
            {Array.from({ length: 60 }).map((_, i) => (
              <div key={i} className="snowflake" style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 5}s`,
                fontSize: `${10 + Math.random() * 15}px`,
                opacity: 0.7 + Math.random() * 0.3
              }}>❄</div>
            ))}
          </div>
          {/* Snowman in bottom right */}
          <div className="snowman">
            <div className="snowman-head">
              <div className="snowman-eye snowman-eye-left">•</div>
              <div className="snowman-eye snowman-eye-right">•</div>
              <div className="snowman-carrot"></div>
              <div className="snowman-smile">⌣</div>
            </div>
            <div className="snowman-body">
              <div className="snowman-button snowman-button-1">•</div>
              <div className="snowman-button snowman-button-2">•</div>
              <div className="snowman-button snowman-button-3">•</div>
            </div>
            <div className="snowman-bottom"></div>
            <div className="snowman-arm snowman-arm-left"></div>
            <div className="snowman-arm snowman-arm-right"></div>
          </div>
        </>
      )}

      {/* Lightning for storm */}
      {weatherType === 'storm' && (
        <div className="lightning" />
      )}

      {/* Subtle stars for night */}
      {weatherType === 'night' && (
        <div className="stars-container">
          {Array.from({ length: 80 }).map((_, i) => (
            <div key={i} className="star" style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 60}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }} />
          ))}
        </div>
      )}

      <style>{`
        /* Moon - minimalist style */
        .moon {
          position: absolute;
          width: 80px;
          height: 80px;
          top: 15%;
          right: 15%;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 50%;
          box-shadow: 0 0 30px rgba(255, 255, 255, 0.3);
        }
        
        /* Moon phases */
        .moon-new {
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.3);
        }
        
        .moon-waxing-crescent::before,
        .moon-waning-crescent::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: rgba(20, 30, 60, 0.9);
        }
        
        .moon-waxing-crescent::before {
          right: 20%;
        }
        
        .moon-waning-crescent::before {
          left: 20%;
        }
        
        .moon-first-quarter::before,
        .moon-last-quarter::before {
          content: '';
          position: absolute;
          width: 50%;
          height: 100%;
          background: rgba(20, 30, 60, 0.9);
        }
        
        .moon-first-quarter::before {
          right: 0;
          border-radius: 0 50% 50% 0;
        }
        
        .moon-last-quarter::before {
          left: 0;
          border-radius: 50% 0 0 50%;
        }
        
        .moon-waxing-gibbous::before,
        .moon-waning-gibbous::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: rgba(20, 30, 60, 0.9);
        }
        
        .moon-waxing-gibbous::before {
          right: -50%;
        }
        
        .moon-waning-gibbous::before {
          left: -50%;
        }
        
        /* Sun - minimalist style */
        .sun {
          position: absolute;
          width: 100px;
          height: 100px;
          background: rgba(255, 230, 100, 0.9);
          border-radius: 50%;
          box-shadow: 0 0 50px rgba(255, 230, 100, 0.5);
        }
        
        .sun-rise {
          bottom: 10%;
          left: 50%;
          transform: translateX(-50%);
        }
        
        .sun-set {
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        
        /* Stars - subtle and atmospheric */
        .stars-container {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }
        
        .star {
          position: absolute;
          width: 2px;
          height: 2px;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 50%;
          animation: twinkle linear infinite;
        }
        
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        
        /* Clear sun */
        .clear-sun {
          position: absolute;
          width: 120px;
          height: 120px;
          top: 10%;
          right: 15%;
          background: radial-gradient(circle, rgba(255, 230, 100, 0.9) 0%, rgba(255, 200, 50, 0.6) 50%, transparent 70%);
          border-radius: 50%;
          box-shadow: 0 0 80px rgba(255, 230, 100, 0.5), 0 0 120px rgba(255, 200, 50, 0.3);
          animation: sunPulse 4s ease-in-out infinite;
        }
        
        @keyframes sunPulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        
        /* Partial sun for partly cloudy */
        .partial-sun {
          position: absolute;
          width: 100px;
          height: 100px;
          top: 8%;
          right: 20%;
          background: radial-gradient(circle, rgba(255, 230, 100, 0.85) 0%, rgba(255, 200, 50, 0.5) 50%, transparent 70%);
          border-radius: 50%;
          box-shadow: 0 0 60px rgba(255, 230, 100, 0.4);
          animation: sunPulse 5s ease-in-out infinite;
        }
        
        /* Partial clouds - lighter, positioned to partially cover sun */
        .cloud-partial-1 {
          width: 140px;
          height: 50px;
          top: 12%;
          right: 10%;
          animation-duration: 35s;
          background: rgba(255, 255, 255, 0.7);
        }
        
        .cloud-partial-1::before {
          width: 60px;
          height: 60px;
          top: -30px;
          left: 20px;
          background: rgba(255, 255, 255, 0.7);
        }
        
        .cloud-partial-1::after {
          width: 70px;
          height: 45px;
          top: -18px;
          right: 20px;
          background: rgba(255, 255, 255, 0.7);
        }
        
        .cloud-partial-2 {
          width: 100px;
          height: 35px;
          top: 35%;
          left: -10%;
          animation-duration: 40s;
          animation-delay: 8s;
          background: rgba(255, 255, 255, 0.5);
        }
        
        .cloud-partial-2::before {
          width: 45px;
          height: 45px;
          top: -20px;
          left: 15px;
          background: rgba(255, 255, 255, 0.5);
        }
        
        .cloud {
          position: absolute;
          background: rgba(255, 255, 255, 0.4);
          border-radius: 100px;
          animation: float 20s infinite ease-in-out;
        }
        
        .cloud::before,
        .cloud::after {
          content: '';
          position: absolute;
          background: rgba(255, 255, 255, 0.4);
          border-radius: 100px;
        }
        
        .cloud-1 {
          width: 100px;
          height: 40px;
          top: 10%;
          left: -10%;
          animation-duration: 25s;
        }
        
        .cloud-1::before {
          width: 50px;
          height: 50px;
          top: -25px;
          left: 10px;
        }
        
        .cloud-1::after {
          width: 60px;
          height: 40px;
          top: -15px;
          right: 10px;
        }
        
        .cloud-2 {
          width: 120px;
          height: 50px;
          top: 30%;
          left: -15%;
          animation-duration: 30s;
          animation-delay: 5s;
        }
        
        .cloud-2::before {
          width: 60px;
          height: 60px;
          top: -30px;
          left: 15px;
        }
        
        .cloud-2::after {
          width: 70px;
          height: 50px;
          top: -20px;
          right: 15px;
        }
        
        .cloud-3 {
          width: 90px;
          height: 35px;
          top: 50%;
          left: -10%;
          animation-duration: 22s;
          animation-delay: 10s;
        }
        
        .cloud-3::before {
          width: 45px;
          height: 45px;
          top: -20px;
          left: 10px;
        }
        
        .cloud-3::after {
          width: 55px;
          height: 35px;
          top: -12px;
          right: 10px;
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateX(0) translateY(0);
          }
          50% {
            transform: translateX(120vw) translateY(-20px);
          }
        }
        
        /* Overcast - heavy grey clouds covering the sky */
        .overcast-layer {
          position: absolute;
          width: 100%;
          height: 40%;
          background: linear-gradient(to bottom, rgba(100, 100, 110, 0.6), transparent);
        }
        
        .overcast-1 {
          top: 0;
          animation: overcastDrift 40s ease-in-out infinite;
        }
        
        .overcast-2 {
          top: 10%;
          animation: overcastDrift 50s ease-in-out infinite reverse;
          opacity: 0.7;
        }
        
        .overcast-3 {
          top: 20%;
          animation: overcastDrift 45s ease-in-out infinite;
          animation-delay: 5s;
          opacity: 0.5;
        }
        
        @keyframes overcastDrift {
          0%, 100% { transform: translateX(-5%); }
          50% { transform: translateX(5%); }
        }
        
        .overcast-cloud {
          position: absolute;
          background: rgba(130, 130, 140, 0.8);
          border-radius: 100px;
          animation: overcastFloat 30s infinite ease-in-out;
        }
        
        .overcast-cloud::before,
        .overcast-cloud::after {
          content: '';
          position: absolute;
          background: rgba(130, 130, 140, 0.8);
          border-radius: 100px;
        }
        
        .overcast-cloud-1 {
          width: 200px;
          height: 70px;
          top: 5%;
          left: -15%;
          animation-duration: 35s;
        }
        
        .overcast-cloud-1::before {
          width: 90px;
          height: 90px;
          top: -45px;
          left: 30px;
        }
        
        .overcast-cloud-1::after {
          width: 100px;
          height: 70px;
          top: -30px;
          right: 30px;
        }
        
        .overcast-cloud-2 {
          width: 180px;
          height: 60px;
          top: 25%;
          left: -20%;
          animation-duration: 40s;
          animation-delay: 8s;
        }
        
        .overcast-cloud-2::before {
          width: 80px;
          height: 80px;
          top: -40px;
          left: 25px;
        }
        
        .overcast-cloud-2::after {
          width: 90px;
          height: 60px;
          top: -25px;
          right: 25px;
        }
        
        .overcast-cloud-3 {
          width: 160px;
          height: 55px;
          top: 45%;
          left: -10%;
          animation-duration: 32s;
          animation-delay: 15s;
        }
        
        .overcast-cloud-3::before {
          width: 70px;
          height: 70px;
          top: -35px;
          left: 20px;
        }
        
        .overcast-cloud-3::after {
          width: 80px;
          height: 55px;
          top: -22px;
          right: 20px;
        }
        
        @keyframes overcastFloat {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(110vw); }
        }
        
        /* Fog layers */
        .fog-layer {
          position: absolute;
          width: 200%;
          height: 40%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(200, 200, 210, 0.4) 20%,
            rgba(220, 220, 230, 0.5) 50%,
            rgba(200, 200, 210, 0.4) 80%,
            transparent 100%
          );
        }
        
        .fog-1 {
          top: 0;
          animation: fogDriftSlow 15s ease-in-out infinite;
        }
        
        .fog-2 {
          top: 30%;
          animation: fogDriftSlow 20s ease-in-out infinite reverse;
          opacity: 0.7;
        }
        
        .fog-3 {
          top: 60%;
          animation: fogDriftSlow 18s ease-in-out infinite;
          animation-delay: 3s;
          opacity: 0.5;
        }
        
        @keyframes fogDriftSlow {
          0%, 100% { transform: translateX(-25%); }
          50% { transform: translateX(0%); }
        }
        
        /* Fog overlay */
        .fog-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(200, 200, 220, 0.4) 0%,
            rgba(220, 220, 230, 0.3) 30%,
            rgba(200, 200, 220, 0.2) 60%,
            transparent 100%
          );
          animation: fogDrift 8s ease-in-out infinite;
        }
        
        @keyframes fogDrift {
          0%, 100% {
            opacity: 0.5;
            transform: translateX(0);
          }
          50% {
            opacity: 0.7;
            transform: translateX(-20px);
          }
        }
        
        .rain-container {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }
        
        .raindrop {
          position: absolute;
          top: -10px;
          width: 2px;
          height: 20px;
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.1));
          animation: fall linear infinite;
        }
        
        @keyframes fall {
          to {
            transform: translateY(100vh);
          }
        }
        
        .snow-container {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }
        
        .snowflake {
          position: absolute;
          top: -10px;
          color: white;
          opacity: 0.8;
          animation: snowfall linear infinite;
          text-shadow: 0 0 5px rgba(255, 255, 255, 0.8);
        }
        
        @keyframes snowfall {
          to {
            transform: translateY(100vh) rotate(360deg);
          }
        }
        
        .lightning {
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0);
          animation: flash 5s infinite;
        }
        
        @keyframes flash {
          0%, 100% { background: rgba(255, 255, 255, 0); }
          2%, 4% { background: rgba(255, 255, 255, 0.6); }
        }
        
        /* Fog overlay */
        .fog-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(200, 200, 220, 0.4) 0%,
            rgba(220, 220, 230, 0.3) 30%,
            rgba(200, 200, 220, 0.2) 60%,
            transparent 100%
          );
          animation: fogDrift 8s ease-in-out infinite;
        }
        
        @keyframes fogDrift {
          0%, 100% {
            opacity: 0.5;
            transform: translateX(0);
          }
          50% {
            opacity: 0.7;
            transform: translateX(-20px);
          }
        }
        
        /* Snowman */
        .snowman {
          position: absolute;
          bottom: 5%;
          right: 8%;
          z-index: 5;
          animation: snowmanWave 3s ease-in-out infinite;
        }
        
        @keyframes snowmanWave {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
        
        .snowman-head {
          position: relative;
          width: 50px;
          height: 50px;
          background: white;
          border-radius: 50%;
          margin: 0 auto 5px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        
        .snowman-eye {
          position: absolute;
          top: 15px;
          width: 6px;
          height: 6px;
          background: black;
          border-radius: 50%;
          font-size: 16px;
          line-height: 0;
        }
        
        .snowman-eye-left {
          left: 13px;
        }
        
        .snowman-eye-right {
          right: 13px;
        }
        
        .snowman-carrot {
          position: absolute;
          top: 23px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 12px solid #ff6b35;
          border-radius: 2px;
        }
        
        .snowman-smile {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 20px;
          color: black;
        }
        
        .snowman-body {
          position: relative;
          width: 70px;
          height: 70px;
          background: white;
          border-radius: 50%;
          margin: 0 auto 5px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        
        .snowman-button {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: 6px;
          height: 6px;
          background: black;
          border-radius: 50%;
          font-size: 12px;
        }
        
        .snowman-button-1 { top: 20px; }
        .snowman-button-2 { top: 35px; }
        .snowman-button-3 { top: 50px; }
        
        .snowman-bottom {
          width: 90px;
          height: 90px;
          background: white;
          border-radius: 50%;
          margin: 0 auto;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        
        .snowman-arm {
          position: absolute;
          width: 40px;
          height: 3px;
          background: #8b4513;
          border-radius: 2px;
          top: 100px;
        }
        
        .snowman-arm-left {
          left: -15px;
          transform: rotate(-25deg);
          transform-origin: right center;
          animation: armWaveLeft 3s ease-in-out infinite;
        }
        
        .snowman-arm-right {
          right: -15px;
          transform: rotate(25deg);
          transform-origin: left center;
          animation: armWaveRight 3s ease-in-out infinite;
        }
        
        @keyframes armWaveLeft {
          0%, 100% { transform: rotate(-25deg); }
          50% { transform: rotate(-35deg); }
        }
        
        @keyframes armWaveRight {
          0%, 100% { transform: rotate(25deg); }
          50% { transform: rotate(35deg); }
        }
      `}</style>
    </div>
  );
}
