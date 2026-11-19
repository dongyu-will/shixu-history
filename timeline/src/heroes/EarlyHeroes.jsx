import { BookOpenText, UsersThree } from '@phosphor-icons/react';
import { PROCESS_PLACES } from '../storyboards/places.js';
import { HeroEmblem } from '../HeroEmblems.jsx';
import {
  ArrivalRipple,
  CometHead,
  Formation,
  NodeMedallion,
  RejectSeal,
  SealStamp,
} from '../StorySymbols.jsx';

const DOC_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const clamp = (v, low, high) => Math.max(low, Math.min(high, v));

/** Trimmed quadratic Bezier path starting/ending cleanly outside node rims. */
function curveData(a, b, { bend = 0, trimStart = 18, trimEnd = 18 } = {}) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const nx = -uy;
  const ny = ux;
  const cx = (a.x + b.x) / 2 + nx * bend;
  const cy = (a.y + b.y) / 2 + ny * bend;

  const maxTrim = dist * 0.72;
  const scale = trimStart + trimEnd > maxTrim ? maxTrim / (trimStart + trimEnd) : 1;
  const effStart = trimStart * scale;
  const effEnd = trimEnd * scale;

  const sDx = cx - a.x;
  const sDy = cy - a.y;
  const sLen = Math.hypot(sDx, sDy) || 1;
  const sx = a.x + (sDx / sLen) * effStart;
  const sy = a.y + (sDy / sLen) * effStart;

  const eDx = cx - b.x;
  const eDy = cy - b.y;
  const eLen = Math.hypot(eDx, eDy) || 1;
  const ex = b.x + (eDx / eLen) * effEnd;
  const ey = b.y + (eDy / eLen) * effEnd;

  const mx = 0.25 * sx + 0.5 * cx + 0.25 * ex;
  const my = 0.25 * sy + 0.5 * cy + 0.25 * ey;
  const endAngle = (Math.atan2(ey - cy, ex - cx) * 180) / Math.PI;
  const d = `M${sx.toFixed(1)},${sy.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`;
  return { d, sx, sy, cx, cy, ex, ey, mx, my, nx, ny, dist, endAngle };
}

/** Exact sub-segment [t0, t1] of a quadratic Bezier via de Casteljau subdivision. */
function quadSubSegment(p0, pc, p1, t0, t1) {
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const evalQ = (t) => {
    const a = lerp(p0, pc, t);
    const b = lerp(pc, p1, t);
    return lerp(a, b, t);
  };
  const start = evalQ(t0);
  const end = evalQ(t1);
  const mid = evalQ((t0 + t1) / 2);
  const ctrl = [
    2 * mid[0] - 0.5 * (start[0] + end[0]),
    2 * mid[1] - 0.5 * (start[1] + end[1]),
  ];
  return `M${start[0].toFixed(1)},${start[1].toFixed(1)} Q${ctrl[0].toFixed(1)},${ctrl[1].toFixed(1)} ${end[0].toFixed(1)},${end[1].toFixed(1)}`;
}

/** Arrival chevron popped cleanly at curve completion (never floats detached mid-trace). */
function ArrivalTip({ id, x, y, angle, tone = 'force' }) {
  return <g transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${angle.toFixed(1)})`}>
    <g data-motion={id} opacity="0">
      <path
        d="M-8,-4.8 L0.8,0 L-8,4.8"
        fill="none"
        stroke={tone === 'force' ? 'var(--story-force)' : 'var(--story-organization)'}
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </g>;
}

/** Safe projection wrapper returning { x, y } for a named PROCESS_PLACES entry. */
function projectPlace(projection, name, fallback) {
  const coords = PROCESS_PLACES[name];
  if (typeof projection === 'function' && coords) {
    const pt = projection(coords);
    if (Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1])) {
      return { x: pt[0], y: pt[1] };
    }
  }
  return { x: fallback[0], y: fallback[1] };
}

/* ========================================================================== */
/* e-1: 鸦片战争 (1840) — Coastal Encroachment, Treaty Fracture & Sovereignty   */
/* ========================================================================== */

function opiumLayout(projection) {
  const coast = projectPlace(projection, '东部沿海', [1114.8, 535]);
  const nanjing = projectPlace(projection, '南京市', [785.2, 175]);

  // Sweeping eastern-sea naval pressure vectors converging inward on projected 东部沿海
  const navalOrigins = [
    { x: clamp(coast.x + 184, 1180, 1326), y: clamp(coast.y - 156, 330, 420), bend: -28 },
    { x: clamp(coast.x + 218, 1210, 1338), y: clamp(coast.y - 62, 430, 500), bend: -14 },
    { x: clamp(coast.x + 196, 1190, 1328), y: clamp(coast.y + 24, 530, 566), bend: 18 },
  ];
  const navalArcs = navalOrigins.map((origin) =>
    curveData(origin, coast, { bend: origin.bend, trimStart: 8, trimEnd: 25 }),
  );

  // Main vermilion corridor: 东部沿海 -> 南京市 (bends gently northeast along coastal/Yangtze approach)
  const corridor = curveData(coast, nanjing, { bend: 64, trimStart: 24, trimEnd: 24 });

  // Treaty coercion jagged fracture line spanning below Nanjing's threshold (2D non-flat zigzag)
  const fx0 = clamp(nanjing.x - 130, 610, 690);
  const fy0 = clamp(nanjing.y + 84, 240, 275);
  const fracturePts = [
    [fx0, fy0 + 6],
    [fx0 + 38, fy0 - 8],
    [fx0 + 68, fy0 + 9],
    [fx0 + 108, fy0 - 11],
    [fx0 + 142, fy0 + 8],
    [fx0 + 182, fy0 - 12],
    [fx0 + 216, fy0 + 6],
    [fx0 + 252, fy0 - 8],
  ];
  const fractureD = fracturePts
    .map(([px, py], idx) => `${idx === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`)
    .join(' ');
  const fractureEchoD = fracturePts
    .map(([px, py], idx) => `${idx === 0 ? 'M' : 'L'}${(px + 3).toFixed(1)},${(py + 6).toFixed(1)}`)
    .join(' ');
  const fractureCenter = { x: fx0 + 126, y: fy0 + 34 };

  // Archival sovereignty emblems + cinnabar conclusion seal in open lower-left quadrant
  const sealX = clamp(Math.min(755, coast.x - 340), 695, 790);
  const sealY = 524;
  const pillarY = 374;
  const pillars = [
    { id: 'territory', label: '领土', x: sealX - 106, y: pillarY },
    { id: 'tariff', label: '关税', x: sealX, y: pillarY },
    { id: 'judicial', label: '司法', x: sealX + 106, y: pillarY },
  ];

  // Subtle curved stems connecting the 3 breached emblems down to the conclusion seal
  const pillarStems = pillars.map((p, idx) =>
    curveData(
      { x: p.x, y: p.y + 60 },
      { x: sealX + (idx - 1) * 44, y: sealY - 28 },
      { bend: idx === 0 ? 12 : idx === 2 ? -12 : 4, trimStart: 2, trimEnd: 3 },
    ),
  );

  // Corridor caption neatly placed to the northeast of the curve midpoint
  const corridorLabel = {
    x: clamp(corridor.mx + 110, 1020, 1185),
    y: clamp(corridor.my - 26, 260, 330),
  };

  return {
    coast,
    nanjing,
    navalArcs,
    corridor,
    corridorLabel,
    fractureD,
    fractureEchoD,
    fractureCenter,
    pillars,
    pillarStems,
    seal: { x: sealX, y: sealY },
  };
}

/** Minimalist archival icon inside each sovereignty pillar emblem (领土 / 关税 / 司法). */
function SovereigntyGlyph({ kind }) {
  if (kind === 'territory') {
    return <g className="hero-pillar-icon" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-15,-9 L-4,-13 L11,-8 L15,5 L2,12 L-13,7 Z" fill="currentColor" fillOpacity="0.08"/>
      <path d="M-9,-1 L2,-5 L9,4" strokeDasharray="2.5 2.5" strokeOpacity="0.72"/>
      <circle cx="2" cy="-5" r="1.8" fill="currentColor"/>
    </g>;
  }
  if (kind === 'tariff') {
    return <g className="hero-pillar-icon" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-14,10 H14 M-11,10 V-5 H11 V10"/>
      <path d="M-15,-5 L0,-13 L15,-5 Z" fill="currentColor" fillOpacity="0.1"/>
      <path d="M-4,10 V1 H4 V10"/>
    </g>;
  }
  return <g className="hero-pillar-icon" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round">
    <path d="M0,-12 V11 M-9,11 H9 M-13,-6 H13"/>
    <path d="M-13,-6 L-17,3 H-9 Z M13,-6 L9,3 H17 Z" fill="currentColor" fillOpacity="0.1"/>
  </g>;
}

function OpiumGraphic({ projection, phase }) {
  const layout = opiumLayout(projection);
  const { coast, nanjing, navalArcs, corridor, corridorLabel, fractureD, fractureEchoD, fractureCenter, pillars, pillarStems, seal } = layout;

  return <g className="hero-scene hero-opium process-graphic process-geography">
    {/* Safe archival disclaimer note at y = 118 */}
    <text x="950" y="118" textAnchor="middle" className="diagram-note hero-header-note">
      行动方向示意 · 非精确战场坐标
    </text>

    {/* Beat 0: Tension radar rings & naval encroachment vectors from the eastern sea */}
    <g data-motion="h1-naval-group">
      <g transform={`translate(${coast.x.toFixed(1)},${coast.y.toFixed(1)})`} aria-hidden="true">
        <g data-motion="h1-radar-0" className="hero-radar-ring" opacity="0">
          <g className="amb-ripple-loop">
            <circle r="30" fill="none" stroke="var(--story-force)" strokeWidth="1.15" strokeDasharray="4 4" strokeOpacity="0.6"/>
          </g>
        </g>
        <g data-motion="h1-radar-1" className="hero-radar-ring" opacity="0">
          <g className="amb-breathe">
            <circle r="52" fill="none" stroke="var(--story-force)" strokeWidth="0.95" strokeDasharray="3 6" strokeOpacity="0.38"/>
            <path d="M-58,0 H-46 M46,0 H58 M0,-58 V-46 M0,46 V58" fill="none" stroke="var(--story-force)" strokeWidth="1" strokeOpacity="0.45"/>
          </g>
        </g>
      </g>

      {navalArcs.map((arc, i) => <g key={`naval-${i}`}>
        <path className="curve-track" d={arc.d}/>
        <path
          data-motion={`h1-naval-arc-${i}`}
          data-route={`h1-naval-route-${i}`}
          className="hero-naval-arc curve-edge curve-edge-force"
          d={arc.d}
          fill="none"
          stroke="var(--story-force)"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <g data-motion={`h1-naval-flow-${i}`} opacity="0" aria-hidden="true">
          <path className="amb-flow-dash amb-flow-dash-force" d={arc.d} fill="none"/>
        </g>
        <ArrivalTip id={`h1-naval-tip-${i}`} x={arc.ex} y={arc.ey} angle={arc.endAngle} tone="force"/>
        <g data-motion={`h1-naval-unit-${i}`} className="route-unit" opacity="0">
          <g data-motion={`h1-naval-unit-${i}-heading`}>
            <Formation size={0.5}/>
          </g>
        </g>
      </g>)}
    </g>

    {/* Beat 1: Vermilion corridor from 东部沿海 -> 南京市 */}
    <path className="curve-track" d={corridor.d}/>
    <path
      data-motion="h1-corridor-band"
      className="south-route-band"
      d={corridor.d}
      fill="none"
      stroke="var(--story-force)"
      strokeWidth="12"
      strokeOpacity="0.13"
      strokeLinecap="round"
      opacity="0"
    />
    <path
      data-motion="h1-corridor"
      data-route="h1-corridor-route"
      className="process-edge process-map-edge curve-edge curve-edge-force"
      d={corridor.d}
      fill="none"
      stroke="var(--story-force)"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <g data-motion="h1-corridor-flow" opacity="0" aria-hidden="true">
      <path className="amb-flow-dash amb-flow-dash-force" d={corridor.d} fill="none"/>
    </g>
    <ArrivalTip id="h1-corridor-tip" x={corridor.ex} y={corridor.ey} angle={corridor.endAngle} tone="force"/>
    <g data-motion="h1-corridor-comet" className="process-messenger" opacity="0">
      <CometHead tone="force" r={5.2}/>
    </g>
    <g transform={`translate(${corridorLabel.x.toFixed(1)},${corridorLabel.y.toFixed(1)})`}>
      <g data-motion="h1-corridor-label" opacity="0">
        <text x="0" y="0" textAnchor="middle" className="process-edge-label hero-sub-label">战争 → 条约</text>
      </g>
    </g>

    {/* Beat 1: Jagged treaty fracture line marking imposed coercion */}
    <g className="hero-fracture-group">
      <path
        data-motion="h1-fracture-echo"
        className="hero-fracture hero-fracture-echo"
        d={fractureEchoD}
        fill="none"
        stroke="var(--motion-seal, var(--story-force))"
        strokeWidth="1.2"
        strokeDasharray="4 4"
        strokeOpacity="0.48"
        opacity="0"
      />
      <path
        data-motion="h1-fracture"
        className="hero-fracture"
        d={fractureD}
        fill="none"
        stroke="var(--motion-seal, var(--story-force))"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g transform={`translate(${fractureCenter.x.toFixed(1)},${fractureCenter.y.toFixed(1)})`}>
        <g data-motion="h1-fracture-note" className="hero-badge hero-badge-force" opacity="0">
          <rect x="-88" y="-15" width="176" height="30" rx="3" fill="var(--ui-bg)" fillOpacity="0.94" stroke="var(--motion-seal, var(--story-force))" strokeWidth="1.25"/>
          <text x="0" y="5.5" textAnchor="middle" className="process-node-note">首个不平等条约</text>
        </g>
      </g>
    </g>

    {/* Projected locations: 东部沿海 & 南京市 */}
    <g transform={`translate(${coast.x.toFixed(1)},${coast.y.toFixed(1)})`} className={`hero-place process-node process-tone-force is-reached ${phase === 0 ? 'is-current hero-place-active' : ''}`} style={{ opacity: 1 }}>
      <g data-motion="h1-coast-ripple-0" opacity="0"><ArrivalRipple r={24} tone="force"/></g>
      <g data-motion="h1-coast-ripple-1" opacity="0"><ArrivalRipple r={30} tone="force"/></g>
      <circle r="21" fill="none" stroke="var(--story-force)" strokeWidth="0.95" strokeOpacity="0.4" className="amb-breathe" aria-hidden="true"/>
      <NodeMedallion radius={19} tone="force" active={phase === 0}>
        <HeroEmblem name="warship" size={22} tone="force"/>
      </NodeMedallion>
      <text x="-27" y="1" textAnchor="end" className="hero-place-label">沿海战事</text>
      <text x="-27" y="27" textAnchor="end" className="process-node-note hero-sub-label">1840 · 鸦片战争</text>
    </g>

    <g transform={`translate(${nanjing.x.toFixed(1)},${nanjing.y.toFixed(1)})`} className={`hero-place process-node process-tone-force ${phase >= 1 ? 'is-reached' : ''} ${phase === 1 ? 'is-current hero-place-active' : ''}`} data-motion="h1-nanjing-node">
      <g data-motion="h1-nanjing-ripple" opacity="0"><ArrivalRipple r={26} tone="force"/></g>
      <NodeMedallion radius={19} tone="force" active={phase === 1}>
        <g className="amb-breathe">
          <HeroEmblem name="treaty-crack" size={21} tone="force"/>
        </g>
      </NodeMedallion>
      <text x="27" y="6" textAnchor="start" className="hero-place-label">1842 · 《南京条约》</text>
    </g>

    {/* Beat 2: Three compact archival sovereignty emblems (领土 / 关税 / 司法) with breach marks */}
    {pillarStems.map((stem, idx) => (
      <path
        key={`stem-${idx}`}
        data-motion={`h1-stem-${idx}`}
        className="curve-edge curve-edge-force"
        d={stem.d}
        fill="none"
        stroke="var(--motion-seal, var(--story-force))"
        strokeWidth="1.5"
        strokeOpacity="0.72"
      />
    ))}

    {pillars.map((pillar, i) => <g key={pillar.id} transform={`translate(${pillar.x.toFixed(1)},${pillar.y.toFixed(1)})`}>
      <g data-motion={`h1-pillar-${i}`} className="hero-pillar" color="var(--story-organization)" opacity="0">
        <rect
          className="hero-pillar-frame"
          x="-36"
          y="-26"
          width="72"
          height="50"
          rx="3"
          fill="var(--ui-bg)"
          stroke="var(--story-organization)"
          strokeWidth="1.5"
        />
        <rect
          x="-31.5"
          y="-21.5"
          width="63"
          height="41"
          rx="1.5"
          fill="currentColor"
          fillOpacity="0.06"
          stroke="var(--story-organization)"
          strokeWidth="0.75"
          strokeOpacity="0.4"
        />
        <g transform="translate(0,-1)">
          <SovereigntyGlyph kind={pillar.id}/>
        </g>
        <text x="0" y="48" textAnchor="middle" className="hero-pillar-label">{pillar.label}</text>
      </g>
      {/* Subtle archival breach slash stamped across each pillar */}
      <g data-motion={`h1-breach-${i}`} className="hero-pillar-breach" opacity="0">
        <path
          d="M-24,18 L24,-18 M15,-22 L28,-9"
          fill="none"
          stroke="var(--motion-seal, var(--story-force))"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="24" cy="-18" r="3" fill="var(--motion-seal, var(--story-force))"/>
      </g>
    </g>)}

    {/* Beat 2: Cinnabar archival SealStamp (y <= 546, subtext baseline <= 580) */}
    <g transform={`translate(${seal.x.toFixed(1)},${seal.y})`}>
      <g data-motion="h1-seal-ripple" opacity="0">
        <ArrivalRipple r={36} tone="force"/>
      </g>
      <g data-motion="h1-seal" className="process-outcome" opacity="0">
        <SealStamp text="主权受损" subtext="半殖民地半封建社会开端" tone="force" width={186}/>
      </g>
    </g>
  </g>;
}

function animateOpium(story, _projection, { add, show, pop, stamp, ripple, travel, trace }) {
  const end = story?.duration || 21;

  // Beat 0 (0–7s): Coastal radar + 3 naval pressure arcs sweeping inward
  pop('h1-radar-0', 0.2, end + 1, { scaleFrom: 0.72, dy: 0 });
  pop('h1-radar-1', 0.45, end + 1, { scaleFrom: 0.72, dy: 0 });
  ripple('h1-coast-ripple-0', 0.55, 1.55);

  [0, 1, 2].forEach((i) => {
    const start = 0.5 + i * 0.3;
    const arrive = 3.8 + i * 0.25;
    trace(`h1-naval-arc-${i}`, start, arrive);
    show(`h1-naval-flow-${i}`, arrive);
    pop(`h1-naval-tip-${i}`, arrive - 0.05, end + 1, { scaleFrom: 0.45, dy: 0 });
    show(`h1-naval-unit-${i}`, start, 7.35);
    travel(`h1-naval-unit-${i}`, `h1-naval-route-${i}`, start, arrive);
  });
  ripple('h1-coast-ripple-1', 4.15, 1.6);

  // Gently soften Beat 0 naval clutter when Beat 1 shifts focus to Nanjing
  add('h1-naval-group', [
    { at: 0, opacity: 1 },
    { at: 7.0, opacity: 1, easing: DOC_EASE },
    { at: 8.2, opacity: 0.42 },
    { at: end, opacity: 0.42 },
  ]);

  // Nanjing node dims softly in Beat 0 and illuminates upon arrival in Beat 1
  add('h1-nanjing-node', [
    { at: 0, opacity: 0.34 },
    { at: 7.2, opacity: 0.34, easing: DOC_EASE },
    { at: 10.6, opacity: 1 },
    { at: end, opacity: 1 },
  ]);

  // Beat 1 (7–14s): Vermilion corridor 东部沿海 -> 南京市 (mid-trace right around 42–48% = 8.8–10.1s)
  trace('h1-corridor-band', 7.25, 11.2);
  trace('h1-corridor', 7.25, 11.2);
  show('h1-corridor-flow', 11.2);
  pop('h1-corridor-tip', 11.15, end + 1, { scaleFrom: 0.45, dy: 0 });
  show('h1-corridor-comet', 7.25, 11.45);
  travel('h1-corridor-comet', 'h1-corridor-route', 7.25, 11.2);
  pop('h1-corridor-label', 8.1);
  ripple('h1-nanjing-ripple', 11.2, 1.65);

  // Coercion fracture splits across Nanjing's threshold right after arrival
  trace('h1-fracture', 11.35, 12.75);
  show('h1-fracture-echo', 11.9);
  pop('h1-fracture-note', 12.45);

  // Beat 2 (14–21s): Sovereignty emblems pop, receive cinnabar breach marks, converge to SealStamp
  [0, 1, 2].forEach((i) => {
    pop(`h1-pillar-${i}`, 14.15 + i * 0.3, end + 1, { scaleFrom: 0.84, dy: 8 });
    stamp(`h1-breach-${i}`, 15.15 + i * 0.25);
    trace(`h1-stem-${i}`, 15.65 + i * 0.12, 16.35 + i * 0.12);
  });

  stamp('h1-seal', 16.45);
  ripple('h1-seal-ripple', 16.5, 1.55);
}

/* ========================================================================== */
/* e-20: 五四运动 (1919) — Beijing Shockwaves, Shanghai Three Strikes & Union  */
/* ========================================================================== */

function mayFourthLayout(projection) {
  const beijing = projectPlace(projection, '北京市', [864.6, 175]);
  const shanghai = projectPlace(projection, '上海市', [1035.4, 535]);

  // Diplomatic setback badge to the left of Beijing
  const setback = { x: clamp(beijing.x - 186, 656, 712), y: beijing.y };
  const ignitionArc = curveData(
    { x: setback.x + 108, y: setback.y },
    beijing,
    { bend: -18, trimStart: 2, trimEnd: 24 },
  );

  // Energetic vermilion propagation wave bending gently eastward from Beijing to Shanghai
  const mainWave = curveData(beijing, shanghai, { bend: -72, trimStart: 24, trimEnd: 24 });
  const echoWave = curveData(beijing, shanghai, { bend: -50, trimStart: 25, trimEnd: 25 });
  const waveLabel = {
    x: clamp(mainWave.mx + 112, 1060, 1180),
    y: clamp(mainWave.my - 42, 268, 322),
  };

  // Three staggered strike waves (罢课 / 罢工 / 罢市) fanning cleanly northeast/east from Shanghai
  const strikes = [
    { id: 'class', label: '罢课', x: clamp(shanghai.x + 136, 1130, 1215), y: clamp(shanghai.y - 168, 348, 385), bend: -28 },
    { id: 'work', label: '罢工', x: clamp(shanghai.x + 212, 1205, 1285), y: clamp(shanghai.y - 112, 404, 442), bend: -22 },
    { id: 'market', label: '罢市', x: clamp(shanghai.x + 240, 1230, 1304), y: clamp(shanghai.y - 48, 466, 502), bend: -14 },
  ].map((s) => ({
    ...s,
    curve: curveData(shanghai, s, { bend: s.bend, trimStart: 24, trimEnd: 45 }),
  }));

  // Beat 2: Twin convergence medallions + glowing arcs into SealStamp in open lower-left space
  const sealX = clamp(Math.min(762, shanghai.x - 272), 716, 784);
  const sealY = 524;
  const marxism = { x: sealX - 110, y: 344 };
  const workers = { x: sealX + 110, y: 368 };

  const beijingHintArc = curveData(beijing, marxism, { bend: 26, trimStart: 24, trimEnd: 34 });
  const shanghaiFeedArc = curveData(shanghai, workers, { bend: 24, trimStart: 24, trimEnd: 34 });
  const convergeLeft = curveData(marxism, { x: sealX - 54, y: sealY - 26 }, { bend: 36, trimStart: 32, trimEnd: 6 });
  const convergeRight = curveData(workers, { x: sealX + 54, y: sealY - 26 }, { bend: -32, trimStart: 32, trimEnd: 6 });

  return {
    beijing,
    shanghai,
    setback,
    ignitionArc,
    mainWave,
    echoWave,
    waveLabel,
    strikes,
    marxism,
    workers,
    beijingHintArc,
    shanghaiFeedArc,
    convergeLeft,
    convergeRight,
    seal: { x: sealX, y: sealY },
  };
}

function MayFourthGraphic({ projection, phase }) {
  const layout = mayFourthLayout(projection);
  const {
    beijing,
    shanghai,
    setback,
    ignitionArc,
    mainWave,
    echoWave,
    waveLabel,
    strikes,
    marxism,
    workers,
    beijingHintArc,
    shanghaiFeedArc,
    convergeLeft,
    convergeRight,
    seal,
  } = layout;

  return <g className="hero-scene hero-mayfourth process-graphic process-geography">
    <text x="950" y="118" textAnchor="middle" className="diagram-note hero-header-note">
      运动传播与结合关系示意 · 非精确游行路线
    </text>

    {/* Beat 0: Diplomatic setback cue & ignition spark into Beijing */}
    <path className="curve-track" d={ignitionArc.d}/>
    <path
      data-motion="h20-ignition-arc"
      data-route="h20-ignition-route"
      className="curve-edge curve-edge-force"
      d={ignitionArc.d}
      fill="none"
      stroke="var(--story-force)"
      strokeWidth="2.1"
      strokeLinecap="round"
    />
    <ArrivalTip id="h20-ignition-tip" x={ignitionArc.ex} y={ignitionArc.ey} angle={ignitionArc.endAngle} tone="force"/>
    <g data-motion="h20-ignition-comet" opacity="0">
      <CometHead tone="force" r={4.2}/>
    </g>

    <g transform={`translate(${setback.x.toFixed(1)},${setback.y.toFixed(1)})`}>
      <g data-motion="h20-setback" className="hero-badge hero-badge-force" opacity="0">
        <rect
          x="-106"
          y="-18"
          width="212"
          height="36"
          rx="3"
          fill="var(--ui-bg)"
          fillOpacity="0.95"
          stroke="var(--motion-seal, var(--story-force))"
          strokeWidth="1.45"
        />
        <path d="M-96,-6 L-88,6 M-88,-6 L-96,6" fill="none" stroke="var(--motion-seal, var(--story-force))" strokeWidth="1.7" strokeLinecap="round"/>
        <text x="8" y="5.5" textAnchor="middle" className="process-node-note">巴黎和会外交失败</text>
      </g>
    </g>

    {/* Multi-ring patriot shockwave backdrop at Beijing */}
    <g transform={`translate(${beijing.x.toFixed(1)},${beijing.y.toFixed(1)})`} aria-hidden="true">
      <g data-motion="h20-bj-ambient-0" className="hero-radar-ring" opacity="0">
        <g className="amb-ripple-loop">
          <circle r="27" fill="none" stroke="var(--story-force)" strokeWidth="1.25" strokeOpacity="0.56"/>
        </g>
      </g>
      <g data-motion="h20-bj-ambient-1" className="hero-radar-ring" opacity="0">
        <g className="amb-breathe">
          <circle r="44" fill="none" stroke="var(--story-force)" strokeWidth="0.95" strokeDasharray="4 5" strokeOpacity="0.38"/>
        </g>
      </g>
      {[0, 1, 2].map((k) => (
        <g key={`bj-rip-${k}`} data-motion={`h20-bj-ripple-${k}`} opacity="0">
          <ArrivalRipple r={24 + k * 10} tone="force"/>
        </g>
      ))}
    </g>

    {/* Beat 1: Energetic curved vermilion propagation wave Beijing -> Shanghai */}
    <path className="curve-track" d={mainWave.d}/>
    <path
      data-motion="h20-echo-wave"
      className="hero-spark-wave"
      d={echoWave.d}
      fill="none"
      stroke="var(--story-force)"
      strokeWidth="1.45"
      strokeOpacity="0.45"
      strokeLinecap="round"
    />
    <path
      data-motion="h20-main-wave"
      data-route="h20-main-route"
      className="process-edge process-map-edge curve-edge curve-edge-force"
      d={mainWave.d}
      fill="none"
      stroke="var(--story-force)"
      strokeWidth="3.1"
      strokeLinecap="round"
    />
    <g data-motion="h20-main-flow" opacity="0" aria-hidden="true">
      <path className="amb-flow-dash amb-flow-dash-force" d={mainWave.d} fill="none"/>
    </g>
    <ArrivalTip id="h20-main-tip" x={mainWave.ex} y={mainWave.ey} angle={mainWave.endAngle} tone="force"/>
    <g data-motion="h20-main-comet" className="process-messenger" opacity="0">
      <CometHead tone="force" r={5.4}/>
    </g>
    <g transform={`translate(${waveLabel.x.toFixed(1)},${waveLabel.y.toFixed(1)})`}>
      <g data-motion="h20-wave-label" opacity="0">
        <text x="0" y="0" textAnchor="middle" className="process-edge-label hero-sub-label">群众运动扩大</text>
      </g>
    </g>

    {/* Beat 1: Three staggered strike spark waves (罢课 / 罢工 / 罢市) radiating from Shanghai */}
    {strikes.map((s, i) => <g key={s.id}>
      <path
        data-motion={`h20-strike-arc-${i}`}
        data-route={`h20-strike-route-${i}`}
        className="hero-spark-wave"
        d={s.curve.d}
        fill="none"
        stroke="var(--story-force)"
        strokeWidth="1.85"
        strokeLinecap="round"
      />
      <ArrivalTip id={`h20-strike-tip-${i}`} x={s.curve.ex} y={s.curve.ey} angle={s.curve.endAngle} tone="force"/>
      <g data-motion={`h20-strike-spark-${i}`} className="union-spark union-spark-force" opacity="0">
        <circle r="3.8" fill="var(--story-force)" filter="url(#map-glow-force)"/>
      </g>
      <g transform={`translate(${s.x.toFixed(1)},${s.y.toFixed(1)})`}>
        <g data-motion={`h20-strike-badge-${i}`} className="hero-badge hero-badge-force" opacity="0">
          <rect
            x="-39"
            y="-17"
            width="78"
            height="34"
            rx="17"
            fill="var(--ui-bg)"
            fillOpacity="0.95"
            stroke="var(--story-force)"
            strokeWidth="1.45"
          />
          <text x="0" y="6" textAnchor="middle" className="hero-badge-label">{s.label}</text>
        </g>
      </g>
    </g>)}

    {/* Projected locations: 北京市 & 上海市 */}
    <g transform={`translate(${beijing.x.toFixed(1)},${beijing.y.toFixed(1)})`} className={`hero-place process-node process-tone-force is-reached ${phase === 0 ? 'is-current hero-place-active' : ''}`} style={{ opacity: 1 }}>
      <g className="amb-torch-flicker" aria-hidden="true">
        <circle r="23" fill="var(--hero-gold, var(--motion-sector-2))" fillOpacity="0.14" stroke="none"/>
      </g>
      <NodeMedallion radius={20} tone="force" active={phase === 0}>
        <g className="amb-torch-flicker">
          <HeroEmblem name="torch" size={23} tone="force"/>
        </g>
      </NodeMedallion>
      <text x="28" y="5" textAnchor="start" className="hero-place-label">1919.5.4 · 北京学生爱国运动</text>
    </g>

    <g transform={`translate(${shanghai.x.toFixed(1)},${shanghai.y.toFixed(1)})`} className={`hero-place process-node process-tone-force ${phase >= 1 ? 'is-reached' : ''} ${phase === 1 ? 'is-current hero-place-active' : ''}`} data-motion="h20-shanghai-node">
      {[0, 1, 2].map((k) => (
        <g key={`sh-rip-${k}`} data-motion={`h20-sh-ripple-${k}`} opacity="0">
          <ArrivalRipple r={22 + k * 8} tone="force"/>
        </g>
      ))}
      <NodeMedallion radius={19} tone="force" active={phase === 1}>
        <g className="amb-gear-cw">
          <HeroEmblem name="industry-gear" size={21} tone="force"/>
        </g>
      </NodeMedallion>
      <text x="27" y="-2" textAnchor="start" className="hero-place-label">上海</text>
      <text x="27" y="23" textAnchor="start" className="process-node-note hero-sub-label">工人阶级登上历史舞台</text>
    </g>

    {/* Beat 2: Twin curved glowing convergence arcs (马克思主义传播 + 工人运动) -> SealStamp */}
    <path
      data-motion="h20-bj-hint"
      className="curve-track"
      d={beijingHintArc.d}
      fill="none"
      stroke="var(--story-organization)"
      strokeWidth="1.2"
      strokeDasharray="4 6"
      opacity="0"
    />
    <path
      data-motion="h20-sh-feed"
      className="hero-converge-arc hero-converge-arc-force"
      d={shanghaiFeedArc.d}
      fill="none"
      stroke="var(--story-force)"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <ArrivalTip id="h20-sh-feed-tip" x={shanghaiFeedArc.ex} y={shanghaiFeedArc.ey} angle={shanghaiFeedArc.endAngle} tone="force"/>

    {/* Left convergence arc: 马克思主义传播 */}
    <path className="curve-track" d={convergeLeft.d} data-motion="h20-conv-track-l" opacity="0"/>
    <path
      data-motion="h20-conv-arc-l"
      data-route="h20-conv-route-l"
      className="hero-converge-arc curve-edge"
      d={convergeLeft.d}
      fill="none"
      stroke="var(--story-organization)"
      strokeWidth="2.6"
      strokeLinecap="round"
    />
    <g data-motion="h20-conv-flow-l" opacity="0" aria-hidden="true">
      <path className="amb-flow-dash amb-flow-dash-org" d={convergeLeft.d} fill="none"/>
    </g>
    <ArrivalTip id="h20-conv-tip-l" x={convergeLeft.ex} y={convergeLeft.ey} angle={convergeLeft.endAngle} tone="organization"/>
    <g data-motion="h20-conv-comet-l" opacity="0">
      <CometHead tone="organization" r={4.8}/>
    </g>

    {/* Right convergence arc: 工人运动 */}
    <path className="curve-track" d={convergeRight.d} data-motion="h20-conv-track-r" opacity="0"/>
    <path
      data-motion="h20-conv-arc-r"
      data-route="h20-conv-route-r"
      className="hero-converge-arc hero-converge-arc-force curve-edge curve-edge-force"
      d={convergeRight.d}
      fill="none"
      stroke="var(--story-force)"
      strokeWidth="2.6"
      strokeLinecap="round"
    />
    <g data-motion="h20-conv-flow-r" opacity="0" aria-hidden="true">
      <path className="amb-flow-dash amb-flow-dash-force" d={convergeRight.d} fill="none"/>
    </g>
    <ArrivalTip id="h20-conv-tip-r" x={convergeRight.ex} y={convergeRight.ey} angle={convergeRight.endAngle} tone="force"/>
    <g data-motion="h20-conv-comet-r" opacity="0">
      <CometHead tone="force" r={4.8}/>
    </g>

    {/* Convergence source medallions */}
    <g transform={`translate(${marxism.x.toFixed(1)},${marxism.y.toFixed(1)})`}>
      <g data-motion="h20-marxism-ripple" opacity="0"><ArrivalRipple r={30} tone="organization"/></g>
      <g data-motion="h20-marxism-node" className="process-tone-organization" opacity="0">
        <circle r="28" fill="none" stroke="var(--story-organization)" strokeWidth="1" strokeOpacity="0.34" className="amb-breathe" aria-hidden="true"/>
        <NodeMedallion radius={25} tone="organization" active={phase >= 2}>
          <BookOpenText x={-11} y={-11} size={22} weight="regular"/>
        </NodeMedallion>
        <text x="0" y="-38" textAnchor="middle" className="hero-pillar-label">马克思主义传播</text>
      </g>
    </g>

    <g transform={`translate(${workers.x.toFixed(1)},${workers.y.toFixed(1)})`}>
      <g data-motion="h20-workers-ripple" opacity="0"><ArrivalRipple r={30} tone="force"/></g>
      <g data-motion="h20-workers-node" className="process-tone-force" opacity="0">
        <circle r="28" fill="none" stroke="var(--story-force)" strokeWidth="1" strokeOpacity="0.34" className="amb-breathe" aria-hidden="true"/>
        <NodeMedallion radius={25} tone="force" active={phase >= 2}>
          <UsersThree x={-11} y={-11} size={22} weight="regular"/>
        </NodeMedallion>
        <text x="0" y="-38" textAnchor="middle" className="hero-pillar-label">工人运动</text>
      </g>
    </g>

    {/* Beat 2: Archival SealStamp (y <= 546, subtext baseline <= 580) */}
    <g transform={`translate(${seal.x.toFixed(1)},${seal.y})`}>
      <g data-motion="h20-seal-ripple-0" opacity="0"><ArrivalRipple r={36} tone="force"/></g>
      <g data-motion="h20-seal-ripple-1" opacity="0"><ArrivalRipple r={46} tone="organization"/></g>
      <g data-motion="h20-seal" className="process-outcome" opacity="0">
        <SealStamp text="马克思主义与工人运动结合" subtext="新民主主义革命开端" tone="organization" width={344}/>
      </g>
    </g>
  </g>;
}

function animateMayFourth(story, _projection, { add, show, pop, stamp, ripple, travel, trace }) {
  const end = story?.duration || 21;

  // Beat 0 (0–7s): Diplomatic setback sparks patriotic shockwaves in Beijing
  pop('h20-setback', 0.25, end + 1, { scaleFrom: 0.86, dy: 6 });
  trace('h20-ignition-arc', 0.65, 1.55);
  pop('h20-ignition-tip', 1.5, end + 1, { scaleFrom: 0.45, dy: 0 });
  show('h20-ignition-comet', 0.65, 1.75);
  travel('h20-ignition-comet', 'h20-ignition-route', 0.65, 1.55);

  pop('h20-bj-ambient-0', 1.55, end + 1, { scaleFrom: 0.65, dy: 0 });
  pop('h20-bj-ambient-1', 1.85, end + 1, { scaleFrom: 0.65, dy: 0 });
  ripple('h20-bj-ripple-0', 1.6, 1.65);
  ripple('h20-bj-ripple-1', 2.35, 1.75, { scaleTo: 2.3 });
  ripple('h20-bj-ripple-2', 3.15, 1.85, { scaleTo: 2.45, peakOpacity: 0.72 });

  // Shanghai dims softly until Beat 1 arrival
  add('h20-shanghai-node', [
    { at: 0, opacity: 0.32 },
    { at: 7.2, opacity: 0.32, easing: DOC_EASE },
    { at: 10.6, opacity: 1 },
    { at: end, opacity: 1 },
  ]);

  // Beat 1 (7–14s): Energetic vermilion propagation wave Beijing -> Shanghai (mid-trace around 8.8–10.1s)
  trace('h20-main-wave', 7.2, 10.8);
  trace('h20-echo-wave', 7.55, 11.05);
  show('h20-main-flow', 10.8);
  pop('h20-main-tip', 10.75, end + 1, { scaleFrom: 0.45, dy: 0 });
  show('h20-main-comet', 7.2, 11.05);
  travel('h20-main-comet', 'h20-main-route', 7.2, 10.8);
  pop('h20-wave-label', 8.05);

  // Staggered Three Strikes (罢课 / 罢工 / 罢市) spark waves radiating from Shanghai
  [0, 1, 2].forEach((i) => {
    const start = 10.85 + i * 0.42;
    const arrive = start + 1.15;
    ripple(`h20-sh-ripple-${i}`, start, 1.5);
    trace(`h20-strike-arc-${i}`, start, arrive);
    pop(`h20-strike-tip-${i}`, arrive - 0.05, end + 1, { scaleFrom: 0.45, dy: 0 });
    show(`h20-strike-spark-${i}`, start, arrive + 0.25);
    travel(`h20-strike-spark-${i}`, `h20-strike-route-${i}`, start, arrive);
    pop(`h20-strike-badge-${i}`, arrive - 0.05, end + 1, { scaleFrom: 0.78, dy: 6 });
  });

  // Beat 2 (14–21s): Twin glowing convergence arcs into SealStamp
  show('h20-bj-hint', 14.15);
  pop('h20-marxism-node', 14.25, end + 1, { scaleFrom: 0.82, dy: 8 });
  ripple('h20-marxism-ripple', 14.35, 1.4);

  trace('h20-sh-feed', 14.1, 14.95);
  pop('h20-sh-feed-tip', 14.9, end + 1, { scaleFrom: 0.45, dy: 0 });
  pop('h20-workers-node', 14.75, end + 1, { scaleFrom: 0.82, dy: 8 });
  ripple('h20-workers-ripple', 14.85, 1.4);

  show('h20-conv-track-l', 14.6);
  show('h20-conv-track-r', 14.8);
  trace('h20-conv-arc-l', 14.75, 16.5);
  show('h20-conv-flow-l', 16.5);
  pop('h20-conv-tip-l', 16.45, end + 1, { scaleFrom: 0.45, dy: 0 });
  show('h20-conv-comet-l', 14.75, 16.75);
  travel('h20-conv-comet-l', 'h20-conv-route-l', 14.75, 16.5);

  trace('h20-conv-arc-r', 15.0, 16.7);
  show('h20-conv-flow-r', 16.7);
  pop('h20-conv-tip-r', 16.65, end + 1, { scaleFrom: 0.45, dy: 0 });
  show('h20-conv-comet-r', 15.0, 16.95);
  travel('h20-conv-comet-r', 'h20-conv-route-r', 15.0, 16.7);

  stamp('h20-seal', 16.7);
  ripple('h20-seal-ripple-0', 16.75, 1.6);
  ripple('h20-seal-ripple-1', 17.05, 1.75, { scaleTo: 2.35, peakOpacity: 0.65 });
}

/* ========================================================================== */
/* e-21: 中共一大 (1921) — Shanghai Beacon, Stealth Transfer & 南湖红船         */
/* ========================================================================== */

const STEALTH_DASH_COUNT = 16;

function congressLayout(projection) {
  const shanghai = projectPlace(projection, '上海市', [1187.4, 175]);
  const jiaxing = projectPlace(projection, '嘉兴市', [712.6, 535]);

  // Ensure Shanghai & Jiaxing labels always separate cleanly even under tighter projections
  const closeCities = Math.hypot(shanghai.x - jiaxing.x, shanghai.y - jiaxing.y) < 220;
  const shLabelSide = shanghai.x > 960 ? -1 : 1;
  const shLabel = {
    x: shanghai.x + shLabelSide * 38,
    y: shanghai.y - (closeCities ? 16 : 2),
    anchor: shLabelSide < 0 ? 'end' : 'start',
  };

  // Disruption alert stamp positioned neatly clear of Shanghai label & transfer corridor
  const alertPos = {
    x: clamp(shanghai.x + (shLabelSide < 0 ? 64 : -64), 640, 1285),
    y: clamp(shanghai.y + 66, 228, 282),
  };

  // Stealth transfer corridor from 上海市 -> 嘉兴市 bending gently northwest
  const corridor = curveData(shanghai, jiaxing, { bend: 64, trimStart: 34, trimEnd: 40 });
  // Boat travel path starts just outside Shanghai and docks centered on Jiaxing Nanhu
  const boatCurve = curveData(shanghai, { x: jiaxing.x, y: jiaxing.y - 2 }, { bend: 64, trimStart: 32, trimEnd: 0 });

  const p0 = [corridor.sx, corridor.sy];
  const pc = [corridor.cx, corridor.cy];
  const p1 = [corridor.ex, corridor.ey];
  const stealthDashes = Array.from({ length: STEALTH_DASH_COUNT }, (_, i) => {
    const t0 = i / STEALTH_DASH_COUNT;
    const t1 = Math.min(1, (i + 0.54) / STEALTH_DASH_COUNT);
    return quadSubSegment(p0, pc, p1, t0, t1);
  });

  const transferNote = {
    x: clamp(corridor.mx - 92, 680, 920),
    y: clamp(corridor.my - 42, 240, 325),
  };

  // Founding SealStamp placed in wide-open bottom-right canvas (strictly y <= 546, clear of Jiaxing)
  const sealX = clamp(Math.max(1124, jiaxing.x + 390), 1060, 1185);
  const sealY = 524;

  // Jiaxing Nanhu label cleanly to the right of the Red Boat, >140px left of SealStamp
  const jxLabel = {
    x: clamp(jiaxing.x + 56, 680, sealX - 246),
    y: jiaxing.y + (closeCities ? 28 : 4),
    anchor: 'start',
  };

  // Luminous golden-vermilion founding arc connecting the Red Boat beacon to the SealStamp
  const foundingArc = curveData(
    { x: jiaxing.x + 48, y: jiaxing.y - 30 },
    { x: sealX - 124, y: sealY - 8 },
    { bend: -34, trimStart: 6, trimEnd: 6 },
  );

  // 12 architectural starburst rays around the Nanhu Red Boat (offset 15 deg so zero rays are flat H/V)
  const starRays = Array.from({ length: 12 }, (_, i) => {
    const deg = i * 30 + 15 - 90;
    const rad = (deg * Math.PI) / 180;
    const rIn = i % 2 === 0 ? 35 : 37;
    const rOut = i % 2 === 0 ? 58 : 47;
    return {
      x1: Math.cos(rad) * rIn,
      y1: Math.sin(rad) * rIn,
      x2: Math.cos(rad) * rOut,
      y2: Math.sin(rad) * rOut,
      major: i % 2 === 0,
    };
  });

  return {
    shanghai,
    jiaxing,
    shLabel,
    alertPos,
    corridor,
    boatCurve,
    stealthDashes,
    transferNote,
    jxLabel,
    foundingArc,
    starRays,
    seal: { x: sealX, y: sealY },
  };
}

/** Bespoke minimalist editorial silhouette of the 嘉兴南湖红船 (Red Boat). */
function RedBoatSilhouette() {
  return <g className="hero-red-boat" aria-hidden="true">
    {/* Soft Nanhu water reflection lines */}
    <path
      className="hero-red-boat-water"
      d="M-32,12.5 Q-14,15 0,12.5 T32,12.5"
      fill="none"
      stroke="var(--story-organization)"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeOpacity="0.62"
    />
    <path
      className="hero-red-boat-water"
      d="M-21,16.5 Q0,18.5 21,16.5"
      fill="none"
      stroke="var(--story-organization)"
      strokeWidth="0.95"
      strokeLinecap="round"
      strokeOpacity="0.4"
    />

    {/* Traditional Jiangnan curved wooden hull facing southwest (left) */}
    <path
      className="hero-red-boat-hull"
      d="M-34,1.5 Q-28,10.5 -16,11.2 L20,11.2 Q29,10.5 33,2.5 L24,3.5 L-24,3.5 Z"
      fill="var(--hero-boat-hull, var(--motion-seal, var(--story-force)))"
      stroke="var(--ui-bg)"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    {/* Crisp deck railing accent */}
    <path
      d="M-25,3.2 L25,3.2"
      fill="none"
      stroke="var(--hero-gold, var(--motion-sector-2, #e5c37a))"
      strokeWidth="1.15"
      strokeOpacity="0.88"
    />

    {/* Painted boat cabin body */}
    <path
      className="hero-red-boat-cabin"
      d="M-17,3.2 L-15.5,-7.2 L16.5,-7.2 L18,3.2 Z"
      fill="var(--ui-bg)"
      stroke="var(--hero-boat-hull, var(--motion-seal, var(--story-force)))"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />

    {/* Three warm lantern-lit lattice windows */}
    <rect className="hero-red-boat-window" x="-11.5" y="-4.8" width="5.8" height="5.4" rx="0.9" fill="var(--hero-gold, var(--motion-sector-2, #e8c376))" fillOpacity="0.92"/>
    <rect className="hero-red-boat-window" x="-2.9" y="-4.8" width="5.8" height="5.4" rx="0.9" fill="var(--hero-gold, var(--motion-sector-2, #e8c376))" fillOpacity="0.92"/>
    <rect className="hero-red-boat-window" x="5.7" y="-4.8" width="5.8" height="5.4" rx="0.9" fill="var(--hero-gold, var(--motion-sector-2, #e8c376))" fillOpacity="0.92"/>

    {/* Arched traditional cabin roof with gently upturned eaves */}
    <path
      className="hero-red-boat-roof"
      d="M-22.5,-6.2 Q-12,-14.8 0.5,-15.2 Q13,-14.8 23.5,-6.2 Q12,-8.2 0.5,-8.4 Q-11,-8.2 -22.5,-6.2 Z"
      fill="var(--hero-boat-hull, var(--motion-seal, var(--story-force)))"
      stroke="var(--ui-bg)"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
    {/* Subtle bow lantern + stern sculling oar */}
    <circle cx="-24.5" cy="-1.2" r="2.2" fill="var(--hero-gold, var(--motion-sector-2, #f2cf84))" filter="url(#map-glow-force)"/>
    <path
      d="M23,3.5 L34.5,9.5"
      fill="none"
      stroke="var(--hero-boat-hull, var(--motion-seal, var(--story-force)))"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </g>;
}

function CongressGraphic({ projection, phase, prefix }) {
  const layout = congressLayout(projection);
  const {
    shanghai,
    jiaxing,
    shLabel,
    alertPos,
    corridor,
    boatCurve,
    stealthDashes,
    transferNote,
    jxLabel,
    foundingArc,
    starRays,
    seal,
  } = layout;
  const gradId = `${prefix || 'e-21'}-starlight-glow`;

  return <g className="hero-scene hero-congress process-graphic process-geography">
    <defs>
      <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="var(--hero-gold, var(--motion-sector-2, #f2c979))" stopOpacity="0.44"/>
        <stop offset="55%" stopColor="var(--story-force)" stopOpacity="0.16"/>
        <stop offset="100%" stopColor="var(--story-force)" stopOpacity="0"/>
      </radialGradient>
    </defs>

    <text x="950" y="118" textAnchor="middle" className="diagram-note hero-header-note">
      会议转移方向示意 · 上海 → 嘉兴南湖
    </text>

    {/* Beat 1: Stealth dashed curved transfer corridor 上海市 -> 嘉兴市 */}
    <path data-motion="h21-transfer-track" className="curve-track" d={corridor.d} opacity="0"/>
    <path data-route="h21-boat-route" d={boatCurve.d} fill="none" stroke="none"/>

    <g className="hero-stealth-corridor">
      {stealthDashes.map((d, i) => (
        <path
          key={`dash-${i}`}
          data-motion={`h21-dash-${i}`}
          className="hero-stealth-dash"
          d={d}
          fill="none"
          stroke="var(--story-force)"
          strokeWidth="2.6"
          strokeLinecap="round"
          opacity="0"
        />
      ))}
    </g>
    <ArrivalTip id="h21-transfer-tip" x={corridor.ex} y={corridor.ey} angle={corridor.endAngle} tone="force"/>

    <g transform={`translate(${transferNote.x.toFixed(1)},${transferNote.y.toFixed(1)})`}>
      <g data-motion="h21-transfer-note" className="hero-badge hero-badge-force" opacity="0">
        <rect x="-76" y="-16" width="152" height="32" rx="16" fill="var(--ui-bg)" fillOpacity="0.94" stroke="var(--story-force)" strokeWidth="1.25" strokeDasharray="4 3"/>
        <g transform="translate(-52, 0)">
          <HeroEmblem name="red-boat-emblem" size={19} tone="force"/>
        </g>
        <text x="12" y="5.5" textAnchor="middle" className="process-node-note">转移至南湖</text>
      </g>
    </g>

    {/* Beat 0 & Beat 1: Shanghai opening beacon + search/disruption alert */}
    <g transform={`translate(${shanghai.x.toFixed(1)},${shanghai.y.toFixed(1)})`} className={`hero-place hero-beacon process-node process-tone-force is-reached ${phase === 0 ? 'is-current hero-place-active' : ''}`} style={{ opacity: 1 }}>
      <g data-motion="h21-sh-ripple-0" opacity="0"><ArrivalRipple r={24} tone="force"/></g>
      <g data-motion="h21-sh-ripple-1" opacity="0"><ArrivalRipple r={32} tone="force"/></g>
      <g data-motion="h21-sh-alert-ripple" opacity="0"><ArrivalRipple r={34} tone="force"/></g>

      {/* Subtle search/disruption warning ring at Beat 1 */}
      <g data-motion="h21-alert-ring" className="hero-alert-ring" opacity="0">
        <circle r="34" fill="none" stroke="var(--motion-seal, var(--story-force))" strokeWidth="1.6" strokeDasharray="5 4"/>
        <path d="M-26,-26 L-20,-20 M26,-26 L20,-20 M-26,26 L-20,20 M26,26 L20,20" fill="none" stroke="var(--motion-seal, var(--story-force))" strokeWidth="1.5" strokeLinecap="round"/>
      </g>

      {/* Warm archival opening beacon medallion */}
      <g data-motion="h21-sh-beacon" opacity="0">
        <circle r="23" fill="none" stroke="var(--hero-gold, var(--motion-sector-2))" strokeWidth="1" strokeOpacity="0.4" className="amb-breathe" aria-hidden="true"/>
        <NodeMedallion radius={20} tone="force" active={phase === 0}>
          <g className="amb-torch-flicker">
            <HeroEmblem name="torch" size={21} tone="gold"/>
          </g>
        </NodeMedallion>
      </g>
    </g>

    {/* Shanghai primary + party membership labels positioned cleanly to the left */}
    <g data-motion="h21-sh-labels" opacity="0">
      <text x={shLabel.x.toFixed(1)} y={shLabel.y.toFixed(1)} textAnchor={shLabel.anchor} className="hero-place-label">
        1921.7.23 · 上海开幕
      </text>
      <text x={shLabel.x.toFixed(1)} y={(shLabel.y + 29).toFixed(1)} textAnchor={shLabel.anchor} className="process-node-note hero-sub-label">
        代表50余名党员
      </text>
    </g>

    {/* Angled mini alert mark near Shanghai (Beat 1) */}
    <g transform={`translate(${alertPos.x.toFixed(1)},${alertPos.y.toFixed(1)})`}>
      <g data-motion="h21-alert-mark" opacity="0">
        <RejectSeal label="会场受扰" angle={-10}/>
      </g>
    </g>

    {/* Beat 2: Warm golden-vermilion starlight beacon layered behind the Red Boat at 嘉兴市 */}
    <g transform={`translate(${jiaxing.x.toFixed(1)},${jiaxing.y.toFixed(1)})`}>
      {/* Ambient golden aura + continuous Nanhu ripples + 12 architectural starburst rays + 5-point archival star */}
      <g data-motion="h21-starlight-aura" className="hero-beacon-gold" opacity="0" aria-hidden="true">
        <g className="amb-breathe">
          <circle r="60" fill={`url(#${gradId})`}/>
          <circle r="42" fill="none" stroke="var(--hero-gold, var(--motion-sector-2, #f0c979))" strokeWidth="1.25" strokeOpacity="0.58"/>
          <circle r="62" fill="none" stroke="var(--story-force)" strokeWidth="0.95" strokeDasharray="4 6" strokeOpacity="0.4"/>
        </g>
        <circle r="36" fill="none" stroke="var(--hero-gold, var(--motion-sector-2, #f0c979))" strokeWidth="1.15" className="amb-ripple-loop"/>
        <circle r="46" fill="none" stroke="var(--story-force)" strokeWidth="0.95" className="amb-ripple-loop amb-delay-1"/>
      </g>
      <g data-motion="h21-starlight-rays" className="hero-beacon-gold" opacity="0" aria-hidden="true">
        <g className="amb-sunburst-spin">
          {starRays.map((ray, idx) => (
            <line
              key={`ray-${idx}`}
              x1={ray.x1.toFixed(1)}
              y1={ray.y1.toFixed(1)}
              x2={ray.x2.toFixed(1)}
              y2={ray.y2.toFixed(1)}
              stroke={ray.major ? 'var(--hero-gold, var(--motion-sector-2, #f0c979))' : 'var(--story-force)'}
              strokeWidth={ray.major ? '1.7' : '1.15'}
              strokeLinecap="round"
              strokeOpacity={ray.major ? '0.88' : '0.58'}
            />
          ))}
        </g>
        {/* Small archival 5-point star rising cleanly upright above the Red Boat cabin */}
        <g className="amb-breathe">
          <path
            d="M0,-35.5 L2.1,-29.7 L8.2,-29.7 L3.3,-26.1 L5.1,-20.3 L0,-23.8 L-5.1,-20.3 L-3.3,-26.1 L-8.2,-29.7 L-2.1,-29.7 Z"
            fill="var(--hero-gold, var(--motion-sector-2, #f0c979))"
            stroke="var(--ui-bg)"
            strokeWidth="0.9"
            filter="url(#map-glow-force)"
          />
        </g>
      </g>

      <g data-motion="h21-jx-dock-ripple" opacity="0"><ArrivalRipple r={28} tone="force"/></g>
      <g data-motion="h21-jx-beacon-ripple-0" opacity="0"><ArrivalRipple r={38} tone="force"/></g>
      <g data-motion="h21-jx-beacon-ripple-1" opacity="0"><ArrivalRipple r={50} tone="force"/></g>

      {/* Subtle harbor anchor marker visible before boat docks */}
      <g data-motion="h21-jx-pin" className="process-tone-force" opacity="0.35">
        <NodeMedallion radius={13} tone="force">
          <HeroEmblem name="red-boat-emblem" size={14} tone="force"/>
        </NodeMedallion>
      </g>
    </g>

    {/* Bespoke 南湖红船 gliding upright along stealth transfer corridor into 嘉兴市 */}
    <g data-motion="h21-boat" opacity="0">
      <g className="amb-boat-bob">
        <RedBoatSilhouette/>
      </g>
    </g>

    {/* Jiaxing Nanhu label positioned cleanly clear of Red Boat & SealStamp */}
    <g data-motion="h21-jx-label" opacity="0">
      <text x={jxLabel.x.toFixed(1)} y={jxLabel.y.toFixed(1)} textAnchor={jxLabel.anchor} className="hero-place-label">
        嘉兴南湖
      </text>
      <text x={jxLabel.x.toFixed(1)} y={(jxLabel.y + 28).toFixed(1)} textAnchor={jxLabel.anchor} className="process-node-note hero-sub-label">
        红船继续会议
      </text>
    </g>

    {/* Beat 2: Luminous founding arc from Red Boat beacon -> SealStamp */}
    <path data-motion="h21-founding-track" className="curve-track" d={foundingArc.d} opacity="0"/>
    <path
      data-motion="h21-founding-arc"
      data-route="h21-founding-route"
      className="curve-edge curve-edge-force"
      d={foundingArc.d}
      fill="none"
      stroke="var(--story-force)"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <g data-motion="h21-founding-flow" opacity="0" aria-hidden="true">
      <path className="amb-flow-dash amb-flow-dash-force" d={foundingArc.d} fill="none"/>
    </g>
    <ArrivalTip id="h21-founding-tip" x={foundingArc.ex} y={foundingArc.ey} angle={foundingArc.endAngle} tone="force"/>
    <g data-motion="h21-founding-comet" opacity="0">
      <CometHead tone="force" r={4.8}/>
    </g>

    {/* Beat 2: Cinnabar founding SealStamp (y <= 546, subtext baseline <= 580) */}
    <g transform={`translate(${seal.x.toFixed(1)},${seal.y})`}>
      <g data-motion="h21-seal-ripple" opacity="0"><ArrivalRipple r={38} tone="force"/></g>
      <g data-motion="h21-seal" className="process-outcome" opacity="0">
        <SealStamp text="中国共产党成立" subtext="通过党纲 · 组织工人运动" tone="force" width={240}/>
      </g>
    </g>
  </g>;
}

function animateCongress(story, _projection, { add, show, pop, stamp, ripple, travel, trace }) {
  const end = story?.duration || 21;

  // Beat 0 (0–7s): Warm archival opening beacon at Shanghai
  pop('h21-sh-beacon', 0.15, end + 1, { scaleFrom: 0.72, dy: 0 });
  pop('h21-sh-labels', 0.25, end + 1, { scaleFrom: 0.92, dy: 6 });
  ripple('h21-sh-ripple-0', 0.55, 1.7);
  ripple('h21-sh-ripple-1', 2.45, 1.8, { scaleTo: 2.35, peakOpacity: 0.66 });

  // Beat 1 (7–14s): Disruption warning at Shanghai, then stealth corridor + Red Boat glide to Jiaxing
  pop('h21-alert-ring', 7.15, 14.2, { scaleFrom: 0.78, dy: 0 });
  ripple('h21-sh-alert-ripple', 7.2, 1.45);
  stamp('h21-alert-mark', 7.35, 14.3);

  show('h21-transfer-track', 7.8);
  pop('h21-transfer-note', 8.35);

  const boatStart = 8.1;
  const boatEnd = 12.6;
  show('h21-boat', boatStart);
  travel('h21-boat', 'h21-boat-route', boatStart, boatEnd);

  // Stealth curved dashes illuminate sequentially right in the wake of the gliding Red Boat
  for (let i = 0; i < STEALTH_DASH_COUNT; i++) {
    const dashAt = boatStart + ((boatEnd - boatStart) * (i + 0.45)) / STEALTH_DASH_COUNT;
    show(`h21-dash-${i}`, dashAt);
  }
  pop('h21-transfer-tip', boatEnd - 0.05, end + 1, { scaleFrom: 0.45, dy: 0 });

  // Jiaxing harbor pin fades smoothly as Red Boat docks in Nanhu
  add('h21-jx-pin', [
    { at: 0, opacity: 0.28 },
    { at: 12.1, opacity: 0.28, easing: DOC_EASE },
    { at: 12.7, opacity: 0 },
    { at: end, opacity: 0 },
  ]);
  ripple('h21-jx-dock-ripple', boatEnd, 1.5);
  pop('h21-jx-label', 12.55, end + 1, { scaleFrom: 0.88, dy: 6 });

  // Beat 2 (14–21s): Golden-vermilion starlight beacon blooms around Red Boat -> Founding SealStamp
  pop('h21-starlight-aura', 14.15, end + 1, { scaleFrom: 0.58, dy: 0, dur: 0.65 });
  pop('h21-starlight-rays', 14.35, end + 1, { scaleFrom: 0.72, dy: 0, dur: 0.58 });
  ripple('h21-jx-beacon-ripple-0', 14.3, 1.85, { scaleTo: 2.35 });
  ripple('h21-jx-beacon-ripple-1', 15.1, 1.95, { scaleTo: 2.55, peakOpacity: 0.68 });

  show('h21-founding-track', 14.8);
  trace('h21-founding-arc', 14.9, 16.3);
  show('h21-founding-flow', 16.3);
  pop('h21-founding-tip', 16.25, end + 1, { scaleFrom: 0.45, dy: 0 });
  show('h21-founding-comet', 14.9, 16.55);
  travel('h21-founding-comet', 'h21-founding-route', 14.9, 16.3);

  stamp('h21-seal', 16.35);
  ripple('h21-seal-ripple', 16.4, 1.65);
}

export const EARLY_HEROES = {
  'e-1': {
    Graphic: OpiumGraphic,
    animate: animateOpium,
  },
  'e-20': {
    Graphic: MayFourthGraphic,
    animate: animateMayFourth,
  },
  'e-21': {
    Graphic: CongressGraphic,
    animate: animateCongress,
  },
};
