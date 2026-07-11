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
};
