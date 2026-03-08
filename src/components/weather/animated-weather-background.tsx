import { useEffect, useState, useMemo } from "react";

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

  useEffect(() => {
    if (!sunrise || !sunset) return;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const parseSunTime = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    const sunriseTime = parseSunTime(sunrise);
    const sunsetTime = parseSunTime(sunset);
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
    const lc = condition.toLowerCase();
    const hasWeather = lc.includes('cloud') || lc.includes('overcast') || lc.includes('rain') || lc.includes('drizzle') || lc.includes('snow') || lc.includes('sleet') || lc.includes('fog') || lc.includes('mist');

    if (timeOfDay === 'sunrise') { setWeatherType('sunrise'); setShowConditionOverlay(hasWeather); return; }
    if (timeOfDay === 'sunset') { setWeatherType('sunset'); setShowConditionOverlay(hasWeather); return; }
    if (timeOfDay === 'night') { setWeatherType('night'); setShowConditionOverlay(hasWeather); return; }

    setShowConditionOverlay(false);
    if (lc.includes('thunder') || lc.includes('storm')) setWeatherType('storm');
    else if (lc.includes('rain') || lc.includes('drizzle') || lc.includes('shower')) setWeatherType('rain');
    else if (lc.includes('snow') || lc.includes('sleet') || lc.includes('ice') || lc.includes('blizzard')) setWeatherType('snow');
    else if (lc.includes('fog') || lc.includes('mist') || lc.includes('haze')) setWeatherType('fog');
    else if (lc.includes('overcast')) setWeatherType('overcast');
    else if (lc.includes('partly') || lc.includes('mostly sunny') || lc.includes('mostly clear')) setWeatherType('partly_cloudy');
    else if (lc.includes('cloud') || lc.includes('mostly cloudy')) setWeatherType('cloudy');
    else setWeatherType('clear');
  }, [condition, timeOfDay]);

  // Pre-generate random positions for particles
  const raindrops = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    duration: `${0.4 + Math.random() * 0.4}s`,
    opacity: 0.3 + Math.random() * 0.5,
  })), []);

  const snowflakes = useMemo(() => Array.from({ length: 50 }, () => ({
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 8}s`,
    duration: `${6 + Math.random() * 8}s`,
    size: `${3 + Math.random() * 4}px`,
    opacity: 0.4 + Math.random() * 0.5,
    drift: `${-30 + Math.random() * 60}px`,
  })), []);

  const stars = useMemo(() => Array.from({ length: 120 }, () => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 65}%`,
    delay: `${Math.random() * 4}s`,
    duration: `${2 + Math.random() * 3}s`,
    size: `${1 + Math.random() * 2}px`,
    opacity: 0.3 + Math.random() * 0.7,
  })), []);

  const gradientMap: Record<string, string> = {
    clear: 'linear-gradient(180deg, #1a8fe3 0%, #56b4f4 35%, #87ceeb 65%, #b8e4f9 100%)',
    partly_cloudy: 'linear-gradient(180deg, #3a9bd5 0%, #6db3e0 30%, #9ecde8 60%, #c8dfe8 100%)',
    cloudy: 'linear-gradient(180deg, #7a8b99 0%, #95a5b0 30%, #b0bec5 60%, #c9d4da 100%)',
    overcast: 'linear-gradient(180deg, #4a5568 0%, #636f7e 25%, #78879a 50%, #8d9aab 75%, #a0aab5 100%)',
    rain: 'linear-gradient(180deg, #3d4f5f 0%, #4a6572 25%, #5a7a85 50%, #6b8e99 100%)',
    snow: 'linear-gradient(180deg, #8ea4b8 0%, #a8bcc8 25%, #c4d4dd 50%, #dbe5eb 75%, #eef3f6 100%)',
    storm: 'linear-gradient(180deg, #1a1e2e 0%, #2d3444 20%, #3a4154 40%, #2a3040 70%, #1e2535 100%)',
    fog: 'linear-gradient(180deg, #9ca8b0 0%, #b0bac0 25%, #c8cfd5 50%, #d5dce2 75%, #e2e8ec 100%)',
    sunrise: 'linear-gradient(180deg, #1a1a3e 0%, #3d2a5c 10%, #8e4585 25%, #d4637a 40%, #f09060 55%, #f7c873 70%, #fceabb 85%, #fff8e7 100%)',
    sunset: 'linear-gradient(180deg, #0f1b3d 0%, #1a2a5a 10%, #3b2070 20%, #6b2070 30%, #c04060 45%, #e86840 55%, #f0a030 70%, #d48040 85%, #2a1a40 100%)',
    night: 'linear-gradient(180deg, #0a0e1a 0%, #0d1526 15%, #111d35 30%, #152040 50%, #0d1526 75%, #080c18 100%)',
  };

  const needsRain = weatherType === 'rain' || weatherType === 'storm' ||
    (showConditionOverlay && condition && (condition.toLowerCase().includes('rain') || condition.toLowerCase().includes('drizzle')));

  const needsSnow = weatherType === 'snow' ||
    (showConditionOverlay && condition && (condition.toLowerCase().includes('snow') || condition.toLowerCase().includes('sleet')));

  const needsFog = weatherType === 'fog' ||
    (showConditionOverlay && condition && (condition.toLowerCase().includes('fog') || condition.toLowerCase().includes('mist')));

  const needsStars = weatherType === 'night';
  const needsLightning = weatherType === 'storm';

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Photorealistic sky gradient */}
      <div
        className="absolute inset-0 transition-all duration-[1500ms] ease-in-out"
        style={{ background: gradientMap[weatherType] || gradientMap.clear }}
      />

      {/* Sun glow — clear day */}
      {weatherType === 'clear' && (
        <div className="absolute" style={{
          top: '8%', right: '12%', width: '160px', height: '160px',
          background: 'radial-gradient(circle, rgba(255,245,200,0.9) 0%, rgba(255,220,120,0.5) 30%, rgba(255,200,80,0.2) 55%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(2px)',
          animation: 'sunGlow 6s ease-in-out infinite',
        }} />
      )}

      {/* Sun glow — partly cloudy */}
      {weatherType === 'partly_cloudy' && (
        <div className="absolute" style={{
          top: '10%', right: '18%', width: '120px', height: '120px',
          background: 'radial-gradient(circle, rgba(255,245,200,0.7) 0%, rgba(255,220,120,0.3) 40%, transparent 65%)',
          borderRadius: '50%',
          filter: 'blur(3px)',
          animation: 'sunGlow 6s ease-in-out infinite',
        }} />
      )}

      {/* Sunrise sun */}
      {weatherType === 'sunrise' && (
        <div className="absolute" style={{
          bottom: '12%', left: '50%', transform: 'translateX(-50%)',
          width: '180px', height: '180px',
          background: 'radial-gradient(circle, rgba(255,230,140,1) 0%, rgba(255,160,60,0.6) 35%, rgba(255,100,50,0.2) 60%, transparent 75%)',
          borderRadius: '50%',
          filter: 'blur(3px)',
          animation: 'sunGlow 5s ease-in-out infinite',
        }} />
      )}

      {/* Sunset sun */}
      {weatherType === 'sunset' && (
        <div className="absolute" style={{
          bottom: '20%', left: '50%', transform: 'translateX(-50%)',
          width: '200px', height: '200px',
          background: 'radial-gradient(circle, rgba(255,180,80,0.95) 0%, rgba(230,100,50,0.5) 35%, rgba(200,60,80,0.2) 55%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(4px)',
          animation: 'sunGlow 6s ease-in-out infinite',
        }} />
      )}

      {/* Moon for night */}
      {weatherType === 'night' && (
        <div className="absolute" style={{
          top: '12%', right: '15%', width: '60px', height: '60px',
          background: 'radial-gradient(circle at 40% 40%, #f5f0d0 0%, #e8e0b8 50%, #d4cba0 100%)',
          borderRadius: '50%',
          boxShadow: '0 0 40px rgba(245,240,208,0.25), 0 0 80px rgba(245,240,208,0.1)',
        }} />
      )}

      {/* Atmospheric haze layers for cloudy conditions */}
      {(weatherType === 'cloudy' || weatherType === 'overcast' || weatherType === 'partly_cloudy') && (
        <>
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(180,190,200,0.15) 40%, rgba(160,170,185,0.25) 70%, rgba(150,160,175,0.3) 100%)',
            animation: 'hazeDrift 20s ease-in-out infinite',
          }} />
          <div className="absolute" style={{
            top: '5%', left: '-10%', width: '120%', height: '35%',
            background: 'radial-gradient(ellipse 80% 100% at 50% 100%, rgba(180,185,195,0.4) 0%, transparent 70%)',
            animation: 'cloudLayerDrift 30s ease-in-out infinite',
          }} />
          <div className="absolute" style={{
            top: '15%', left: '-5%', width: '110%', height: '30%',
            background: 'radial-gradient(ellipse 70% 100% at 40% 80%, rgba(170,178,190,0.35) 0%, transparent 65%)',
            animation: 'cloudLayerDrift 35s ease-in-out infinite reverse',
          }} />
        </>
      )}

      {/* Heavy overcast darkening */}
      {weatherType === 'overcast' && (
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, rgba(60,70,85,0.3) 0%, rgba(80,90,100,0.2) 50%, rgba(70,80,95,0.15) 100%)',
        }} />
      )}

      {/* Stars */}
      {needsStars && (
        <div className="absolute inset-0 overflow-hidden">
          {stars.map((s, i) => (
            <div key={i} className="absolute rounded-full bg-white" style={{
              left: s.left, top: s.top,
              width: s.size, height: s.size,
              opacity: s.opacity,
              animation: `twinkle ${s.duration} ${s.delay} ease-in-out infinite`,
            }} />
          ))}
        </div>
      )}

      {/* Fog / mist */}
      {needsFog && (
        <>
          <div className="absolute" style={{
            top: '10%', left: '-20%', width: '140%', height: '50%',
            background: 'linear-gradient(90deg, transparent, rgba(200,205,215,0.4) 25%, rgba(210,215,225,0.5) 50%, rgba(200,205,215,0.4) 75%, transparent)',
            animation: 'fogDrift 18s ease-in-out infinite',
          }} />
          <div className="absolute" style={{
            top: '35%', left: '-15%', width: '130%', height: '45%',
            background: 'linear-gradient(90deg, transparent, rgba(195,200,210,0.35) 30%, rgba(205,210,220,0.45) 50%, rgba(195,200,210,0.35) 70%, transparent)',
            animation: 'fogDrift 24s ease-in-out infinite reverse',
            opacity: 0.7,
          }} />
          <div className="absolute" style={{
            top: '55%', left: '-25%', width: '150%', height: '50%',
            background: 'linear-gradient(90deg, transparent, rgba(190,195,205,0.3) 20%, rgba(200,205,215,0.4) 50%, rgba(190,195,205,0.3) 80%, transparent)',
            animation: 'fogDrift 20s ease-in-out infinite',
            animationDelay: '4s',
            opacity: 0.5,
          }} />
        </>
      )}

      {/* Rain */}
      {needsRain && (
        <div className="absolute inset-0 overflow-hidden">
          {raindrops.map((d, i) => (
            <div key={i} className="absolute" style={{
              left: d.left, top: '-2%',
              width: '1.5px', height: '25px',
              opacity: d.opacity,
              background: 'linear-gradient(to bottom, rgba(180,200,220,0.8), rgba(150,175,200,0.2))',
              animation: `rainFall ${d.duration} ${d.delay} linear infinite`,
              transform: 'rotate(4deg)',
            }} />
          ))}
        </div>
      )}

      {/* Snow */}
      {needsSnow && (
        <div className="absolute inset-0 overflow-hidden">
          {snowflakes.map((s, i) => (
            <div key={i} className="absolute rounded-full" style={{
              left: s.left, top: '-2%',
              width: s.size, height: s.size,
              opacity: s.opacity,
              background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(240,245,255,0.6) 100%)',
              boxShadow: '0 0 3px rgba(255,255,255,0.5)',
              animation: `snowFall ${s.duration} ${s.delay} linear infinite`,
              ['--drift' as string]: s.drift,
            }} />
          ))}
        </div>
      )}

      {/* Lightning flash */}
      {needsLightning && (
        <div className="absolute inset-0" style={{
          animation: 'lightningFlash 6s infinite',
          background: 'transparent',
        }} />
      )}

      {/* Condition overlays during sunrise/sunset/night */}
      {showConditionOverlay && (weatherType === 'sunrise' || weatherType === 'sunset' || weatherType === 'night') && condition && (
        <>
          {(condition.toLowerCase().includes('cloud') || condition.toLowerCase().includes('overcast')) && (
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(180deg, rgba(80,90,100,0.35) 0%, rgba(100,110,120,0.2) 50%, transparent 100%)',
              animation: 'hazeDrift 25s ease-in-out infinite',
            }} />
          )}
        </>
      )}

      <style>{`
        @keyframes sunGlow {
          0%, 100% { transform: scale(1); filter: blur(2px); }
          50% { transform: scale(1.06); filter: blur(3px); }
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }

        @keyframes hazeDrift {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(2%); }
        }

        @keyframes cloudLayerDrift {
          0%, 100% { transform: translateX(-3%); }
          50% { transform: translateX(3%); }
        }

        @keyframes fogDrift {
          0%, 100% { transform: translateX(-10%); }
          50% { transform: translateX(5%); }
        }

        @keyframes rainFall {
          0% { transform: translateY(0) rotate(4deg); }
          100% { transform: translateY(105vh) rotate(4deg); }
        }

        @keyframes snowFall {
          0% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(25vh) translateX(var(--drift, 15px)); }
          50% { transform: translateY(50vh) translateX(calc(var(--drift, 15px) * -0.5)); }
          75% { transform: translateY(75vh) translateX(var(--drift, 15px)); }
          100% { transform: translateY(105vh) translateX(0); }
        }

        @keyframes lightningFlash {
          0%, 100% { background: transparent; }
          1% { background: rgba(200,210,255,0.6); }
          2% { background: transparent; }
          3% { background: rgba(220,225,255,0.3); }
          4% { background: transparent; }
        }
      `}</style>
    </div>
  );
}
