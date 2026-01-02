import { useMemo } from 'react';

interface HolidayBackgroundProps {
  holiday: 'easter' | 'eid' | 'diwali' | 'christmas' | 'newyear' | 'halloween' | 'thanksgiving' | 'hanukkah' | null;
  showWeatherOverlay?: boolean;
  weatherCondition?: string;
  sunrise?: string;
  sunset?: string;
}

export function HolidayBackground({ holiday, showWeatherOverlay = true, weatherCondition, sunrise, sunset }: HolidayBackgroundProps) {
  if (!holiday) return null;

  const timeOfDay = useMemo(() => {
    if (!sunrise || !sunset) return 'day';
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
    
    if (currentTime >= sunriseStart && currentTime <= sunriseEnd) return 'sunrise';
    if (currentTime >= sunsetStart && currentTime <= sunsetEnd) return 'sunset';
    if (currentTime < sunriseTime || currentTime > sunsetTime) return 'night';
    return 'day';
  }, [sunrise, sunset]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {holiday === 'easter' && <EasterBackground />}
      {holiday === 'eid' && <EidBackground />}
      {holiday === 'diwali' && <DiwaliBackground />}
      {holiday === 'christmas' && <ChristmasBackground />}
      {holiday === 'newyear' && <NewYearBackground />}
      {holiday === 'halloween' && <HalloweenBackground />}
      {holiday === 'thanksgiving' && <ThanksgivingBackground />}
      {holiday === 'hanukkah' && <HanukkahBackground />}
      
      {/* Weather overlay effects */}
      {showWeatherOverlay && <WeatherOverlay timeOfDay={timeOfDay} condition={weatherCondition} />}
      
      <style>{`
        /* Easter Animations */
        @keyframes egg-float {
          0%, 100% { transform: translateY(0) rotate(-5deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        
        @keyframes bunny-hop {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-30px); }
        }
        
        .easter-egg {
          animation: egg-float 4s ease-in-out infinite;
        }
        
        .easter-bunny {
          animation: bunny-hop 2s ease-in-out infinite;
        }

        /* Eid Animations */
        @keyframes crescent-glow {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.5)); }
          50% { filter: drop-shadow(0 0 40px rgba(255, 215, 0, 0.8)); }
        }
        
        @keyframes star-twinkle-eid {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        
        @keyframes lantern-swing {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        
        .eid-crescent {
          animation: crescent-glow 3s ease-in-out infinite;
        }
        
        .eid-star {
          animation: star-twinkle-eid 2s ease-in-out infinite;
        }
        
        .eid-lantern {
          animation: lantern-swing 3s ease-in-out infinite;
        }

        /* Diwali Animations */
        @keyframes diya-flicker {
          0%, 100% { opacity: 1; transform: scale(1); }
          25% { opacity: 0.8; transform: scale(0.98); }
          75% { opacity: 0.9; transform: scale(1.02); }
        }
        
        @keyframes rangoli-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        
        @keyframes firework-burst {
          0% { transform: scale(0); opacity: 1; }
          50% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        
        .diwali-diya {
          animation: diya-flicker 1.5s ease-in-out infinite;
        }
        
        .diwali-rangoli {
          animation: rangoli-pulse 4s ease-in-out infinite;
        }
        
        .diwali-firework {
          animation: firework-burst 2s ease-out infinite;
        }

        /* Christmas Animations */
        @keyframes snowfall-xmas {
          0% { transform: translateY(-10px) rotate(0deg); }
          100% { transform: translateY(100vh) rotate(360deg); }
        }
        
        @keyframes ornament-swing {
          0%, 100% { transform: rotate(-10deg); }
          50% { transform: rotate(10deg); }
        }
        
        @keyframes lights-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        
        .christmas-snow {
          animation: snowfall-xmas linear infinite;
        }
        
        .christmas-ornament {
          animation: ornament-swing 2s ease-in-out infinite;
        }
        
        .christmas-light {
          animation: lights-blink 1s ease-in-out infinite;
        }

        /* New Year Animations */
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0.5; }
        }
        
        @keyframes firework-rise {
          0% { transform: translateY(100vh) scale(0); opacity: 1; }
          50% { transform: translateY(30vh) scale(1); opacity: 1; }
          100% { transform: translateY(20vh) scale(2); opacity: 0; }
        }
        
        @keyframes sparkle-burst {
          0% { transform: scale(0) rotate(0deg); opacity: 1; }
          100% { transform: scale(1) rotate(180deg); opacity: 0; }
        }
        
        .newyear-confetti {
          animation: confetti-fall linear infinite;
        }
        
        .newyear-firework {
          animation: firework-rise 3s ease-out infinite;
        }
        
        .newyear-sparkle {
          animation: sparkle-burst 2s ease-out infinite;
        }

        /* Halloween Animations */
        @keyframes ghost-float {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-10px) translateX(-10px); }
          75% { transform: translateY(-30px) translateX(5px); }
        }
        
        @keyframes bat-fly {
          0% { transform: translateX(-100vw) translateY(0); }
          25% { transform: translateX(-50vw) translateY(-30px); }
          50% { transform: translateX(0) translateY(20px); }
          75% { transform: translateX(50vw) translateY(-20px); }
          100% { transform: translateX(100vw) translateY(0); }
        }
        
        @keyframes pumpkin-glow {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(255, 165, 0, 0.5)); }
          50% { filter: drop-shadow(0 0 40px rgba(255, 165, 0, 0.8)); }
        }
        
        .halloween-ghost {
          animation: ghost-float 5s ease-in-out infinite;
        }
        
        .halloween-bat {
          animation: bat-fly 8s linear infinite;
        }
        
        .halloween-pumpkin {
          animation: pumpkin-glow 2s ease-in-out infinite;
        }

        /* Thanksgiving Animations */
        @keyframes leaf-fall {
          0% { transform: translateY(-20px) rotate(0deg) translateX(0); }
          25% { transform: translateY(25vh) rotate(90deg) translateX(30px); }
          50% { transform: translateY(50vh) rotate(180deg) translateX(-20px); }
          75% { transform: translateY(75vh) rotate(270deg) translateX(40px); }
          100% { transform: translateY(100vh) rotate(360deg) translateX(0); }
        }
        
        @keyframes turkey-wobble {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        
        @keyframes cornucopia-glow {
          0%, 100% { filter: drop-shadow(0 0 15px rgba(210, 105, 30, 0.4)); }
          50% { filter: drop-shadow(0 0 30px rgba(210, 105, 30, 0.7)); }
        }
        
        .thanksgiving-leaf {
          animation: leaf-fall linear infinite;
        }
        
        .thanksgiving-turkey {
          animation: turkey-wobble 2s ease-in-out infinite;
        }
        
        .thanksgiving-cornucopia {
          animation: cornucopia-glow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

function EasterBackground() {
  const eggs = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      color: ['#FFB6C1', '#98FB98', '#87CEEB', '#DDA0DD', '#F0E68C', '#FFA07A'][Math.floor(Math.random() * 6)],
      delay: Math.random() * 4,
      size: 20 + Math.random() * 30,
    })), []
  );

  return (
    <>
      {/* Pastel gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-pink-100/30 via-sky-100/20 to-green-100/30" />
      
      {/* Easter eggs */}
      {eggs.map((egg) => (
        <div
          key={egg.id}
          className="easter-egg absolute"
          style={{
            left: `${egg.left}%`,
            top: `${egg.top}%`,
            animationDelay: `${egg.delay}s`,
          }}
        >
          <svg width={egg.size} height={egg.size * 1.3} viewBox="0 0 40 52">
            <ellipse cx="20" cy="28" rx="18" ry="22" fill={egg.color} />
            <ellipse cx="20" cy="28" rx="12" ry="16" fill="white" opacity="0.3" />
            <circle cx="14" cy="22" r="3" fill="white" opacity="0.5" />
          </svg>
        </div>
      ))}
      
      {/* Bunny silhouettes */}
      <div className="easter-bunny absolute bottom-10 left-10 text-6xl opacity-30">🐰</div>
      <div className="easter-bunny absolute bottom-20 right-20 text-4xl opacity-20" style={{ animationDelay: '0.5s' }}>🐰</div>
    </>
  );
}

function EidBackground() {
  const stars = useMemo(() => 
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 60,
      delay: Math.random() * 3,
      size: 8 + Math.random() * 16,
    })), []
  );

  return (
    <>
      {/* Deep night sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/40 via-purple-900/30 to-blue-900/40" />
      
      {/* Crescent moon */}
      <div className="eid-crescent absolute top-10 right-20">
        <svg width="80" height="80" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="#FFD700" />
          <circle cx="65" cy="45" r="35" fill="hsl(var(--background))" />
        </svg>
      </div>
      
      {/* Stars */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="eid-star absolute"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            animationDelay: `${star.delay}s`,
            fontSize: star.size,
          }}
        >
          ✦
        </div>
      ))}
      
      {/* Lanterns */}
      <div className="eid-lantern absolute top-20 left-10 text-5xl opacity-60">🏮</div>
      <div className="eid-lantern absolute top-16 right-40 text-4xl opacity-50" style={{ animationDelay: '1s' }}>🏮</div>
      <div className="eid-lantern absolute top-24 left-1/3 text-3xl opacity-40" style={{ animationDelay: '2s' }}>🏮</div>
    </>
  );
}

function DiwaliBackground() {
  const diyas = useMemo(() => 
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      bottom: Math.random() * 30,
      delay: Math.random() * 2,
    })), []
  );

  const fireworks = useMemo(() => 
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: 10 + Math.random() * 40,
      delay: Math.random() * 4,
      color: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'][Math.floor(Math.random() * 5)],
    })), []
  );

  return (
    <>
      {/* Warm gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange-900/30 via-red-900/20 to-purple-900/30" />
      
      {/* Rangoli pattern at bottom */}
      <div className="diwali-rangoli absolute bottom-0 left-1/2 -translate-x-1/2 opacity-30">
        <svg width="300" height="150" viewBox="0 0 300 150">
          <circle cx="150" cy="150" r="140" fill="none" stroke="#FF6B6B" strokeWidth="3" />
          <circle cx="150" cy="150" r="110" fill="none" stroke="#FFE66D" strokeWidth="3" />
          <circle cx="150" cy="150" r="80" fill="none" stroke="#4ECDC4" strokeWidth="3" />
          <circle cx="150" cy="150" r="50" fill="none" stroke="#95E1D3" strokeWidth="3" />
        </svg>
      </div>
      
      {/* Diyas (oil lamps) */}
      {diyas.map((diya) => (
        <div
          key={diya.id}
          className="diwali-diya absolute"
          style={{
            left: `${diya.left}%`,
            bottom: `${diya.bottom}%`,
            animationDelay: `${diya.delay}s`,
          }}
        >
          <span className="text-2xl">🪔</span>
        </div>
      ))}
      
      {/* Fireworks */}
      {fireworks.map((fw) => (
        <div
          key={fw.id}
          className="diwali-firework absolute"
          style={{
            left: `${fw.left}%`,
            top: `${fw.top}%`,
            animationDelay: `${fw.delay}s`,
          }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="3" fill={fw.color} />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <line
                key={angle}
                x1="20"
                y1="20"
                x2={20 + 15 * Math.cos((angle * Math.PI) / 180)}
                y2={20 + 15 * Math.sin((angle * Math.PI) / 180)}
                stroke={fw.color}
                strokeWidth="2"
              />
            ))}
          </svg>
        </div>
      ))}
    </>
  );
}

function ChristmasBackground() {
  const snowflakes = useMemo(() => 
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 5 + Math.random() * 10,
      size: 10 + Math.random() * 20,
    })), []
  );

  const lights = useMemo(() => 
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: (i / 20) * 100,
      color: ['#FF0000', '#00FF00', '#FFD700', '#0000FF', '#FF69B4'][i % 5],
      delay: i * 0.2,
    })), []
  );

  return (
    <>
      {/* Winter gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 via-slate-800/20 to-green-900/30" />
      
      {/* String lights at top */}
      <div className="absolute top-0 left-0 right-0 h-12">
        {lights.map((light) => (
          <div
            key={light.id}
            className="christmas-light absolute top-2"
            style={{
              left: `${light.left}%`,
              animationDelay: `${light.delay}s`,
            }}
          >
            <div
              className="w-3 h-4 rounded-full"
              style={{ backgroundColor: light.color, boxShadow: `0 0 10px ${light.color}` }}
            />
          </div>
        ))}
      </div>
      
      {/* Snowflakes */}
      {snowflakes.map((snow) => (
        <div
          key={snow.id}
          className="christmas-snow absolute text-white opacity-70"
          style={{
            left: `${snow.left}%`,
            animationDelay: `${snow.delay}s`,
            animationDuration: `${snow.duration}s`,
            fontSize: snow.size,
          }}
        >
          ❄
        </div>
      ))}
      
      {/* Ornaments */}
      <div className="christmas-ornament absolute top-20 left-20 text-4xl">🎄</div>
      <div className="christmas-ornament absolute top-32 right-16 text-3xl" style={{ animationDelay: '0.5s' }}>🎁</div>
      <div className="christmas-ornament absolute bottom-20 left-1/4 text-5xl" style={{ animationDelay: '1s' }}>⛄</div>
    </>
  );
}

function NewYearBackground() {
  const confetti = useMemo(() => 
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
      color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#3B82F6'][Math.floor(Math.random() * 5)],
      size: 8 + Math.random() * 12,
    })), []
  );

  const fireworks = useMemo(() => 
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      left: 15 + (i * 15),
      delay: i * 0.8,
      color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#3B82F6', '#10B981'][i],
    })), []
  );

  return (
    <>
      {/* Dark celebration gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-purple-900/30 to-blue-900/40" />
      
      {/* Confetti */}
      {confetti.map((c) => (
        <div
          key={c.id}
          className="newyear-confetti absolute"
          style={{
            left: `${c.left}%`,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.duration}s`,
          }}
        >
          <div
            className="rounded-sm"
            style={{
              width: c.size,
              height: c.size * 0.4,
              backgroundColor: c.color,
            }}
          />
        </div>
      ))}
      
      {/* Fireworks */}
      {fireworks.map((fw) => (
        <div
          key={fw.id}
          className="newyear-firework absolute"
          style={{
            left: `${fw.left}%`,
            animationDelay: `${fw.delay}s`,
          }}
        >
          <svg width="60" height="60" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="5" fill={fw.color} />
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
              <circle
                key={angle}
                cx={30 + 20 * Math.cos((angle * Math.PI) / 180)}
                cy={30 + 20 * Math.sin((angle * Math.PI) / 180)}
                r="3"
                fill={fw.color}
              />
            ))}
          </svg>
        </div>
      ))}
      
      {/* Year display */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 text-6xl font-bold text-white/20 newyear-sparkle">
        🎆
      </div>
    </>
  );
}

function HalloweenBackground() {
  const ghosts = useMemo(() => 
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      left: Math.random() * 80 + 10,
      top: Math.random() * 50 + 10,
      delay: Math.random() * 5,
    })), []
  );

  const bats = useMemo(() => 
    Array.from({ length: 4 }, (_, i) => ({
      id: i,
      top: 10 + Math.random() * 30,
      delay: i * 3,
    })), []
  );

  return (
    <>
      {/* Spooky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-purple-900/40 to-orange-900/30" />
      
      {/* Moon */}
      <div className="absolute top-10 right-20 opacity-40">
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="#F4F4DC" />
          <circle cx="35" cy="35" r="8" fill="#D4D4B4" opacity="0.5" />
          <circle cx="60" cy="55" r="12" fill="#D4D4B4" opacity="0.5" />
          <circle cx="45" cy="70" r="6" fill="#D4D4B4" opacity="0.5" />
        </svg>
      </div>
      
      {/* Ghosts */}
      {ghosts.map((ghost) => (
        <div
          key={ghost.id}
          className="halloween-ghost absolute opacity-30"
          style={{
            left: `${ghost.left}%`,
            top: `${ghost.top}%`,
            animationDelay: `${ghost.delay}s`,
          }}
        >
          <span className="text-5xl">👻</span>
        </div>
      ))}
      
      {/* Bats */}
      {bats.map((bat) => (
        <div
          key={bat.id}
          className="halloween-bat absolute"
          style={{
            top: `${bat.top}%`,
            animationDelay: `${bat.delay}s`,
          }}
        >
          <span className="text-3xl">🦇</span>
        </div>
      ))}
      
      {/* Pumpkins */}
      <div className="halloween-pumpkin absolute bottom-10 left-10 text-6xl opacity-60">🎃</div>
      <div className="halloween-pumpkin absolute bottom-16 right-20 text-5xl opacity-50" style={{ animationDelay: '1s' }}>🎃</div>
      <div className="halloween-pumpkin absolute bottom-8 left-1/3 text-4xl opacity-40" style={{ animationDelay: '0.5s' }}>🎃</div>
      
      {/* Spider web in corner */}
      <div className="absolute top-0 left-0 text-8xl opacity-20">🕸️</div>
    </>
  );
}

function ThanksgivingBackground() {
  const leaves = useMemo(() => 
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 8 + Math.random() * 6,
      type: ['🍂', '🍁', '🍃'][Math.floor(Math.random() * 3)],
      size: 20 + Math.random() * 20,
    })), []
  );

  return (
    <>
      {/* Autumn gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange-800/30 via-amber-700/20 to-red-900/30" />
      
      {/* Falling leaves */}
      {leaves.map((leaf) => (
        <div
          key={leaf.id}
          className="thanksgiving-leaf absolute"
          style={{
            left: `${leaf.left}%`,
            animationDelay: `${leaf.delay}s`,
            animationDuration: `${leaf.duration}s`,
            fontSize: leaf.size,
          }}
        >
          {leaf.type}
        </div>
      ))}
      
      {/* Cornucopia */}
      <div className="thanksgiving-cornucopia absolute bottom-10 right-10 text-6xl opacity-50">🍇</div>
      
      {/* Turkey */}
      <div className="thanksgiving-turkey absolute bottom-16 left-10 text-5xl opacity-40">🦃</div>
      
      {/* Wheat/harvest elements */}
      <div className="absolute bottom-20 left-1/4 text-4xl opacity-30">🌾</div>
      <div className="absolute bottom-12 right-1/4 text-3xl opacity-25">🌽</div>
      <div className="absolute bottom-24 left-1/2 text-4xl opacity-35">🥧</div>
    </>
  );
}

// Weather overlay component for sun effects over holiday backgrounds
function WeatherOverlay({ timeOfDay, condition }: { timeOfDay: 'day' | 'night' | 'sunrise' | 'sunset'; condition?: string }) {
  return (
    <>
      {/* Sunrise glow overlay */}
      {timeOfDay === 'sunrise' && (
        <div className="absolute inset-0 bg-gradient-to-b from-orange-400/20 via-yellow-300/10 to-transparent pointer-events-none" />
      )}
      
      {/* Sunset glow overlay */}
      {timeOfDay === 'sunset' && (
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/25 via-pink-400/15 to-purple-600/10 pointer-events-none" />
      )}
      
      {/* Night overlay */}
      {timeOfDay === 'night' && (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-blue-900/30 to-indigo-900/40 pointer-events-none" />
      )}
      
      {/* Rain/snow overlays based on condition */}
      {condition?.toLowerCase().includes('rain') && (
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-4 bg-blue-300/60 animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}
      
      {condition?.toLowerCase().includes('snow') && (
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-white text-sm animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
              }}
            >
              ❄
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// Hanukkah Background
function HanukkahBackground() {
  const candles = useMemo(() => 
    Array.from({ length: 9 }, (_, i) => ({
      id: i,
      isCenter: i === 4, // Shamash (helper candle) in center
      delay: i * 0.3,
    })), []
  );

  const stars = useMemo(() => 
    Array.from({ length: 25 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 50,
      delay: Math.random() * 3,
      size: 6 + Math.random() * 10,
    })), []
  );

  return (
    <>
      {/* Deep blue night gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/40 via-indigo-900/30 to-slate-900/40" />
      
      {/* Stars of David scattered */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute opacity-40"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            fontSize: star.size,
            animation: `star-twinkle-eid ${2 + star.delay}s ease-in-out infinite`,
            animationDelay: `${star.delay}s`,
          }}
        >
          ✡
        </div>
      ))}
      
      {/* Menorah at bottom center */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-end gap-2">
        {candles.map((candle) => (
          <div
            key={candle.id}
            className="flex flex-col items-center"
            style={{ marginBottom: candle.isCenter ? '20px' : '0' }}
          >
            {/* Flame */}
            <div
              className="w-3 h-5 rounded-full bg-gradient-to-t from-yellow-500 via-orange-400 to-yellow-200"
              style={{
                animation: 'diya-flicker 1.5s ease-in-out infinite',
                animationDelay: `${candle.delay}s`,
                boxShadow: '0 0 10px rgba(255, 200, 0, 0.6), 0 0 20px rgba(255, 150, 0, 0.4)',
              }}
            />
            {/* Candle */}
            <div 
              className={`w-2 ${candle.isCenter ? 'h-16' : 'h-12'} bg-gradient-to-b from-blue-300 to-blue-500 rounded-b`}
            />
          </div>
        ))}
      </div>
      
      {/* Dreidels */}
      <div className="absolute bottom-16 left-20 text-4xl opacity-40" style={{ animation: 'turkey-wobble 2s ease-in-out infinite' }}>🪽</div>
      <div className="absolute bottom-20 right-24 text-3xl opacity-30" style={{ animation: 'turkey-wobble 2.5s ease-in-out infinite', animationDelay: '0.5s' }}>✡</div>
      
      {/* Gelt (coins) */}
      <div className="absolute bottom-8 left-1/4 text-2xl opacity-50">🪙</div>
      <div className="absolute bottom-12 right-1/3 text-xl opacity-40">🪙</div>
    </>
  );
}

// Utility function to detect current holiday - exact days only
export function getCurrentHoliday(): HolidayBackgroundProps['holiday'] {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const day = now.getDate();
  const year = now.getFullYear();

  // New Year (December 31 - January 2) - special extended range
  if ((month === 11 && day === 31) || (month === 0 && day <= 2)) {
    return 'newyear';
  }

  // Easter (exact day only)
  const easterDates: Record<number, { month: number; day: number }> = {
    2025: { month: 3, day: 20 }, // April 20, 2025
    2026: { month: 3, day: 5 },  // April 5, 2026
    2027: { month: 2, day: 28 }, // March 28, 2027
  };
  const easter = easterDates[year];
  if (easter && month === easter.month && day === easter.day) {
    return 'easter';
  }

  // Eid al-Fitr (exact day only)
  const eidDates: Record<number, { month: number; day: number }> = {
    2025: { month: 2, day: 30 }, // March 30, 2025
    2026: { month: 2, day: 20 }, // March 20, 2026
    2027: { month: 2, day: 9 },  // March 9, 2027
  };
  const eid = eidDates[year];
  if (eid && month === eid.month && day === eid.day) {
    return 'eid';
  }

  // Diwali (exact day only)
  const diwaliDates: Record<number, { month: number; day: number }> = {
    2025: { month: 9, day: 20 },  // October 20, 2025
    2026: { month: 10, day: 8 },  // November 8, 2026
    2027: { month: 9, day: 29 },  // October 29, 2027
  };
  const diwali = diwaliDates[year];
  if (diwali && month === diwali.month && day === diwali.day) {
    return 'diwali';
  }

  // Halloween (October 31 only)
  if (month === 9 && day === 31) {
    return 'halloween';
  }

  // Thanksgiving (4th Thursday of November - calculate exact date)
  if (month === 10) {
    const firstDayOfNov = new Date(year, 10, 1).getDay();
    const firstThursday = firstDayOfNov <= 4 ? 5 - firstDayOfNov : 12 - firstDayOfNov;
    const fourthThursday = firstThursday + 21;
    if (day === fourthThursday) {
      return 'thanksgiving';
    }
  }

  // Christmas (December 25 only)
  if (month === 11 && day === 25) {
    return 'christmas';
  }

  // Hanukkah (8 nights, dates vary by year based on Hebrew calendar)
  const hanukkahDates: Record<number, { startMonth: number; startDay: number; endMonth: number; endDay: number }> = {
    2025: { startMonth: 11, startDay: 14, endMonth: 11, endDay: 22 }, // Dec 14-22, 2025
    2026: { startMonth: 11, startDay: 4, endMonth: 11, endDay: 12 },  // Dec 4-12, 2026
    2027: { startMonth: 11, startDay: 24, endMonth: 0, endDay: 1 },   // Dec 24, 2027 - Jan 1, 2028
  };
  const hanukkah = hanukkahDates[year];
  if (hanukkah) {
    // Handle Hanukkah spanning year boundary
    if (hanukkah.endMonth < hanukkah.startMonth) {
      // Spans into next year
      if ((month === hanukkah.startMonth && day >= hanukkah.startDay) || 
          (month === hanukkah.endMonth && day <= hanukkah.endDay)) {
        return 'hanukkah';
      }
    } else {
      if (month === hanukkah.startMonth && day >= hanukkah.startDay && day <= hanukkah.endDay) {
        return 'hanukkah';
      }
    }
  }

  return null;
}
