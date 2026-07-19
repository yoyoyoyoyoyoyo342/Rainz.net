import React from "react";
import type { LandmarkId } from "./registry";

// Each landmark is a stylized silhouette that inherits `color` (main) and `accentColor`
// via CSS custom properties (--lm-main, --lm-accent, --lm-glow). This lets the
// LandmarkLayer swap palettes for day / golden hour / night without re-rendering.
// All SVGs are viewBox 0 0 1600 500 so the LandmarkLayer can just stretch them.

interface Props {
  className?: string;
  reducedMotion?: boolean;
}

const wrap = (children: React.ReactNode, className?: string) => (
  <svg
    viewBox="0 0 1600 500"
    preserveAspectRatio="xMidYEnd meet"
    className={className}
    style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
    aria-hidden
  >
    {children}
  </svg>
);

// Shared water shimmer strip (used by coastal landmarks).
const WaterStrip = ({ y = 430, reduced }: { y?: number; reduced?: boolean }) => (
  <g>
    <rect x="0" y={y} width="1600" height={500 - y} fill="var(--lm-water, rgba(30,60,120,0.35))" />
    {!reduced && (
      <>
        <path d={`M0 ${y + 10} Q 200 ${y + 4} 400 ${y + 10} T 800 ${y + 10} T 1200 ${y + 10} T 1600 ${y + 10}`}
              stroke="var(--lm-shimmer, rgba(255,255,255,0.35))" strokeWidth="1" fill="none" opacity="0.5">
          <animate attributeName="d"
            values={`M0 ${y + 10} Q 200 ${y + 4} 400 ${y + 10} T 800 ${y + 10} T 1200 ${y + 10} T 1600 ${y + 10};M0 ${y + 10} Q 200 ${y + 16} 400 ${y + 10} T 800 ${y + 10} T 1200 ${y + 10} T 1600 ${y + 10};M0 ${y + 10} Q 200 ${y + 4} 400 ${y + 10} T 800 ${y + 10} T 1200 ${y + 10} T 1600 ${y + 10}`}
            dur="6s" repeatCount="indefinite" />
        </path>
      </>
    )}
  </g>
);

const twinkle = (id: string, delay = 0) => (
  <animate attributeName="opacity" values="0;1;0.4;1;0" dur="4s" begin={`${delay}s`} repeatCount="indefinite" id={id} />
);

// ─── GOLDEN GATE BRIDGE ──────────────────────────────────────────────────────
export const GoldenGate: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <>
    <WaterStrip reduced={reducedMotion} />
    {/* South tower */}
    <g fill="var(--lm-main)">
      <rect x="360" y="130" width="34" height="310" />
      <rect x="410" y="130" width="34" height="310" />
      <rect x="350" y="130" width="104" height="14" />
      <rect x="350" y="200" width="104" height="10" />
      <rect x="350" y="270" width="104" height="10" />
      <polygon points="360,130 402,90 444,130" />
    </g>
    {/* North tower */}
    <g fill="var(--lm-main)">
      <rect x="1180" y="130" width="34" height="310" />
      <rect x="1230" y="130" width="34" height="310" />
      <rect x="1170" y="130" width="104" height="14" />
      <rect x="1170" y="200" width="104" height="10" />
      <rect x="1170" y="270" width="104" height="10" />
      <polygon points="1180,130 1222,90 1264,130" />
    </g>
    {/* Deck */}
    <rect x="80" y="330" width="1440" height="10" fill="var(--lm-main)" />
    <rect x="80" y="340" width="1440" height="4" fill="var(--lm-accent)" opacity="0.6" />
    {/* Main cables */}
    <path d="M 80 340 Q 402 130 810 300 Q 1222 130 1520 340"
          stroke="var(--lm-main)" strokeWidth="4" fill="none" />
    {/* Vertical suspenders */}
    {Array.from({ length: 40 }).map((_, i) => {
      const x = 100 + i * 35;
      // approximate parabola between towers
      const t = (x - 402) / (1222 - 402);
      const yTop = x < 402
        ? 340 - (402 - x) * (210 / 322)
        : x > 1222
          ? 340 - (x - 1222) * (210 / 298)
          : 130 + Math.sin(Math.PI * t) * -170 + 170 - Math.sin(Math.PI * t) * 170;
      const cableY = Math.max(140, yTop);
      return <line key={i} x1={x} y1={cableY} x2={x} y2={330} stroke="var(--lm-main)" strokeWidth="1" opacity="0.7" />;
    })}
    {/* Warm tower lights at night */}
    <g fill="var(--lm-glow, transparent)">
      <circle cx="402" cy="95" r="4">{!reducedMotion && twinkle("gg-l1", 0)}</circle>
      <circle cx="1222" cy="95" r="4">{!reducedMotion && twinkle("gg-l2", 1.2)}</circle>
    </g>
    {/* Distant Marin headlands silhouette */}
    <path d="M 0 380 Q 200 320 380 360 L 380 440 L 0 440 Z" fill="var(--lm-main)" opacity="0.55" />
    <path d="M 1240 360 Q 1400 315 1600 370 L 1600 440 L 1240 440 Z" fill="var(--lm-main)" opacity="0.55" />
  </>,
  className,
);

// ─── LITTLE MERMAID (Copenhagen) ─────────────────────────────────────────────
export const LittleMermaid: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <>
    <WaterStrip y={410} reduced={reducedMotion} />
    {/* Rock */}
    <g fill="var(--lm-main)">
      <ellipse cx="800" cy="420" rx="200" ry="30" opacity="0.7" />
      <path d="M 660 420 Q 720 380 800 385 Q 880 380 940 420 Z" />
    </g>
    {/* Mermaid silhouette */}
    <g fill="var(--lm-main)" transform="translate(800 390)">
      {/* tail */}
      <path d="M -20 0 Q -60 -20 -80 -60 Q -70 -100 -30 -110 Q -20 -140 -10 -120 Q 20 -100 30 -60 Q 20 -20 -20 0 Z"
            transform="rotate(-6)">
        {!reducedMotion && (
          <animateTransform attributeName="transform" type="rotate" values="-6;-3;-6" dur="6s" repeatCount="indefinite" />
        )}
      </path>
      {/* body */}
      <path d="M -12 -110 Q -30 -140 -10 -170 Q 20 -175 24 -150 Q 18 -120 -4 -108 Z" />
      {/* head */}
      <circle cx="10" cy="-180" r="14" />
      {/* hair trailing */}
      <path d="M 20 -180 Q 45 -170 40 -140 Q 30 -155 20 -175 Z" opacity="0.85" />
      {/* arm */}
      <path d="M -4 -140 Q -20 -125 -18 -100 Q -8 -118 -2 -130 Z" opacity="0.9" />
    </g>
    {/* Distant harbour buildings */}
    <g fill="var(--lm-main)" opacity="0.45">
      <rect x="60" y="360" width="80" height="60" />
      <polygon points="60,360 100,340 140,360" />
      <rect x="180" y="370" width="60" height="50" />
      <polygon points="180,370 210,352 240,370" />
      <rect x="1360" y="365" width="70" height="55" />
      <polygon points="1360,365 1395,346 1430,365" />
      <rect x="1460" y="375" width="90" height="45" />
    </g>
    {/* Twinkling harbour lights */}
    <g fill="var(--lm-glow, transparent)">
      <circle cx="100" cy="380" r="2">{!reducedMotion && twinkle("cph-l1", 0.4)}</circle>
      <circle cx="220" cy="390" r="2">{!reducedMotion && twinkle("cph-l2", 1.1)}</circle>
      <circle cx="1395" cy="385" r="2">{!reducedMotion && twinkle("cph-l3", 2)}</circle>
      <circle cx="1500" cy="395" r="2">{!reducedMotion && twinkle("cph-l4", 0.9)}</circle>
    </g>
  </>,
  className,
);

// ─── STATUE OF LIBERTY (New York) ────────────────────────────────────────────
export const StatueOfLiberty: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <>
    <WaterStrip y={430} reduced={reducedMotion} />
    {/* Pedestal */}
    <g fill="var(--lm-main)">
      <rect x="760" y="330" width="80" height="100" />
      <rect x="750" y="320" width="100" height="12" />
      <polygon points="800,220 780,320 820,320" />
    </g>
    {/* Body */}
    <path d="M 780 210 Q 800 180 820 210 L 830 260 Q 800 250 770 260 Z" fill="var(--lm-main)" />
    {/* Head */}
    <circle cx="800" cy="180" r="14" fill="var(--lm-main)" />
    {/* Crown spikes */}
    <g fill="var(--lm-main)">
      {[-12, -8, -4, 0, 4, 8, 12].map((dx, i) => (
        <polygon key={i} points={`${800 + dx - 1},168 ${800 + dx},158 ${800 + dx + 1},168`} />
      ))}
    </g>
    {/* Torch arm */}
    <path d="M 815 200 Q 830 175 825 145" stroke="var(--lm-main)" strokeWidth="6" fill="none" strokeLinecap="round" />
    {/* Torch flame */}
    <g>
      <path d="M 820 148 Q 815 135 825 122 Q 832 130 828 148 Z" fill="var(--lm-flame, var(--lm-accent))">
        {!reducedMotion && (
          <animate attributeName="d"
            values="M 820 148 Q 815 135 825 122 Q 832 130 828 148 Z;M 820 148 Q 813 132 826 120 Q 834 132 828 148 Z;M 820 148 Q 815 135 825 122 Q 832 130 828 148 Z"
            dur="1.6s" repeatCount="indefinite" />
        )}
      </path>
      <circle cx="824" cy="130" r="8" fill="var(--lm-glow, transparent)" opacity="0.9" />
    </g>
    {/* Manhattan skyline distant */}
    <g fill="var(--lm-main)" opacity="0.55">
      <rect x="900" y="330" width="40" height="100" />
      <rect x="950" y="300" width="30" height="130" />
      <rect x="990" y="320" width="60" height="110" />
      <rect x="1060" y="280" width="35" height="150" />
      <polygon points="1060,280 1077,260 1095,280" />
      <rect x="1110" y="310" width="50" height="120" />
      <rect x="1170" y="290" width="30" height="140" />
      <rect x="1210" y="330" width="70" height="100" />
      <rect x="1290" y="310" width="40" height="120" />
      <rect x="1340" y="340" width="50" height="90" />
      <rect x="1400" y="320" width="30" height="110" />
    </g>
    {/* Window lights */}
    <g fill="var(--lm-glow, transparent)">
      {[[960,340],[1000,370],[1070,320],[1125,360],[1180,320],[1225,380],[1300,350],[1355,380]].map(([x,y],i) => (
        <rect key={i} x={x} y={y} width="2" height="3">
          {!reducedMotion && twinkle(`ny-l${i}`, i * 0.3)}
        </rect>
      ))}
    </g>
  </>,
  className,
);

// ─── BIG BEN (London) ────────────────────────────────────────────────────────
export const BigBen: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <>
    <g fill="var(--lm-main)">
      {/* Base */}
      <rect x="760" y="380" width="80" height="60" />
      {/* Shaft */}
      <rect x="775" y="180" width="50" height="200" />
      {/* Clock housing */}
      <rect x="765" y="150" width="70" height="70" />
      {/* Small spire */}
      <polygon points="775,150 800,120 825,150" />
      {/* Roof */}
      <polygon points="770,120 800,60 830,120" />
      <rect x="797" y="30" width="6" height="30" />
    </g>
    {/* Clock face */}
    <g>
      <circle cx="800" cy="185" r="18" fill="var(--lm-face, #f4ecd8)" opacity="0.95" />
      <circle cx="800" cy="185" r="18" fill="none" stroke="var(--lm-main)" strokeWidth="2" />
      {/* hands */}
      <line x1="800" y1="185" x2="800" y2="172" stroke="var(--lm-main)" strokeWidth="2">
        {!reducedMotion && <animateTransform attributeName="transform" type="rotate" from="0 800 185" to="360 800 185" dur="60s" repeatCount="indefinite" />}
      </line>
      <line x1="800" y1="185" x2="808" y2="185" stroke="var(--lm-main)" strokeWidth="1.5">
        {!reducedMotion && <animateTransform attributeName="transform" type="rotate" from="0 800 185" to="360 800 185" dur="720s" repeatCount="indefinite" />}
      </line>
      <circle cx="800" cy="185" r="1.5" fill="var(--lm-main)" />
    </g>
    {/* Glow behind clock at night */}
    <circle cx="800" cy="185" r="26" fill="var(--lm-glow, transparent)" opacity="0.5" />
    {/* Parliament wings */}
    <g fill="var(--lm-main)" opacity="0.85">
      <rect x="500" y="330" width="260" height="110" />
      <rect x="840" y="330" width="260" height="110" />
      {[520,560,600,640,680,720,860,900,940,980,1020,1060].map((x,i)=>(
        <rect key={i} x={x} y="320" width="12" height="12" />
      ))}
      {[520,560,600,640,680,720,860,900,940,980,1020,1060].map((x,i)=>(
        <polygon key={"s"+i} points={`${x},320 ${x+6},305 ${x+12},320`} />
      ))}
    </g>
    {/* Window lights */}
    <g fill="var(--lm-glow, transparent)">
      {[540,580,620,660,700,880,920,960,1000,1040].map((x,i) => (
        <rect key={i} x={x} y="360" width="3" height="4">
          {!reducedMotion && twinkle(`bb-l${i}`, i * 0.25)}
        </rect>
      ))}
    </g>
  </>,
  className,
);

// ─── EIFFEL TOWER (Paris) ────────────────────────────────────────────────────
export const EiffelTower: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <>
    <g fill="var(--lm-main)" stroke="var(--lm-main)" strokeLinejoin="round">
      {/* Base legs */}
      <polygon points="700,440 760,300 800,300 780,440" />
      <polygon points="900,440 840,300 800,300 820,440" />
      {/* First platform */}
      <rect x="740" y="290" width="120" height="14" />
      {/* Middle section */}
      <polygon points="760,290 780,190 820,190 840,290" />
      <rect x="770" y="180" width="60" height="10" />
      {/* Upper */}
      <polygon points="780,180 790,110 810,110 820,180" />
      <rect x="785" y="100" width="30" height="8" />
      {/* Spire */}
      <polygon points="795,100 800,50 805,100" />
      <line x1="800" y1="50" x2="800" y2="30" strokeWidth="3" />
    </g>
    {/* Lattice hints */}
    <g stroke="var(--lm-accent)" strokeWidth="1" opacity="0.7" fill="none">
      <line x1="710" y1="420" x2="890" y2="420" />
      <line x1="720" y1="390" x2="880" y2="390" />
      <line x1="730" y1="360" x2="870" y2="360" />
      <line x1="750" y1="330" x2="850" y2="330" />
    </g>
    {/* Sparkle lights */}
    <g fill="var(--lm-glow, transparent)">
      {Array.from({ length: 24 }).map((_, i) => {
        const x = 720 + Math.random() * 160;
        const y = 100 + Math.random() * 320;
        const delay = (i * 0.18) % 4;
        return (
          <circle key={i} cx={x} cy={y} r="1.6">
            {!reducedMotion && (
              <animate attributeName="opacity" values="0;1;0" dur="1.6s" begin={`${delay}s`} repeatCount="indefinite" />
            )}
          </circle>
        );
      })}
    </g>
    {/* Parisian rooftops */}
    <g fill="var(--lm-main)" opacity="0.45">
      <rect x="0" y="400" width="700" height="40" />
      <rect x="900" y="400" width="700" height="40" />
      {[40,120,200,280,360,440,520,600,980,1060,1140,1220,1300,1380,1460].map((x,i)=>(
        <polygon key={i} points={`${x},400 ${x+30},370 ${x+60},400`} />
      ))}
    </g>
  </>,
  className,
);

// ─── TOKYO TOWER ─────────────────────────────────────────────────────────────
export const TokyoTower: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <>
    <g fill="var(--lm-tower, #d94a2a)" opacity="var(--lm-tower-opacity, 1)">
      <polygon points="720,440 780,240 820,240 860,440" />
      <rect x="770" y="240" width="60" height="10" />
      <polygon points="770,240 790,150 810,150 830,240" />
      <rect x="785" y="150" width="30" height="8" />
      <polygon points="790,150 800,90 810,150" />
      <line x1="800" y1="90" x2="800" y2="40" stroke="var(--lm-tower, #d94a2a)" strokeWidth="3" />
      {/* Observation deck disc */}
      <ellipse cx="800" cy="200" rx="35" ry="8" />
    </g>
    <g stroke="var(--lm-accent)" strokeWidth="1" fill="none" opacity="0.8">
      <line x1="735" y1="420" x2="855" y2="420" />
      <line x1="750" y1="380" x2="840" y2="380" />
      <line x1="770" y1="320" x2="825" y2="320" />
    </g>
    {/* Tokyo skyline */}
    <g fill="var(--lm-main)" opacity="0.7">
      <rect x="0" y="330" width="700" height="110" />
      <rect x="900" y="330" width="700" height="110" />
      {[
        [40,290],[120,270],[210,300],[290,260],[380,290],[470,275],[560,300],[640,285],
        [900,285],[985,300],[1075,265],[1170,295],[1250,275],[1340,300],[1430,270],[1520,290],
      ].map(([x,y],i)=>(
        <rect key={i} x={x} y={y} width="60" height={330-y+40} />
      ))}
    </g>
    {/* City lights */}
    <g fill="var(--lm-glow, transparent)">
      {[[80,340],[240,320],[420,340],[600,330],[960,335],[1120,330],[1280,340],[1470,325]].map(([x,y],i)=>(
        <rect key={i} x={x} y={y} width="3" height="4">{!reducedMotion && twinkle(`tk-l${i}`, i*0.4)}</rect>
      ))}
    </g>
  </>,
  className,
);

// ─── SYDNEY OPERA HOUSE ──────────────────────────────────────────────────────
export const OperaHouse: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <>
    <WaterStrip y={410} reduced={reducedMotion} />
    <g fill="var(--lm-main)">
      {/* Platform */}
      <rect x="500" y="390" width="600" height="30" />
      {/* Shells — successive curves */}
      <path d="M 560 390 Q 600 250 720 390 Z" />
      <path d="M 640 390 Q 680 220 800 390 Z" />
      <path d="M 720 390 Q 760 240 880 390 Z" />
      <path d="M 820 390 Q 860 270 960 390 Z" />
      <path d="M 900 390 Q 940 300 1040 390 Z" />
    </g>
    {/* Harbour bridge in distance */}
    <g fill="var(--lm-main)" opacity="0.55">
      <path d="M 100 380 Q 260 300 420 380" stroke="var(--lm-main)" strokeWidth="6" fill="none" />
      <rect x="100" y="380" width="10" height="40" />
      <rect x="410" y="380" width="10" height="40" />
      <rect x="98" y="360" width="14" height="4" />
      <rect x="408" y="360" width="14" height="4" />
    </g>
    <g fill="var(--lm-glow, transparent)">
      {[600,700,800,900,1000].map((x,i)=>(
        <circle key={i} cx={x} cy="395" r="2">{!reducedMotion && twinkle(`syd-l${i}`, i*0.3)}</circle>
      ))}
    </g>
  </>,
  className,
);

// ─── HOLLYWOOD SIGN (Los Angeles) ────────────────────────────────────────────
export const HollywoodSign: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <>
    {/* Hills */}
    <path d="M 0 440 L 0 380 Q 200 300 500 340 Q 800 280 1100 340 Q 1350 300 1600 380 L 1600 440 Z"
          fill="var(--lm-main)" opacity="0.9" />
    <path d="M 0 440 L 0 410 Q 300 360 600 400 Q 900 350 1200 400 Q 1400 370 1600 410 L 1600 440 Z"
          fill="var(--lm-main)" opacity="0.55" />
    {/* HOLLYWOOD letters */}
    <g fill="var(--lm-letters, #f5f2ec)">
      {"HOLLYWOOD".split("").map((ch, i) => (
        <g key={i} transform={`translate(${560 + i * 55} 260)`}>
          <rect x="0" y="0" width="40" height="60" fill="var(--lm-letters, #f5f2ec)" opacity="0.95" />
          <text x="20" y="42" fontSize="28" fontWeight="900" fontFamily="Impact, Arial Black, sans-serif"
                textAnchor="middle" fill="var(--lm-main)">{ch}</text>
        </g>
      ))}
    </g>
    {/* Palm silhouettes */}
    <g fill="var(--lm-main)">
      <rect x="180" y="370" width="6" height="70" />
      <path d="M 183 370 Q 155 355 145 340 Q 165 355 183 370 Q 205 350 225 345 Q 205 358 183 370 Q 175 340 170 315 Q 185 340 183 370 Z" />
      <rect x="1400" y="360" width="6" height="80" />
      <path d="M 1403 360 Q 1370 345 1360 330 Q 1385 348 1403 360 Q 1430 340 1450 335 Q 1428 350 1403 360 Q 1395 330 1390 305 Q 1408 330 1403 360 Z" />
    </g>
    <g fill="var(--lm-glow, transparent)">
      {[300,500,900,1200].map((x,i)=>(
        <circle key={i} cx={x} cy="380" r="2">{!reducedMotion && twinkle(`la-l${i}`, i*0.5)}</circle>
      ))}
    </g>
  </>,
  className,
);

// ─── STOCKHOLM CITY HALL ─────────────────────────────────────────────────────
export const StockholmCityHall: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <>
    <WaterStrip y={415} reduced={reducedMotion} />
    <g fill="var(--lm-main)">
      {/* Main hall */}
      <rect x="600" y="290" width="400" height="130" />
      <rect x="610" y="285" width="380" height="6" />
      {/* Tower */}
      <rect x="880" y="150" width="70" height="145" />
      <rect x="875" y="145" width="80" height="8" />
      <polygon points="880,150 915,110 950,150" />
      <rect x="910" y="60" width="10" height="50" />
      <polygon points="910,60 915,30 920,60" />
      {/* Three crowns */}
      <circle cx="915" cy="30" r="4" fill="var(--lm-accent)" />
    </g>
    {/* Arch windows */}
    <g fill="var(--lm-glow, transparent)">
      {[630,680,730,780,830,900,950].map((x,i)=>(
        <rect key={i} x={x} y="340" width="4" height="12">{!reducedMotion && twinkle(`sto-l${i}`, i*0.35)}</rect>
      ))}
      <rect x="905" y="200" width="4" height="10">{!reducedMotion && twinkle("sto-t1", 0.2)}</rect>
      <rect x="915" y="230" width="4" height="10">{!reducedMotion && twinkle("sto-t2", 0.9)}</rect>
    </g>
    <g fill="var(--lm-main)" opacity="0.45">
      <rect x="0" y="370" width="500" height="50" />
      {[40,120,200,280,360,440].map((x,i)=>(<polygon key={i} points={`${x},370 ${x+30},345 ${x+60},370`} />))}
      <rect x="1080" y="370" width="500" height="50" />
      {[1120,1200,1280,1360,1440,1520].map((x,i)=>(<polygon key={i} points={`${x},370 ${x+30},345 ${x+60},370`} />))}
    </g>
  </>,
  className,
);

// ─── BRANDENBURG GATE (Berlin) ───────────────────────────────────────────────
export const BrandenburgGate: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <>
    <g fill="var(--lm-main)">
      {/* Base steps */}
      <rect x="620" y="410" width="360" height="20" />
      {/* Columns */}
      {[640, 700, 760, 820, 880, 940].map((x, i) => (
        <g key={i}>
          <rect x={x} y="220" width="24" height="190" />
          <rect x={x - 4} y="212" width="32" height="10" />
          <rect x={x - 4} y="410" width="32" height="8" />
        </g>
      ))}
      {/* Entablature */}
      <rect x="610" y="190" width="380" height="24" />
      <rect x="620" y="180" width="360" height="10" />
      {/* Quadriga (chariot silhouette) */}
      <rect x="770" y="150" width="60" height="26" />
      <circle cx="785" cy="180" r="6" />
      <circle cx="815" cy="180" r="6" />
      <path d="M 760 150 L 780 130 L 830 130 L 840 150 Z" />
    </g>
    <g fill="var(--lm-glow, transparent)">
      {[650, 710, 770, 830, 890, 950].map((x, i) => (
        <rect key={i} x={x + 4} y="330" width="4" height="12">{!reducedMotion && twinkle(`br-l${i}`, i * 0.3)}</rect>
      ))}
    </g>
  </>,
  className,
);

// ─── COLOSSEUM (Rome) ────────────────────────────────────────────────────────
export const Colosseum: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <>
    <g fill="var(--lm-main)">
      {/* Outer ellipse shell */}
      <path d="M 500 420 Q 500 220 800 200 Q 1100 220 1100 420 L 1080 420 Q 1080 245 800 225 Q 520 245 520 420 Z" />
      {/* Arches — 4 rows */}
    </g>
    {[
      { y: 260, h: 40 },
      { y: 310, h: 40 },
      { y: 360, h: 40 },
    ].map((row, r) => (
      <g key={r} fill="var(--lm-main)">
        {Array.from({ length: 18 }).map((_, i) => {
          const x = 520 + i * 32;
          return <rect key={i} x={x} y={row.y} width="20" height={row.h} />;
        })}
      </g>
    ))}
    {/* Broken top-left */}
    <path d="M 500 420 Q 500 260 620 210 L 640 240 Q 540 280 540 420 Z" fill="var(--lm-main)" opacity="0.9" />
    <g fill="var(--lm-glow, transparent)">
      {[600, 680, 760, 840, 920, 1000].map((x, i) => (
        <rect key={i} x={x} y="320" width="3" height="10">{!reducedMotion && twinkle(`co-l${i}`, i * 0.25)}</rect>
      ))}
    </g>
  </>,
  className,
);

// ─── SAGRADA FAMILIA (Barcelona) ─────────────────────────────────────────────
export const SagradaFamilia: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <>
    <g fill="var(--lm-main)">
      {/* Base */}
      <rect x="640" y="380" width="320" height="50" />
      {/* Central tallest spire */}
      <polygon points="785,380 800,60 815,380" />
      <circle cx="800" cy="70" r="8" fill="var(--lm-accent)" />
      {/* Flanking spires */}
      <polygon points="720,380 735,120 750,380" />
      <polygon points="850,380 865,120 880,380" />
      <polygon points="675,380 688,180 700,380" />
      <polygon points="900,380 912,180 924,380" />
      {/* Cross-detail bands */}
      {[130, 200, 260, 320].map((y, i) => (
        <rect key={i} x="710" y={y} width="180" height="4" />
      ))}
    </g>
    <g fill="var(--lm-glow, transparent)">
      <circle cx="800" cy="70" r="10">{!reducedMotion && twinkle("sf-c", 0)}</circle>
      {[735, 800, 865].map((x, i) => (
        <rect key={i} x={x - 2} y="300" width="4" height="10">{!reducedMotion && twinkle(`sf-l${i}`, i * 0.4)}</rect>
      ))}
    </g>
  </>,
  className,
);

// ─── AMSTERDAM CANAL HOUSES ──────────────────────────────────────────────────
export const AmsterdamCanal: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <>
    <WaterStrip y={410} reduced={reducedMotion} />
    <g fill="var(--lm-main)">
      {(() => {
        const houses = [] as React.ReactNode[];
        let x = 200;
        let key = 0;
        while (x < 1400) {
          const w = 70 + (key % 3) * 12;
          const h = 180 + (key % 4) * 24;
          const y = 410 - h;
          houses.push(<rect key={`h${key}`} x={x} y={y} width={w} height={h} />);
          // Gable variants
          const gable = key % 4;
          if (gable === 0) {
            houses.push(<polygon key={`g${key}`} points={`${x},${y} ${x + w / 2},${y - 22} ${x + w},${y}`} />);
          } else if (gable === 1) {
            houses.push(<rect key={`gb${key}`} x={x - 2} y={y - 14} width={w + 4} height="14" />);
            houses.push(<polygon key={`gp${key}`} points={`${x + w / 2 - 6},${y - 14} ${x + w / 2},${y - 26} ${x + w / 2 + 6},${y - 14}`} />);
          } else {
            houses.push(<path key={`gs${key}`} d={`M ${x} ${y} Q ${x + w / 2} ${y - 30} ${x + w} ${y} Z`} />);
          }
          x += w + 4;
          key++;
        }
        return houses;
      })()}
    </g>
    <g fill="var(--lm-glow, transparent)">
      {Array.from({ length: 18 }).map((_, i) => (
        <rect key={i} x={230 + i * 70} y={330 + (i % 3) * 20} width="4" height="6">
          {!reducedMotion && twinkle(`am-l${i}`, (i * 0.3) % 3)}
        </rect>
      ))}
    </g>
  </>,
  className,
);

// ─── BURJ KHALIFA (Dubai) ────────────────────────────────────────────────────
export const BurjKhalifa: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <>
    <g fill="var(--lm-main)">
      {/* Tapered tower */}
      <polygon points="770,440 780,300 790,180 795,80 800,20 805,80 810,180 820,300 830,440" />
      {/* Setback ridges */}
      {[110, 160, 220, 280, 340].map((y, i) => (
        <rect key={i} x={775 - i} y={y} width={50 + i * 2} height="6" />
      ))}
      {/* Antenna */}
      <line x1="800" y1="20" x2="800" y2="-30" stroke="var(--lm-main)" strokeWidth="3" />
    </g>
    {/* Distant skyline */}
    <g fill="var(--lm-main)" opacity="0.55">
      <rect x="0" y="360" width="700" height="80" />
      {[40, 130, 220, 310, 400, 490, 580].map((x, i) => (
        <rect key={i} x={x} y={310 - (i % 3) * 20} width="60" height={130 + (i % 3) * 20} />
      ))}
      <rect x="900" y="360" width="700" height="80" />
      {[900, 990, 1080, 1170, 1260, 1360, 1470].map((x, i) => (
        <rect key={i} x={x} y={320 - (i % 3) * 15} width="55" height={120 + (i % 3) * 15} />
      ))}
    </g>
    <g fill="var(--lm-glow, transparent)">
      {[100, 200, 400, 550, 950, 1100, 1300, 1500].map((x, i) => (
        <rect key={i} x={x} y={350} width="3" height="5">{!reducedMotion && twinkle(`du-l${i}`, i * 0.3)}</rect>
      ))}
      <circle cx="800" cy="-20" r="3">{!reducedMotion && twinkle("du-a", 0)}</circle>
    </g>
  </>,
  className,
);

// ─── CN TOWER (Toronto) ──────────────────────────────────────────────────────
export const CNTower: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <>
    <g fill="var(--lm-main)">
      {/* Shaft */}
      <polygon points="792,440 796,240 796,140 804,140 804,240 808,440" />
      {/* Observation pod */}
      <ellipse cx="800" cy="220" rx="34" ry="12" />
      <rect x="770" y="215" width="60" height="18" />
      <ellipse cx="800" cy="235" rx="30" ry="8" />
      {/* Small upper pod */}
      <rect x="790" y="150" width="20" height="14" />
      <ellipse cx="800" cy="150" rx="14" ry="5" />
      {/* Antenna */}
      <line x1="800" y1="150" x2="800" y2="40" stroke="var(--lm-main)" strokeWidth="3" />
    </g>
    {/* Toronto skyline */}
    <g fill="var(--lm-main)" opacity="0.55">
      <rect x="0" y="380" width="720" height="60" />
      {[40, 130, 230, 330, 430, 530, 630].map((x, i) => (
        <rect key={i} x={x} y={330 - (i % 3) * 15} width="55" height={110 + (i % 3) * 15} />
      ))}
      <rect x="880" y="380" width="720" height="60" />
      {[880, 970, 1070, 1170, 1270, 1370, 1470].map((x, i) => (
        <rect key={i} x={x} y={335 - (i % 3) * 20} width="55" height={105 + (i % 3) * 20} />
      ))}
    </g>
    <g fill="var(--lm-glow, transparent)">
      <circle cx="800" cy="45" r="3">{!reducedMotion && twinkle("cn-a", 0)}</circle>
      {[770, 800, 830].map((x, i) => (
        <rect key={i} x={x - 1} y="220" width="2" height="4">{!reducedMotion && twinkle(`cn-p${i}`, i * 0.4)}</rect>
      ))}
    </g>
  </>,
  className,
);

// ─── WILLIS TOWER + SKYLINE (Chicago) ────────────────────────────────────────
export const WillisTower: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <>
    <g fill="var(--lm-main)">
      {/* Willis tower with stepped setbacks */}
      <rect x="740" y="200" width="30" height="240" />
      <rect x="770" y="140" width="30" height="300" />
      <rect x="800" y="140" width="30" height="300" />
      <rect x="830" y="200" width="30" height="240" />
      <rect x="710" y="260" width="30" height="180" />
      <rect x="860" y="260" width="30" height="180" />
      {/* Antennas */}
      <line x1="785" y1="140" x2="785" y2="80" stroke="var(--lm-main)" strokeWidth="3" />
      <line x1="815" y1="140" x2="815" y2="90" stroke="var(--lm-main)" strokeWidth="3" />
    </g>
    <g fill="var(--lm-main)" opacity="0.7">
      <rect x="0" y="330" width="700" height="110" />
      {[[40, 300], [110, 280], [190, 310], [270, 260], [350, 290], [430, 275], [510, 300], [590, 285]].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="60" height={340 - y + 40} />
      ))}
      <rect x="900" y="330" width="700" height="110" />
      {[[900, 285], [980, 300], [1060, 265], [1150, 295], [1230, 275], [1320, 300], [1420, 270], [1520, 290]].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="60" height={340 - y + 40} />
      ))}
    </g>
    <g fill="var(--lm-glow, transparent)">
      {[60, 220, 400, 560, 940, 1100, 1280, 1470].map((x, i) => (
        <rect key={i} x={x} y="340" width="3" height="4">{!reducedMotion && twinkle(`chi-l${i}`, i * 0.3)}</rect>
      ))}
    </g>
  </>,
  className,
);

// ─── SPACE NEEDLE (Seattle) ──────────────────────────────────────────────────
export const SpaceNeedle: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <>
    <g fill="var(--lm-main)">
      {/* Three tripod legs */}
      <polygon points="770,440 795,180 805,180 780,440" />
      <polygon points="830,440 805,180 795,180 820,440" />
      <rect x="795" y="180" width="10" height="60" />
      {/* Saucer top */}
      <path d="M 750 170 Q 800 130 850 170 L 840 195 Q 800 215 760 195 Z" />
      <ellipse cx="800" cy="170" rx="50" ry="8" />
      {/* Antenna */}
      <line x1="800" y1="130" x2="800" y2="60" stroke="var(--lm-main)" strokeWidth="3" />
    </g>
    <g fill="var(--lm-main)" opacity="0.55">
      <rect x="0" y="380" width="700" height="60" />
      {[40, 130, 230, 330, 430, 530, 630].map((x, i) => (
        <rect key={i} x={x} y={340 - (i % 3) * 12} width="55" height={100 + (i % 3) * 12} />
      ))}
      <rect x="900" y="380" width="700" height="60" />
      {[900, 990, 1090, 1190, 1290, 1400, 1500].map((x, i) => (
        <rect key={i} x={x} y={345 - (i % 3) * 15} width="55" height={95 + (i % 3) * 15} />
      ))}
    </g>
    <g fill="var(--lm-glow, transparent)">
      <ellipse cx="800" cy="180" rx="46" ry="4" opacity="0.7" />
      <circle cx="800" cy="65" r="3">{!reducedMotion && twinkle("sn-a", 0)}</circle>
    </g>
  </>,
  className,
);

// ─── ST. BASIL'S CATHEDRAL (Moscow) ──────────────────────────────────────────
export const StBasil: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <>
    <g fill="var(--lm-main)">
      {/* Base */}
      <rect x="600" y="360" width="400" height="80" />
      {/* Central spire */}
      <rect x="785" y="220" width="30" height="140" />
      <polygon points="785,220 800,170 815,220" />
      {/* Onion dome center */}
      <path d="M 780 170 Q 780 140 800 130 Q 820 140 820 170 Q 820 190 800 200 Q 780 190 780 170 Z" />
      <polygon points="798,130 800,110 802,130" />
      {/* Side towers with onion domes */}
      {[
        { x: 660, dy: 40, w: 22, colorAccent: true },
        { x: 720, dy: 60 },
        { x: 870, dy: 60 },
        { x: 930, dy: 40, colorAccent: true },
      ].map((t, i) => (
        <g key={i}>
          <rect x={t.x - 15} y={260 + t.dy} width="30" height={100 - t.dy} />
          <path
            d={`M ${t.x - 18} ${260 + t.dy} Q ${t.x - 18} ${230 + t.dy} ${t.x} ${218 + t.dy} Q ${t.x + 18} ${230 + t.dy} ${t.x + 18} ${260 + t.dy} Q ${t.x + 18} ${278 + t.dy} ${t.x} ${288 + t.dy} Q ${t.x - 18} ${278 + t.dy} ${t.x - 18} ${260 + t.dy} Z`}
            fill={t.colorAccent ? "var(--lm-accent)" : "var(--lm-main)"}
          />
        </g>
      ))}
    </g>
    <g fill="var(--lm-glow, transparent)">
      {[660, 720, 800, 870, 930].map((x, i) => (
        <rect key={i} x={x - 2} y="360" width="4" height="10">{!reducedMotion && twinkle(`sb-l${i}`, i * 0.35)}</rect>
      ))}
    </g>
  </>,
  className,
);

// ─── CHRIST THE REDEEMER (Rio) ───────────────────────────────────────────────
export const ChristRedeemer: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <>
    {/* Corcovado mountain */}
    <path d="M 0 440 L 0 380 Q 300 340 600 360 Q 800 200 1000 360 Q 1300 340 1600 380 L 1600 440 Z"
          fill="var(--lm-main)" opacity="0.85" />
    {/* Pedestal */}
    <g fill="var(--lm-main)">
      <rect x="785" y="240" width="30" height="30" />
      <rect x="778" y="270" width="44" height="10" />
      {/* Body */}
      <path d="M 790 240 L 810 240 L 815 180 L 785 180 Z" />
      {/* Arms outstretched */}
      <rect x="720" y="188" width="160" height="10" />
      <rect x="720" y="188" width="10" height="30" />
      <rect x="870" y="188" width="10" height="30" />
      {/* Head */}
      <circle cx="800" cy="170" r="10" />
    </g>
    {/* Glow halo */}
    <circle cx="800" cy="170" r="16" fill="var(--lm-glow, transparent)" opacity="0.7" />
    <g fill="var(--lm-glow, transparent)">
      {[400, 550, 1050, 1200].map((x, i) => (
        <circle key={i} cx={x} cy="390" r="2">{!reducedMotion && twinkle(`rio-l${i}`, i * 0.4)}</circle>
      ))}
    </g>
  </>,
  className,
);

// ─── TAJ MAHAL ───────────────────────────────────────────────────────────────
export const TajMahal: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <g fill="var(--lm-main)">
    <rect x="200" y="380" width="1200" height="60" />
    <rect x="700" y="220" width="200" height="200" />
    <path d="M 700 220 Q 800 80 900 220 Z" />
    <circle cx="800" cy="150" r="14" fill="var(--lm-accent)" />
    {[560, 1040].map((x, i) => (
      <g key={i}>
        <rect x={x - 15} y="260" width="30" height="160" />
        <path d={`M ${x - 15} 260 Q ${x} 210 ${x + 15} 260 Z`} />
      </g>
    ))}
    {[380, 1220].map((x, i) => (
      <g key={`o${i}`}>
        <rect x={x - 12} y="300" width="24" height="120" />
        <path d={`M ${x - 12} 300 Q ${x} 260 ${x + 12} 300 Z`} />
      </g>
    ))}
    {!reducedMotion && <circle cx="800" cy="150" r="20" fill="var(--lm-glow, transparent)" opacity="0.5" />}
  </g>,
  className,
);

// ─── PYRAMIDS OF GIZA ────────────────────────────────────────────────────────
export const Pyramids: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <>
    <rect x="0" y="420" width="1600" height="20" fill="var(--lm-accent)" opacity="0.6" />
    <g fill="var(--lm-main)">
      <polygon points="450,420 720,140 990,420" />
      <polygon points="850,420 1080,220 1310,420" opacity="0.85" />
      <polygon points="1200,420 1370,270 1540,420" opacity="0.7" />
      <polygon points="200,420 340,320 480,420" opacity="0.6" />
    </g>
    {!reducedMotion && <circle cx="1350" cy="180" r="40" fill="var(--lm-glow, transparent)" opacity="0.6" />}
  </>,
  className,
);

// ─── PETRONAS TOWERS ─────────────────────────────────────────────────────────
export const Petronas: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <g fill="var(--lm-main)">
    {[680, 920].map((x, i) => (
      <g key={i}>
        <rect x={x - 30} y="110" width="60" height="310" />
        <rect x={x - 6} y="60" width="12" height="70" />
        <circle cx={x} cy="50" r="8" fill="var(--lm-accent)" />
      </g>
    ))}
    <rect x="760" y="240" width="80" height="12" />
    <rect x="760" y="300" width="80" height="12" />
    <g fill="var(--lm-glow, transparent)">
      {[680, 920].map((x, i) => (
        <circle key={i} cx={x} cy="50" r="10">{!reducedMotion && twinkle(`pt-${i}`, i)}</circle>
      ))}
    </g>
  </g>,
  className,
);

// ─── ORIENTAL PEARL (Shanghai) ───────────────────────────────────────────────
export const OrientalPearl: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <>
    <WaterStrip reduced={reducedMotion} />
    <g fill="var(--lm-main)">
      <rect x="795" y="80" width="10" height="340" />
      <circle cx="800" cy="140" r="40" />
      <circle cx="800" cy="260" r="55" />
      <circle cx="800" cy="60" r="14" fill="var(--lm-accent)" />
      <polygon points="300,420 340,320 380,420" opacity="0.5" />
      <polygon points="1220,420 1260,300 1300,420" opacity="0.5" />
      <rect x="500" y="340" width="80" height="80" opacity="0.6" />
      <rect x="1050" y="320" width="90" height="100" opacity="0.6" />
    </g>
  </>,
  className,
);

// ─── TAIPEI 101 ──────────────────────────────────────────────────────────────
export const Taipei101: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <g fill="var(--lm-main)">
    {Array.from({ length: 8 }).map((_, i) => (
      <polygon key={i} points={`${770 - i * 2},${100 + i * 40} ${830 + i * 2},${100 + i * 40} ${835 + i * 2},${135 + i * 40} ${765 - i * 2},${135 + i * 40}`} />
    ))}
    <rect x="790" y="60" width="20" height="50" />
    <circle cx="800" cy="55" r="6" fill="var(--lm-accent)" />
    <rect x="400" y="360" width="60" height="60" opacity="0.55" />
    <rect x="1140" y="340" width="70" height="80" opacity="0.55" />
    {!reducedMotion && <circle cx="800" cy="55" r="10" fill="var(--lm-glow, transparent)" opacity="0.7" />}
  </g>,
  className,
);

// ─── ACROPOLIS ───────────────────────────────────────────────────────────────
export const Acropolis: React.FC<Props> = ({ className, reducedMotion: _r }) => wrap(
  <g fill="var(--lm-main)">
    <path d="M 200 420 Q 400 340 800 320 Q 1200 340 1400 420 Z" opacity="0.5" />
    <rect x="620" y="240" width="360" height="16" />
    <rect x="620" y="410" width="360" height="16" />
    {Array.from({ length: 9 }).map((_, i) => (
      <rect key={i} x={630 + i * 42} y="256" width="20" height="154" />
    ))}
    <polygon points="600,240 800,180 1000,240" />
  </g>,
  className,
);

// ─── GENERIC SKYLINE ─────────────────────────────────────────────────────────
export const GenericSkyline: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <>
    <g fill="var(--lm-main)">
      {[
        [120, 300, 90], [230, 260, 110], [360, 200, 130], [510, 240, 100],
        [630, 160, 90], [740, 220, 120], [880, 140, 100], [1000, 210, 130],
        [1150, 180, 110], [1280, 250, 95], [1400, 200, 120],
      ].map(([x, y, w], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={420 - y} />
          {i % 3 === 0 && <rect x={x + w / 2 - 4} y={y - 40} width="8" height="40" />}
        </g>
      ))}
    </g>
    <g fill="var(--lm-glow, transparent)">
      {[180, 400, 700, 1050, 1330].map((x, i) => (
        <circle key={i} cx={x} cy={310 + (i % 2) * 30} r="3">
          {!reducedMotion && twinkle(`sk-${i}`, i * 0.3)}
        </circle>
      ))}
    </g>
  </>,
  className,
);

// ─── GENERIC CATHEDRAL ───────────────────────────────────────────────────────
export const GenericCathedral: React.FC<Props> = ({ className, reducedMotion: _r }) => wrap(
  <g fill="var(--lm-main)">
    <rect x="500" y="280" width="600" height="140" />
    <polygon points="500,280 800,180 1100,280" />
    <rect x="620" y="120" width="60" height="170" />
    <polygon points="620,120 650,60 680,120" />
    <rect x="920" y="120" width="60" height="170" />
    <polygon points="920,120 950,60 980,120" />
    <circle cx="800" cy="330" r="30" fill="var(--lm-accent)" opacity="0.7" />
    <rect x="200" y="380" width="80" height="40" opacity="0.5" />
    <rect x="1320" y="380" width="80" height="40" opacity="0.5" />
  </g>,
  className,
);

// ─── GENERIC PAGODA ──────────────────────────────────────────────────────────
export const GenericPagoda: React.FC<Props> = ({ className, reducedMotion: _r }) => wrap(
  <g fill="var(--lm-main)">
    {[0, 1, 2, 3, 4].map((i) => {
      const y = 130 + i * 60;
      const w = 90 + i * 40;
      return (
        <g key={i}>
          <path d={`M ${800 - w} ${y} Q 800 ${y - 20} ${800 + w} ${y} L ${770 + w} ${y + 10} L ${830 - w} ${y + 10} Z`} />
          <rect x={800 - (w - 30)} y={y + 10} width={2 * (w - 30)} height="40" />
        </g>
      );
    })}
    <rect x="795" y="90" width="10" height="50" />
    <circle cx="800" cy="85" r="8" fill="var(--lm-accent)" />
    <rect x="200" y="400" width="200" height="20" opacity="0.5" />
    <rect x="1200" y="400" width="200" height="20" opacity="0.5" />
  </g>,
  className,
);

// ─── GENERIC MINARET / MOSQUE ────────────────────────────────────────────────
export const GenericMinaret: React.FC<Props> = ({ className, reducedMotion: _r }) => wrap(
  <g fill="var(--lm-main)">
    <rect x="550" y="260" width="500" height="160" />
    <path d="M 550 260 Q 800 100 1050 260 Z" />
    <circle cx="800" cy="200" r="8" fill="var(--lm-accent)" />
    {[420, 1180].map((x, i) => (
      <g key={i}>
        <rect x={x - 12} y="180" width="24" height="240" />
        <circle cx={x} cy="170" r="16" />
        <path d={`M ${x - 4} 150 L ${x + 4} 150 L ${x} 130 Z`} fill="var(--lm-accent)" />
      </g>
    ))}
  </g>,
  className,
);

// ─── GENERIC ALPINE (Mountains + village) ────────────────────────────────────
export const GenericAlpine: React.FC<Props> = ({ className, reducedMotion: _r }) => wrap(
  <>
    <g fill="var(--lm-main)">
      <polygon points="100,420 400,180 700,420" opacity="0.85" />
      <polygon points="500,420 900,120 1300,420" />
      <polygon points="1000,420 1300,220 1600,420" opacity="0.7" />
      <polygon points="850,180 900,120 950,180" fill="var(--lm-accent)" opacity="0.9" />
      <polygon points="380,220 400,180 420,220" fill="var(--lm-accent)" opacity="0.9" />
    </g>
    <g fill="var(--lm-main)">
      {[600, 680, 760, 840, 920].map((x, i) => (
        <g key={i}>
          <rect x={x} y="380" width="40" height="40" />
          <polygon points={`${x},380 ${x + 20},360 ${x + 40},380`} />
        </g>
      ))}
    </g>
  </>,
  className,
);

// ─── GENERIC TROPICAL (Palms + shore) ────────────────────────────────────────
export const GenericTropical: React.FC<Props> = ({ className, reducedMotion }) => wrap(
  <>
    <WaterStrip y={410} reduced={reducedMotion} />
    <g fill="var(--lm-main)">
      {[300, 700, 1100, 1400].map((x, i) => (
        <g key={i}>
          <path d={`M ${x} 410 Q ${x + 8} 300 ${x - 4} 200`} stroke="var(--lm-main)" strokeWidth="6" fill="none" />
          <path d={`M ${x - 4} 200 Q ${x - 60} 190 ${x - 90} 220`} stroke="var(--lm-accent)" strokeWidth="6" fill="none" />
          <path d={`M ${x - 4} 200 Q ${x + 60} 185 ${x + 100} 215`} stroke="var(--lm-accent)" strokeWidth="6" fill="none" />
          <path d={`M ${x - 4} 200 Q ${x - 30} 150 ${x - 20} 110`} stroke="var(--lm-accent)" strokeWidth="6" fill="none" />
          <path d={`M ${x - 4} 200 Q ${x + 40} 155 ${x + 60} 120`} stroke="var(--lm-accent)" strokeWidth="6" fill="none" />
        </g>
      ))}
      <ellipse cx="800" cy="420" rx="300" ry="18" opacity="0.5" />
    </g>
  </>,
  className,
);

export const LANDMARK_COMPONENTS: Record<LandmarkId, React.FC<Props>> = {
  "golden-gate": GoldenGate,
  "little-mermaid": LittleMermaid,
  "statue-of-liberty": StatueOfLiberty,
  "big-ben": BigBen,
  "eiffel-tower": EiffelTower,
  "tokyo-tower": TokyoTower,
  "opera-house": OperaHouse,
  "hollywood-sign": HollywoodSign,
  "stockholm-city-hall": StockholmCityHall,
  "brandenburg-gate": BrandenburgGate,
  "colosseum": Colosseum,
  "sagrada-familia": SagradaFamilia,
  "amsterdam-canal": AmsterdamCanal,
  "burj-khalifa": BurjKhalifa,
  "cn-tower": CNTower,
  "willis-tower": WillisTower,
  "space-needle": SpaceNeedle,
  "st-basil": StBasil,
  "christ-redeemer": ChristRedeemer,
  "taj-mahal": TajMahal,
  "pyramids": Pyramids,
  "petronas": Petronas,
  "oriental-pearl": OrientalPearl,
  "taipei-101": Taipei101,
  "acropolis": Acropolis,
  "generic-skyline": GenericSkyline,
  "generic-cathedral": GenericCathedral,
  "generic-pagoda": GenericPagoda,
  "generic-minaret": GenericMinaret,
  "generic-alpine": GenericAlpine,
  "generic-tropical": GenericTropical,
};
