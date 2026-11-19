import { PROCESS_PLACES } from './storyboards/places.js';
import { PRC_PLACES } from './storyboards/prc-places.js';
import { ShieldCheck, Coins, Plant } from '@phosphor-icons/react';

const ALL_PLACES = { ...PROCESS_PLACES, ...PRC_PLACES };
import {
  StoryGlyph,
  ArrivalRipple,
  SealStamp,
  RejectSeal,
  CometHead,
  Formation,
  Person,
  PaperStack,
  GearWheel,
  DeedStamp,
  ThumbprintSeal,
  RadarSector,
  hasPeople,
} from './StorySymbols.jsx';

const clamp = (v, low, high) => Math.max(low, Math.min(high, v));
const point = (id, label, x, y, phase = 0, tone = 'organization') => ({ id, label, x, y, phase, tone });
const edge = (from, to, phase = 1, label = '') => ({ from, to, phase, label });

/** Story-aware land apparatus classifier (works identically with or without prefix/story.id). */
function detectLandVariant(story, prefix = '') {
  const id = String(prefix || story.id || '');
  if (
    id === 'prc-l-4' ||
    /三权分置/.test(story.note || '') ||
    (story.protected && /集体所有权.*承包权/.test(story.protected))
  ) {
    return 'three-rights';
  }
  if (
    id === 'prc-l-3' ||
    (story.protected && /集体土地所有权/.test(story.protected)) ||
    /家庭经营权分离/.test(story.note || '')
  ) {
    return 'two-layer';
  }
  if (id === 'prc-l-1' || (story.protected && /富农/.test(story.protected))) {
    return 'preserve-rich';
  }
  return 'standard';
}

function detectSeatsKind(story, prefix = '') {
  const id = String(prefix || story.id || '');
  if (id === 'e-41' || (story.groups && story.groups.includes('共产党员'))) return 'three-thirds';
  if (id === 'prc-e-3' || /1954/.test(story.result || '')) return 'constitution';
  if (id === 'prc-m-2' || /八大/.test(story.result || '')) return 'eighth-congress';
  if (id === 'prc-m-8' || /1981/.test(story.result || '')) return 'resolution-1981';
  return 'general';
}

function isThreeResolutionsChain(story, prefix = '') {
  const id = String(prefix || story.id || '');
  return (
    id === 'prc-m-18' ||
    (story.mode === 'chain' &&
      Array.isArray(story.labels) &&
      String(story.labels[0] || '').includes('1945') &&
      String(story.labels[2] || '').includes('2021'))
  );
}

function landStampMeta(story, variant) {
  if (variant === 'preserve-rich') return { label: '确权', sublabel: '农民所有' };
  if (story.allocation === 'protected' && story.recipient === '苏维埃政府') return { label: '用权', sublabel: '农民使用权' };
  if (story.allocation === 'protected') return { label: '契转', sublabel: '清算购买' };
  if (story.recipient === '农民个人私有') return { label: '私产', sublabel: '个人所有' };
  if (story.allocation === 'equal') return { label: '红契', sublabel: '耕者有其田' };
  return { label: '公有', sublabel: '苏维埃所有' };
}

function estimateLabelWidth(text, unitPx = 19) {
  let units = 0;
  for (const ch of String(text || '')) {
    units += /[\u0000-\u00ff\s·]/.test(ch) ? 0.55 : 1.02;
  }
  return units * unitPx;
}

/** Trimmed quadratic Bezier path starting/ending cleanly outside node rims. */
function curveData(a, b, { bend = 0, trimStart = 34, trimEnd = 36 } = {}) {
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

export function curvePath(a, b, bend = 0, trimStart = 34, trimEnd = 36) {
  return curveData(a, b, { bend, trimStart, trimEnd }).d;
}

/** Arrival chevron popped cleanly at curve completion (never floats detached mid-trace). */
function ArrivalTip({ id, x, y, angle, tone = 'organization' }) {
  return <g transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${angle.toFixed(1)})`}>
    <g data-motion={id} opacity="0">
      <path
        d="M-7.5,-4.5 L0.5,0 L-7.5,4.5"
        fill="none"
        stroke={tone === 'force' ? 'var(--story-force)' : 'var(--story-organization)'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </g>;
}

function polarPoint(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function arcPath(cx, cy, r, startDeg, endDeg) {
  const [x0, y0] = polarPoint(cx, cy, r, startDeg);
  const [x1, y1] = polarPoint(cx, cy, r, endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = endDeg >= startDeg ? 1 : 0;
  return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${large} ${sweep} ${x1.toFixed(1)},${y1.toFixed(1)}`;
}

function sectorPath(cx, cy, rIn, rOut, startDeg, endDeg) {
  const [ox0, oy0] = polarPoint(cx, cy, rOut, startDeg);
  const [ox1, oy1] = polarPoint(cx, cy, rOut, endDeg);
  const [ix1, iy1] = polarPoint(cx, cy, rIn, endDeg);
  const [ix0, iy0] = polarPoint(cx, cy, rIn, startDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return [
    `M${ox0.toFixed(1)},${oy0.toFixed(1)}`,
    `A${rOut},${rOut} 0 ${large} 1 ${ox1.toFixed(1)},${oy1.toFixed(1)}`,
    `L${ix1.toFixed(1)},${iy1.toFixed(1)}`,
    `A${rIn},${rIn} 0 ${large} 0 ${ix0.toFixed(1)},${iy0.toFixed(1)}`,
    'Z',
  ].join(' ');
}

export function processLayout(story, projection) {
  let nodes = [], edges = [];
  const node = (label, x, y, phase = 0, tone) => {
    const n = point(`p-node-${nodes.length}`, label, x, y, phase, tone);
    nodes.push(n);
    return nodes.length - 1;
  };
  if (story.mode === 'geography' || story.mode === 'rendezvous') {
    story.locations.forEach((p) => {
      const [x, y] = projection(ALL_PLACES[p.place]);
      node(p.label, x, y, p.phase, 'force');
    });
    edges = (story.edges || []).map(([from, to, phase, label]) => edge(from, to, phase, label));
  } else if (story.mode === 'chain') {
    const positions = [[710, 240], [955, 355], [1195, 472]];
    story.labels.forEach((label, i) => node(label, ...positions[i], i, i === 2 && story.finalTone ? story.finalTone : 'organization'));
    edges = [edge(0, 1, 1), edge(1, 2, 2)];
  } else if (story.mode === 'fork') {
    node(story.root, 950, 196);
    const xs = story.branches.length === 2 ? [785, 1115] : [710, 950, 1190];
    story.branches.forEach((label, i) => {
      const n = node(label, xs[i], story.branches.length === 3 && i === 1 ? 376 : 348, 1);
      edges.push(edge(0, n, 1));
    });
    const result = node(story.result, 950, 532, 2, story.finalTone || 'organization');
    story.branches.forEach((_, i) => edges.push(edge(i + 1, result, 2)));
  } else if (story.mode === 'union') {
    const xs = story.groups.length === 2 ? [765, 1135] : [710, 950, 1190];
    story.groups.forEach((label, i) => node(label, xs[i], story.groups.length === 3 && i === 1 ? 228 : 272, Math.min(i, 1), 'organization'));
    const result = node(story.result, 950, 438, 2, story.finalTone || 'organization');
    story.groups.forEach((_, i) => edges.push(edge(i, result, 1)));
  } else if (story.mode === 'strategy') {
    const xs = [710, 950, 1190];
    story.groups.forEach((label, i) => node(label, xs[i], i === 1 ? 220 : 272, Math.min(i, 1), i === 2 ? 'force' : 'organization'));
    const result = node(story.result, 950, 514, 2, story.finalTone || 'organization');
    story.groups.forEach((_, i) => edges.push(edge(i, result, Math.min(i, 2))));
  } else if (story.mode === 'debate') {
    story.sides.forEach((label, i) => node(label, i ? 1152 : 748, 298, 0, i === story.selected ? 'organization' : story.selected !== undefined ? 'plan' : i ? 'force' : 'organization'));
    const result = node(story.result, 950, 528, 2, story.finalTone || 'organization');
    edges = [edge(0, result, 1), edge(1, result, 1)];
  } else if (story.mode === 'cycle') {
    [[950, 214], [1168, 424], [732, 424]].forEach((p, i) => node(story.labels[i], ...p, i));
    edges = [edge(0, 1, 1), edge(1, 2, 2)];
    if (!story.openCycle) edges.push(edge(2, 0, 2));
  }
  return { nodes, edges };
}

function Label({ text, x = 0, y = 0, className = '', anchor = 'middle', maxChars }) {
  const limit = maxChars || (className.includes('note') || className.includes('edge-label') ? 45 : 13);
  const lines = String(text).split('\n').flatMap((s) => (s.length > limit ? [s.slice(0, Math.ceil(s.length / 2)), s.slice(Math.ceil(s.length / 2))] : [s]));
  const startY = Number(y) < 0
    ? Number(y) - (lines.length - 1) * 23
    : Number(y) === 6 && lines.length > 1
      ? Number(y) - ((lines.length - 1) * 23) / 2
      : y;
  return <text x={x} y={startY} textAnchor={anchor} className={className}>
    {lines.map((s, i) => <tspan x={x} dy={i ? 23 : 0} key={i}>{s}</tspan>)}
  </text>;
}

function graphEdgeCurve(story, layout, e, i) {
  const a = layout.nodes[e.from];
  const b = layout.nodes[e.to];
  const isGeo = story.mode === 'geography';
  const resultIdx = (story.mode === 'fork' || story.mode === 'strategy') ? layout.nodes.length - 1 : -1;

  if (isGeo) {
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const bend = clamp(dist * 0.16, 22, 50) * (i % 2 ? -1 : 1);
    return curveData(a, b, { bend, trimStart: 13, trimEnd: 15 });
  }

  if (story.mode === 'chain') {
    // Both curves sweep gently beneath the diagonal so labels directly above medallions are 100% clear.
    return curveData(a, b, { bend: 32, trimStart: 35, trimEnd: 37 });
  }

  if (story.mode === 'cycle') {
    const cx = 950, cy = 352;
    const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = -dy / dist, ny = dx / dist;
    const dot = nx * (midX - cx) + ny * (midY - cy);
    const bend = dot >= 0 ? 42 : -42;
    return curveData(a, b, { bend, trimStart: 42, trimEnd: 44 });
  }

  if (story.mode === 'fork') {
    if (e.from === 0) {
      // Gentle inward-swept curves enter outer branch medallions from their inner flanks, leaving above-node labels completely clear.
      const bend = b.x < a.x - 10 ? -24 : b.x > a.x + 10 ? 24 : 0;
      return curveData(a, b, { bend, trimStart: 35, trimEnd: 35 });
    }
    if (e.to === resultIdx) {
      const dockOffset = a.x < b.x - 10 ? -46 : a.x > b.x + 10 ? 46 : 0;
      const target = { x: b.x + dockOffset, y: b.y - 30 };
      const bend = a.x < b.x - 10 ? 28 : a.x > b.x + 10 ? -28 : 0;
      return curveData(a, target, { bend, trimStart: 35, trimEnd: 6 });
    }
  }

  if (story.mode === 'strategy' && e.to === resultIdx) {
    const dockOffset = a.x < b.x - 10 ? -48 : a.x > b.x + 10 ? 48 : 0;
    const target = { x: b.x + dockOffset, y: b.y - 30 };
    const bend = a.x < b.x - 10 ? 32 : a.x > b.x + 10 ? -32 : 0;
    return curveData(a, target, { bend, trimStart: 35, trimEnd: 6 });
  }

  return curveData(a, b, { bend: 24, trimStart: 34, trimEnd: 36 });
}

function geoLabelPlacement(nodes, i) {
  const n = nodes[i];
  const estW = estimateLabelWidth(n.label, 18);
  const nearRight = nodes.some((o, j) => j !== i && o.x > n.x - 12 && o.x < n.x + 70 && Math.abs(o.y - n.y) < 34);
  const flipLeft = n.x + 18 + estW > 1255 || nearRight;
  return { x: flipLeft ? -18 : 18, y: 6, anchor: flipLeft ? 'end' : 'start', estW };
}

/** Pick a collision-free (x, y) above the desktop subtitle band (y <= 590) for geography outcome seals. */
function geoOutcomePos(nodes, outcome) {
  const y = 532;
  const sealW = Math.max(168, Math.min(468, Math.round(estimateLabelWidth(outcome[0], 24.5) + 60)));
  const subW = outcome[1] ? estimateLabelWidth(outcome[1], 14) : 0;
  const halfW = Math.max(sealW, subW) / 2;
  const minX = 635 + halfW;
  const maxX = 1265 - halfW;
  const candidates = [950, 775, 1125, 840, 1060].map((cx) => clamp(cx, minX, maxX));

  const boxes = nodes.map((n, i) => {
    const gp = geoLabelPlacement(nodes, i);
    const lx0 = gp.anchor === 'start' ? n.x + 14 : n.x - 18 - gp.estW;
    const lx1 = gp.anchor === 'start' ? n.x + 18 + gp.estW : n.x - 14;
    return {
      x0: Math.min(n.x - 14, lx0),
      x1: Math.max(n.x + 14, lx1),
      y0: n.y - 16,
      y1: n.y + 18,
    };
  });

  const sy0 = y - 28;
  const sy1 = outcome[1] ? y + 58 : y + 32;

  let bestX = candidates[0];
  let bestOverlap = Infinity;
  for (const cx of candidates) {
    const sx0 = cx - halfW - 10;
    const sx1 = cx + halfW + 10;
    let overlap = 0;
    for (const b of boxes) {
      const ox = Math.max(0, Math.min(sx1, b.x1) - Math.max(sx0, b.x0));
      const oy = Math.max(0, Math.min(sy1, b.y1) - Math.max(sy0, b.y0));
      overlap += ox * oy;
    }
    if (overlap === 0) return { x: cx, y };
    if (overlap < bestOverlap) {
      bestOverlap = overlap;
      bestX = cx;
    }
  }
  return { x: bestX, y };
}

function Graph({ story, layout, phase, prefix = '' }) {
  const geography = story.mode === 'geography';
  const isCycle = story.mode === 'cycle';
  const isStrategy = story.mode === 'strategy';
  const isResolutions = isThreeResolutionsChain(story, prefix);
  const resultIdx = (story.mode === 'fork' || isStrategy) ? layout.nodes.length - 1 : -1;
  const outcomePos = story.outcome ? (geography ? geoOutcomePos(layout.nodes, story.outcome) : { x: 950, y: 534 }) : null;

  return <>
    {/* Cycle apparatus: orbital flywheel track + tooth-to-tooth meshing central coupling gears */}
    {isCycle && <g className="proc-cycle-apparatus" aria-hidden="true">
      <circle
        cx="950"
        cy="352"
        r="144"
        className="proc-cycle-orbit"
        fill="none"
        stroke="var(--ui-line)"
        strokeWidth="1.15"
        strokeDasharray="4 6"
        strokeOpacity="0.52"
      />
      <g data-motion="p-cycle-hub" opacity="0">
        <g transform="translate(926,354)">
          <g className="amb-gear-cw">
            <GearWheel radius={39} teeth={12} tone="organization" className="proc-gear-hub-wheel"/>
          </g>
        </g>
        <g transform="translate(986,354)">
          <g transform="rotate(22.5)">
            <g className="amb-gear-ccw">
              <GearWheel radius={27} teeth={8} tone="force" className="proc-gear-hub-wheel"/>
            </g>
          </g>
        </g>
      </g>
    </g>}

    {/* Strategy apparatus (e-40): concentric tactical radar field + low-opacity sweep sector */}
    {isStrategy && <g transform="translate(950,344)" aria-hidden="true">
      <g data-motion="p-strategy-radar" opacity="0" className="proc-radar-field">
        <circle r="130" className="proc-radar-ring" fill="none" stroke="var(--ui-line)" strokeWidth="1.05" strokeDasharray="4 6" strokeOpacity="0.52"/>
        <circle r="92" className="proc-radar-ring" fill="none" stroke="var(--story-organization)" strokeWidth="1" strokeDasharray="3 5" strokeOpacity="0.42"/>
        <circle r="52" className="proc-radar-ring" fill="none" stroke="var(--story-organization)" strokeWidth="1" strokeOpacity="0.34"/>
        <path className="proc-radar-axis" d="M-136,0 H136 M0,-124 V124" fill="none" stroke="var(--ui-line)" strokeWidth="0.9" strokeDasharray="2 5" strokeOpacity="0.36"/>
        <g className="amb-breathe">
          <circle r="92" className="proc-radar-breathe" fill="none" stroke="var(--story-organization)" strokeWidth="1.15" strokeOpacity="0.32"/>
        </g>
        <g className="amb-ripple-loop">
          <circle r="68" className="proc-radar-pulse" fill="none" stroke="var(--story-organization)" strokeWidth="1.2" strokeOpacity="0.46"/>
        </g>
        <g className="amb-radar-sweep">
          <RadarSector radius={130} angle={44} tone="organization"/>
        </g>
        <circle r="3.2" fill="var(--story-organization)" fillOpacity="0.72"/>
      </g>
    </g>}

    {layout.edges.map((e, i) => {
      const a = layout.nodes[e.from];
      const b = layout.nodes[e.to];
      const curve = graphEdgeCurve(story, layout, e, i);
      const isForce = geography || a.tone === 'force' || b.tone === 'force';
      const labelSign = curve.ny <= 0 ? 1 : -1;
      const lx = clamp(curve.mx + curve.nx * 14 * labelSign, 665, 1235);
      const ly = clamp(curve.my + curve.ny * 14 * labelSign - 6, 155, 500);
      const flowClass = geography
        ? 'amb-flow-dash proc-flow-force'
        : isCycle
          ? 'amb-flow-dash proc-flow-orbit'
          : `amb-flow-dash-soft ${isForce ? 'proc-flow-force' : 'proc-flow-org'}`;
      return <g key={i} className="process-connection">
        <path className="process-edge-context curve-track" d={curve.d}/>
        <path
          data-motion={`p-edge-${i}`}
          data-route={`p-route-${i}`}
          className={`process-edge curve-edge ${isForce ? 'process-map-edge curve-edge-force' : ''}`}
          d={curve.d}
        />
        <g data-motion={`p-flow-${i}`} opacity="0" aria-hidden="true">
          <path
            className={flowClass}
            d={curve.d}
            fill="none"
            stroke={isForce ? 'var(--story-force)' : 'var(--story-organization)'}
            strokeWidth={geography ? 2.3 : isCycle ? 2.05 : 1.75}
            strokeLinecap="round"
            strokeDasharray={geography || isCycle ? '6 12' : '5 14'}
            strokeOpacity={geography || isCycle ? 0.7 : 0.52}
          />
        </g>
        <ArrivalTip id={`p-tip-${i}`} x={curve.ex} y={curve.ey} angle={curve.endAngle} tone={isForce ? 'force' : 'organization'}/>
        <g data-motion={`p-token-${i}`} className="process-messenger" opacity="0">
          <CometHead tone={isForce ? 'force' : 'organization'} r={geography ? 5 : 4.4}/>
        </g>
        {e.label && <g transform={`translate(${lx.toFixed(1)},${ly.toFixed(1)})`}>
          <g data-motion={`p-edge-label-${i}`} opacity="0">
            <Label text={e.label} x="0" y="0" className="process-edge-label"/>
          </g>
        </g>}
      </g>;
    })}

    {layout.nodes.map((n, i) => {
      if (i === resultIdx) {
        return <g key={n.id} transform={`translate(${n.x},${n.y})`} className={`process-result-node process-tone-${n.tone} ${phase >= n.phase ? 'is-reached' : ''}`}>
          <g data-motion={`p-ripple-${i}`} opacity="0">
            <ArrivalRipple r={36} tone={story.finalTone || n.tone}/>
          </g>
          <g data-motion={`p-seal-${i}`} opacity="0">
            <g className="amb-breathe" aria-hidden="true">
              <rect x="-118" y="-30" width="236" height="60" rx="6" className="proc-outcome-halo" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 5" strokeOpacity="0.34"/>
            </g>
            <SealStamp text={n.label} tone={story.finalTone || 'organization'}/>
          </g>
        </g>;
      }

      const geoPos = geography ? geoLabelPlacement(layout.nodes, i) : null;
      const isForkMid = story.mode === 'fork' && story.branches.length === 3 && i === 2;
      const isForkLeft = story.mode === 'fork' && i === 1;
      const isForkRight = story.mode === 'fork' && i === story.branches.length;
      const isCycleTop = isCycle && i === 0;
      const isCycleBottom = isCycle && i > 0;
      const isFocalNode = !geography && !isCycle && (n.phase === 2 || (story.mode === 'fork' && i === 0) || isStrategy);

      const labelX = geography
        ? geoPos.x
        : isForkMid ? 38
        : isForkLeft ? -10
        : isForkRight ? 10
        : isCycleBottom ? (i === 1 ? 18 : -18)
        : 0;
      const labelY = geography
        ? geoPos.y
        : isForkMid ? 6
        : isCycleTop ? -50
        : isCycleBottom ? 62
        : -44;
      const labelAnchor = geography
        ? geoPos.anchor
        : isForkMid ? 'start'
        : 'middle';
      const labelMaxChars = isForkMid ? 6 : (isForkLeft || isForkRight) ? 8 : undefined;

      const strategyNoteX = i === 1 ? 38 : i === 0 ? -18 : 18;
      const strategyNoteY = i === 1 ? 6 : 48;
      const strategyNoteAnchor = i === 1 ? 'start' : 'middle';

      return <g
        key={n.id}
        data-motion={n.id}
        className={`process-node process-tone-${n.tone} ${phase >= n.phase ? 'is-reached' : ''} ${phase === n.phase ? 'is-current' : ''}`}
        transform={`translate(${n.x},${n.y})`}
      >
        <g data-motion={`p-ripple-${i}`} opacity="0">
          <ArrivalRipple r={geography ? 15 : 32} tone={n.tone}/>
        </g>
        {geography ? <>
          <g data-motion={`p-beacon-${i}`} opacity="0" aria-hidden="true">
            <g className="amb-ripple-loop">
              <circle r="16" className="proc-geo-beacon" fill="none" stroke="var(--story-force)" strokeWidth="1.25" strokeOpacity="0.52"/>
            </g>
          </g>
          <circle r="10.2" className="process-node-ring"/>
          <g className="amb-breathe" aria-hidden="true">
            <circle r="6.4" className="proc-geo-core-halo" fill="var(--story-force)" fillOpacity="0.14" stroke="var(--story-force)" strokeWidth="0.9" strokeOpacity="0.5"/>
          </g>
          <circle r="3.2" className="process-node-core"/>
        </> : <>
          {isCycle && (
            <g className={i % 2 === 0 ? 'amb-gear-cw' : 'amb-gear-ccw'} aria-hidden="true">
              <GearWheel radius={39} teeth={12} tone={n.tone} className="proc-gear-node"/>
            </g>
          )}
          {isFocalNode && (
            <g className="amb-breathe" aria-hidden="true">
              <circle r="33.5" className="proc-focal-halo" fill="none" stroke="currentColor" strokeWidth="1.05" strokeDasharray="3 5" strokeOpacity="0.42"/>
            </g>
          )}
          {isResolutions && (
            <path
              className="proc-monument-plinth"
              d="M-28,36 H28 M-20,41 H20"
              fill="none"
              stroke="var(--hero-gold)"
              strokeWidth="1.65"
              strokeLinecap="round"
              strokeOpacity="0.78"
            />
          )}
          <g className="process-object" data-motion={n.phase > 0 || (story.mode === 'fork' && i > 0 && i <= story.branches.length) ? `p-object-${i}` : undefined}>
            {story.mode === 'fork' && i === 0
              ? <PaperStack size={43} framed tone={n.tone}/>
              : <StoryGlyph label={n.label} size={n.phase === 2 ? 44 : 41} tone={n.tone} active={phase === n.phase}/>}
          </g>
        </>}
        <g data-motion={story.mode === 'fork' && i > 0 && i <= story.branches.length ? `p-label-${i}` : undefined}>
          <Label text={n.label} x={labelX} y={labelY} anchor={labelAnchor} maxChars={labelMaxChars}/>
        </g>
        {isStrategy && i < 3 && (
          <Label text={['发展', '争取', '又联合又斗争'][i]} x={strategyNoteX} y={strategyNoteY} anchor={strategyNoteAnchor} className="process-node-note"/>
        )}
      </g>;
    })}

    {story.anchor && !story.outcome && <g className="process-anchor" transform="translate(950,582)">
      <circle r="4"/>
      <text x="12" y="5">{story.anchor.replace(/[市县]$/, '')} · 事件所在地</text>
    </g>}

    {story.outcome && outcomePos && <g transform={`translate(${outcomePos.x.toFixed(1)},${outcomePos.y})`}>
      <g data-motion="p-outcome" opacity="0" className="process-outcome">
        <g className="amb-breathe" aria-hidden="true">
          <rect x="-118" y="-30" width="236" height="60" rx="6" className="proc-outcome-halo" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 5" strokeOpacity="0.32"/>
        </g>
        <SealStamp text={story.outcome[0]} subtext={story.outcome[1]} tone={story.finalTone || 'force'}/>
      </g>
    </g>}
  </>;
}

/** Mass movements & coalition convergence: concentric acoustic ripples + converging spark arcs. */
function UnionScene({ story, layout, phase }) {
  const groups = layout.nodes.slice(0, story.groups.length);
  const hub = layout.nodes[story.groups.length];
  const origin = groups[0];
  const tone = story.finalTone || 'organization';
  const waveClass = tone === 'force' ? 'union-wave union-wave-force' : 'union-wave';

  return <g className="union-process">
    {story.anchor && <g className="process-anchor" transform="translate(950,148)">
      <circle r="3.5"/>
      <text x="10" y="4">{story.anchor.replace(/[市县]$/, '')} · 事件所在地</text>
    </g>}

    {/* Origin acoustic wave rings */}
    <g transform={`translate(${origin.x},${origin.y})`}>
      <g data-motion="p-origin-ambient" opacity="0">
        <g className="amb-breathe">
          <circle className="union-wave" r="44" strokeDasharray="3 5" opacity="0.45"/>
        </g>
      </g>
      {[0, 1].map((k) => <g key={k} data-motion={`p-origin-wave-${k}`} opacity="0">
        <circle className="union-wave" r={38 + k * 20}/>
      </g>)}
    </g>

    {/* Concentric acoustic wave ripples radiating from unified convergence hub */}
    <g transform={`translate(${hub.x},${hub.y})`}>
      <g data-motion="p-union-ambient-0" opacity="0">
        <g className="amb-ripple-loop">
          <circle className={waveClass} r="46" opacity="0.52"/>
        </g>
      </g>
      <g data-motion="p-union-ambient-1" opacity="0">
        <g className="amb-breathe">
          <circle className={waveClass} r="70" strokeDasharray="4 6" opacity="0.34"/>
        </g>
      </g>
      {[0, 1, 2].map((k) => <g key={k} data-motion={`p-union-wave-${k}`} opacity="0">
        <circle className={waveClass} r={38 + k * 20} strokeDasharray={k === 2 ? '4 5' : undefined}/>
      </g>)}
    </g>

    {/* Primary converging arcs & companion spark filaments */}
    {groups.map((gNode, i) => {
      const baseBend = gNode.x < hub.x - 10 ? 38 : gNode.x > hub.x + 10 ? -38 : 0;
      const mainCurve = curveData(gNode, hub, { bend: baseBend, trimStart: 35, trimEnd: 36 });
      const sparkA = curveData(gNode, hub, { bend: baseBend + 26, trimStart: 33, trimEnd: 34 });
      const sparkB = curveData(gNode, hub, { bend: baseBend - 26, trimStart: 33, trimEnd: 34 });
      return <g key={i} className="union-stream">
        <path className="process-edge-context curve-track" d={mainCurve.d}/>
        <path d={sparkA.d} data-route={`p-spark-a-${i}`} className="curve-track" strokeOpacity="0.28"/>
        <path d={sparkB.d} data-route={`p-spark-b-${i}`} className="curve-track" strokeOpacity="0.28"/>
        <path
          data-motion={`p-edge-${i}`}
          data-route={`p-route-${i}`}
          className="process-edge curve-edge"
          d={mainCurve.d}
        />
        <g data-motion={`p-flow-${i}`} opacity="0" aria-hidden="true">
          <path
            className="amb-flow-dash-soft proc-flow-org"
            d={mainCurve.d}
            fill="none"
            stroke="var(--story-organization)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray="5 14"
            strokeOpacity="0.54"
          />
        </g>
        <ArrivalTip id={`p-tip-${i}`} x={mainCurve.ex} y={mainCurve.ey} angle={mainCurve.endAngle} tone="organization"/>
        <g data-motion={`p-token-${i}`} className="process-messenger" opacity="0">
          <CometHead tone="organization" r={4.5}/>
        </g>
        <g data-motion={`p-spark-dot-a-${i}`} className="union-spark union-spark-force" opacity="0">
          <circle r="3.6" filter="url(#map-glow-force)"/>
        </g>
        <g data-motion={`p-spark-dot-b-${i}`} className="union-spark" opacity="0">
          <circle r="3.2" filter="url(#map-glow-org)"/>
        </g>
      </g>;
    })}

    {/* Participating group medallions */}
    {groups.map((n, i) => <g
      key={n.id}
      data-motion={n.id}
      className={`process-node process-tone-${n.tone} ${phase >= n.phase ? 'is-reached' : ''}`}
      transform={`translate(${n.x},${n.y})`}
    >
      <g data-motion={`p-ripple-${i}`} opacity="0">
        <ArrivalRipple r={32} tone={n.tone}/>
      </g>
      {story.separate && (i === 0 || i === groups.length - 1) && (
        <circle r="35" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" strokeOpacity="0.48"/>
      )}
      <g data-motion={n.phase > 0 ? `p-object-${i}` : undefined} className="process-object">
        <StoryGlyph label={n.label} size={41} tone={n.tone} active={phase === n.phase}/>
      </g>
      <Label text={n.label} y={-44}/>
    </g>)}

    {/* Unified convergence hub medallion */}
    <g transform={`translate(${hub.x},${hub.y})`} className={`process-hub-node process-tone-${tone} ${phase >= 2 ? 'is-reached' : ''}`}>
      <g data-motion="p-hub-ripple" opacity="0">
        <ArrivalRipple r={38} tone={tone}/>
      </g>
      <g data-motion="p-hub-medallion" opacity="0" className="process-object">
        <g className="amb-breathe" aria-hidden="true">
          <circle r="34" className="proc-focal-halo" fill="none" stroke="currentColor" strokeWidth="1.15" strokeDasharray="3 5" strokeOpacity="0.46"/>
        </g>
        <StoryGlyph label={story.result} size={42} tone={tone} active/>
      </g>
    </g>

    {/* Conclusion SealStamp */}
    <g transform="translate(950,518)">
      <g data-motion="p-union-seal" opacity="0" className="process-outcome">
        <SealStamp text={story.result} tone={tone}/>
      </g>
    </g>

    {story.groups.some(hasPeople) && (
      <Label text="波纹与星流示意力量汇集，不代表人数比例" x="950" y="578" className="process-node-note"/>
    )}
  </g>;
}

/** Mechanical Tilting Balance Scale apparatus: fulcrum pillar, tilting crossbar, suspended pan brackets, strictly horizontal labels. */
function DebateScene({ story, layout }) {
  const left = layout.nodes[0];
  const right = layout.nodes[1];
  const result = layout.nodes[2];
  const hasWinner = story.selected !== undefined;
  const isPairCorrespondence = Boolean(story.relation && story.relation.includes('对应'));
  const clashX = 950;
  const clashY = 298;

  const leftBeamTop = curveData({ x: left.x + 32, y: clashY }, { x: clashX - 24, y: clashY }, { bend: -26, trimStart: 2, trimEnd: 2 });
  const leftBeamBot = curveData({ x: left.x + 32, y: clashY }, { x: clashX - 24, y: clashY }, { bend: 26, trimStart: 2, trimEnd: 2 });
  const rightBeamTop = curveData({ x: right.x - 32, y: clashY }, { x: clashX + 24, y: clashY }, { bend: 26, trimStart: 2, trimEnd: 2 });
  const rightBeamBot = curveData({ x: right.x - 32, y: clashY }, { x: clashX + 24, y: clashY }, { bend: -26, trimStart: 2, trimEnd: 2 });

  const leftBeamClass = left.tone === 'plan' ? 'debate-beam debate-beam-plan' : 'debate-beam';
  const rightBeamClass = right.tone === 'force' ? 'debate-beam debate-beam-force' : right.tone === 'plan' ? 'debate-beam debate-beam-plan' : 'debate-beam';

  const resolutionCurves = hasWinner
    ? [curveData(
        { x: layout.nodes[story.selected].x, y: clashY + 25 },
        { x: result.x, y: result.y - 30 },
        { bend: story.selected ? -34 : 34, trimStart: 36, trimEnd: 6 },
      )]
    : [
        curveData({ x: left.x, y: clashY + 14 }, { x: result.x - 44, y: result.y - 30 }, { bend: 32, trimStart: 36, trimEnd: 6 }),
        curveData({ x: right.x, y: clashY + 14 }, { x: result.x + 44, y: result.y - 30 }, { bend: -32, trimStart: 36, trimEnd: 6 }),
      ];

  const showForceReject = !hasWinner && story.finalTone === 'force';
  const rejectLabel = hasWinner
    ? '纠偏'
    : /未实施/.test(story.result) ? '未实施' : '受挫';
  const rejectPos = hasWinner
    ? [layout.nodes[1 - story.selected].x, clashY - 25]
    : [clashX, clashY];

  return <g className="debate-process">
    {/* Editorial brass/ink balance-scale fulcrum pillar, calibration gauge & plinth pedestal */}
    <g className="debate-arena proc-scale-frame" aria-hidden="true">
      <path
        className="proc-scale-gauge"
        d={arcPath(clashX, clashY, 44, 232, 308)}
        fill="none"
        stroke="var(--hero-gold)"
        strokeWidth="1.2"
        strokeDasharray="3 4"
        strokeOpacity="0.65"
      />
      <path
        className="proc-scale-needle"
        d={`M${clashX},${clashY - 46} V${clashY - 12} M${clashX - 24},${clashY - 38} L${clashX - 21},${clashY - 33} M${clashX + 24},${clashY - 38} L${clashX + 21},${clashY - 33}`}
        fill="none"
        stroke="var(--hero-gold)"
        strokeWidth="1.15"
        strokeOpacity="0.72"
      />
      <path
        className="proc-scale-pillar"
        d={`M${clashX - 5},${clashY + 12} L${clashX - 8},370 H${clashX + 8} L${clashX + 5},${clashY + 12} Z`}
        fill="var(--ui-bg)"
        stroke="var(--story-organization)"
        strokeWidth="1.35"
        strokeOpacity="0.72"
      />
      <polygon
        className="proc-scale-pivot"
        points={`${clashX},${clashY - 2} ${clashX - 13},${clashY + 20} ${clashX + 13},${clashY + 20}`}
        fill="color-mix(in srgb, var(--hero-gold) 18%, var(--ui-bg))"
        stroke="var(--hero-gold)"
        strokeWidth="1.45"
      />
      <path
        className="proc-scale-plinth"
        d={`M${clashX - 44},382 H${clashX + 44} M${clashX - 32},376 H${clashX + 32} M${clashX - 20},370 H${clashX + 20}`}
        fill="none"
        stroke="var(--story-organization)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeOpacity="0.75"
      />
    </g>

    {/* Opposing curved pressure beams */}
    <g className="debate-beams">
      <path data-motion="p-beam-l1" data-route="p-beam-route-l" className={leftBeamClass} d={leftBeamTop.d}/>
      <path data-motion="p-beam-l2" className={leftBeamClass} d={leftBeamBot.d} strokeOpacity="0.65"/>
      <path data-motion="p-beam-r1" data-route="p-beam-route-r" className={rightBeamClass} d={rightBeamTop.d}/>
      <path data-motion="p-beam-r2" className={rightBeamClass} d={rightBeamBot.d} strokeOpacity="0.65"/>
      <g data-motion="p-beam-comet-l" opacity="0"><CometHead tone={left.tone === 'plan' ? 'organization' : left.tone} r={4.2}/></g>
      <g data-motion="p-beam-comet-r" opacity="0"><CometHead tone={right.tone === 'force' ? 'force' : 'organization'} r={4.2}/></g>
    </g>

    {/* Mechanical tilting balance crossbar + suspended pan brackets + fulcrum shockwave */}
    <g transform={`translate(${clashX},${clashY})`}>
      <g data-motion="p-scale-ring" opacity="0">
        <ArrivalRipple r={40} tone={isPairCorrespondence ? 'organization' : 'force'}/>
      </g>
      <g className="amb-breathe" aria-hidden="true">
        <circle r="13" className="proc-scale-pivot-halo" fill="none" stroke="var(--hero-gold)" strokeWidth="1.15" strokeOpacity="0.5"/>
      </g>
      <g data-motion="p-scale-beam" className="proc-scale-beam">
        <path
          className="proc-scale-bar"
          d="M-202,-2.4 L-22,-5.2 L0,-8 L22,-5.2 L202,-2.4 L202,2.4 L22,5.2 L0,7 L-22,5.2 L-202,2.4 Z"
          fill="color-mix(in srgb, var(--hero-gold) 18%, var(--ui-bg))"
          stroke="var(--hero-gold)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <line x1="-192" y1="0" x2="192" y2="0" stroke="var(--story-organization)" strokeWidth="0.9" strokeOpacity="0.48"/>
        <circle className="proc-scale-pin" cx="-202" cy="0" r="4.6" fill="var(--ui-bg)" stroke="var(--hero-gold)" strokeWidth="1.6"/>
        <circle className="proc-scale-pin" cx="202" cy="0" r="4.6" fill="var(--ui-bg)" stroke="var(--hero-gold)" strokeWidth="1.6"/>
        <path
          className="proc-scale-pan"
          d="M-202,5 L-224,33 M-202,5 L-180,33 M-230,33 Q-202,42 -174,33 M202,5 L180,33 M202,5 L224,33 M174,33 Q202,42 230,33"
          fill="none"
          stroke="var(--hero-gold)"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeOpacity="0.78"
        />
        <circle cx="0" cy="0" r="5.2" fill="var(--ui-bg)" stroke="var(--hero-gold)" strokeWidth="1.7"/>
      </g>

      {/* Pulsing center clash reticle */}
      <g data-motion="p-clash-ripple" opacity="0">
        <ArrivalRipple r={28} tone={isPairCorrespondence ? 'organization' : 'force'}/>
      </g>
      <g data-motion="p-debate-clash" className="debate-clash" opacity="0">
        <circle r="19"/>
        {isPairCorrespondence ? (
          <path d="M-7.5 0 H7.5 M0 -7.5 V7.5"/>
        ) : (
          <path d="M-7 -7 L7 7 M7 -7 L-7 7 M0 -13 V-9 M0 9 V13 M-13 0 H-9 M9 0 H13"/>
        )}
      </g>
    </g>

    <g data-motion="p-debate-bar" opacity="0">
      <Label
        text={isPairCorrespondence ? '要求与保证的对应呼应' : hasWinner ? '纠偏与工作方向转变' : '思想与方案的交锋'}
        x="950"
        y="410"
        className="process-node-note"
      />
    </g>

    {/* Resolution curve(s) from arena to conclusion seal */}
    {resolutionCurves.map((c, idx) => <g key={idx}>
      <path className="process-edge-context curve-track" d={c.d}/>
      <path
        data-motion={`p-res-edge-${idx}`}
        data-route={`p-res-route-${idx}`}
        className={`process-edge curve-edge ${story.finalTone === 'force' ? 'curve-edge-force' : ''}`}
        d={c.d}
      />
      <g data-motion={`p-res-flow-${idx}`} opacity="0" aria-hidden="true">
        <path
          className={`amb-flow-dash-soft ${story.finalTone === 'force' ? 'proc-flow-force' : 'proc-flow-org'}`}
          d={c.d}
          fill="none"
          stroke={story.finalTone === 'force' ? 'var(--story-force)' : 'var(--story-organization)'}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeDasharray="5 14"
          strokeOpacity="0.54"
        />
      </g>
      <ArrivalTip id={`p-res-tip-${idx}`} x={c.ex} y={c.ey} angle={c.endAngle} tone={story.finalTone === 'force' ? 'force' : 'organization'}/>
      <g data-motion={`p-res-comet-${idx}`} opacity="0">
        <CometHead tone={story.finalTone === 'force' ? 'force' : 'organization'} r={4.5}/>
      </g>
    </g>)}

    {/* Opposing side medallions (outer translates vertically with pan; labels stay strictly horizontal) */}
    {[left, right].map((n, i) => <g key={n.id} data-motion={`p-debate-side-${i}`} className={`process-node process-tone-${n.tone} is-reached`} style={{ opacity: 1 }}>
      <g data-motion={`p-debate-tilt-${i}`}>
        <g data-motion={`p-side-ripple-${i}`} opacity="0">
          <ArrivalRipple r={32} tone={n.tone}/>
        </g>
        {hasWinner && i === story.selected && (
          <g className="amb-breathe" aria-hidden="true">
            <circle r="34" className="proc-focal-halo" fill="none" stroke="currentColor" strokeWidth="1.15" strokeDasharray="3 5" strokeOpacity="0.48"/>
          </g>
        )}
        <g className="process-object">
          <StoryGlyph label={n.label} size={42} tone={n.tone} active={hasWinner && i === story.selected}/>
        </g>
      </g>
      <Label text={n.label} y={-46} maxChars={11}/>
    </g>)}

    {/* Cinnabar RejectSeal */}
    {(hasWinner || showForceReject) && <g transform={`translate(${rejectPos[0]},${rejectPos[1]})`}>
      <g data-motion="p-reject-ripple" opacity="0">
        <ArrivalRipple r={34} tone="force"/>
      </g>
      <g data-motion="p-debate-reject" opacity="0">
        <RejectSeal label={rejectLabel} angle={hasWinner ? (story.selected === 0 ? 13 : -13) : -12}/>
      </g>
    </g>}

    {/* Conclusion SealStamp */}
    <g transform={`translate(${result.x},${result.y})`}>
      <g data-motion="p-result-ripple" opacity="0">
        <ArrivalRipple r={36} tone={story.finalTone || 'organization'}/>
      </g>
      <g data-motion="p-debate-result" opacity="0" className="process-outcome">
        <SealStamp text={story.result} tone={story.finalTone || 'organization'}/>
      </g>
    </g>

    {story.anchor && <g className="process-anchor" transform="translate(950,582)">
      <circle r="4"/>
      <text x="12" y="5">{story.anchor.replace(/[市县]$/, '')} · 事件所在地</text>
    </g>}
  </g>;
}

/** Rich terraced land parcel card with furrow ridges aligned with motion.css .land-field / .land-ridge. */
function TerracedParcel({ variant = 'default', compact = false }) {
  const cls = variant === 'proposal'
    ? 'land-field is-proposal'
    : variant === 'transferred'
      ? 'land-field is-transferred'
      : 'land-field';
  const h = compact ? 23 : 26;
  return <g className={cls}>
    <rect width="38" height={h} rx="2"/>
    <path
      className="land-ridge"
      d={compact
        ? 'M4 7 Q19 5 34 7 M4 12.5 Q19 10.5 34 12.5 M4 18 Q19 16 34 18 M13 3 V20 M25 3 V20'
        : 'M4 7.5 Q19 5.5 34 7.5 M4 13.5 Q19 11.5 34 13.5 M4 19.5 Q19 17.5 34 19.5 M13 3.5 V22.5 M25 3.5 V22.5'}
    />
  </g>;
}

/** 11 Land Policy scenes: terraced subdivision grids, kinetic red deed stamp, 1950 rich-peasant highlight, 2-layer Xiaogang peel & 3-layer Three-Rights stack. */
function Land({ story, prefix = '' }) {
  const variant = detectLandVariant(story, prefix);
  const isTwoLayer = variant === 'two-layer';
  const isThreeRights = variant === 'three-rights';
  const isPreserveRich = variant === 'preserve-rich';
  const isStratified = isTwoLayer || isThreeRights;

  const value = story.allocation === 'value';
  const rent = story.allocation === 'rent';
  const equal = story.allocation === 'equal' || story.allocation === 'proposal';
  const protectedLand = story.protected;
  const transformsOwnership = !story.unimplemented && (story.allocation === 'equal' || story.allocation === 'all' || story.allocation === 'protected');

  const deedArc = curveData({ x: 842, y: 316 }, { x: 1038, y: 316 }, { bend: -50, trimStart: 0, trimEnd: 0 });
  const valueArc = curveData({ x: 804, y: 334 }, { x: 1084, y: 308 }, { bend: -48, trimStart: 0, trimEnd: 0 });
  const rentUpperArc = curveData({ x: 786, y: 304 }, { x: 1114, y: 304 }, { bend: -52, trimStart: 0, trimEnd: 0 });
  const rentLowerArc = curveData({ x: 1114, y: 404 }, { x: 786, y: 404 }, { bend: -52, trimStart: 0, trimEnd: 0 });
  const stampMeta = landStampMeta(story, variant);

  const deedCaption = story.unimplemented
    ? '方案推演'
    : isPreserveRich
      ? '颁证确权 · 农民所有'
      : story.allocation === 'protected' && story.recipient === '苏维埃政府'
        ? '使用权分配'
        : story.allocation === 'protected'
          ? '清算 · 购买转移'
          : story.recipient === '农民个人私有'
            ? '个人所有权'
            : story.allocation === 'equal'
              ? '农会接收分配'
              : '没收归公';

  return <g className={`land-process land-${story.allocation} land-variant-${variant}`}>
    {/* Disclaimer note cleanly positioned right below top header, completely clear of bottom subtitle */}
    <Label
      text={
        isThreeRights
          ? '三层分层示意权属结构演进，不表示面积比例'
          : isTwoLayer
            ? '上下双层示意两权分离，公有根基保持不变'
            : value
              ? '色块仅示意权利关系，不表示金额'
              : '田块仅作政策关系示意，不表示面积与实际分配比例'
      }
      x="950"
      y="148"
      className="process-node-note"
    />

    {/* Owner / Recipient archival medallions for standard/rent/value scenes */}
    {!isStratified && <>
      <g transform="translate(735,194)" className="land-owner-symbol">
        <StoryGlyph label={story.donor} size={38} tone="plan"/>
      </g>
      <g transform="translate(1155,194)" className="land-owner-symbol">
        <StoryGlyph label={story.recipient} size={38} tone={value ? 'force' : 'organization'}/>
      </g>
      <Label text={story.donor} x="735" y="242" className="land-holder"/>
      <Label text={value ? '新增地价归国家' : story.recipient} x="1155" y="242" className="land-holder"/>
    </>}

    {isTwoLayer ? (
      /* prc-l-3: 小岗村家庭联产承包责任制 — 2-layer stratified parcel peel + 18 red thumbprints */
      <g className="land-two-layer-diagram">
        {/* Vertical dashed lift guides connecting base ownership plate to elevated household tile */}
        <g transform="translate(950,368)">
          <g data-motion="p-layer-guides" opacity="0">
            {[-158, -52, 52, 158].map((gx) => (
              <line
                key={gx}
                className="proc-land-lift-guide"
                x1={gx}
                y1="0"
                x2={gx}
                y2="-62"
                stroke="var(--story-force)"
                strokeWidth="1.25"
                strokeDasharray="4 4"
                strokeOpacity="0.65"
              />
            ))}
            <path
              className="proc-land-lift-guide"
              d="M-163,-48 L-158,-58 L-153,-48 M153,-48 L158,-58 L163,-48"
              fill="none"
              stroke="var(--story-force)"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.82"
            />
          </g>
        </g>

        {/* Bottom Layer: Grounded Collective Ownership Base Plate */}
        <g transform="translate(950,404)">
          <g data-motion="p-layer-base" opacity="0">
            <rect
              className="proc-land-layer-lip"
              x="-188"
              y="-28"
              width="376"
              height="68"
              rx="6"
              fill="color-mix(in srgb, var(--story-organization) 22%, var(--ui-bg))"
              stroke="var(--story-organization)"
              strokeWidth="1.2"
              strokeOpacity="0.55"
            />
            <rect
              className="proc-land-layer proc-land-layer-base"
              x="-188"
              y="-34"
              width="376"
              height="68"
              rx="6"
              fill="color-mix(in srgb, var(--story-organization) 12%, var(--ui-bg))"
              stroke="var(--story-organization)"
              strokeWidth="1.7"
            />
            <circle cx="-154" cy="0" r="16" fill="var(--ui-bg)" stroke="var(--story-organization)" strokeWidth="1.4"/>
            <g className="land-protected"><ShieldCheck x="-166" y="-12" size={24}/></g>
            <text className="proc-land-layer-title" x="-126" y="-4" textAnchor="start">集体土地所有权</text>
            <text className="process-node-note proc-land-layer-role" x="-126" y="18" textAnchor="start">底层锁定 · 公有制根基不变</text>
            <g transform="translate(124,-13)" opacity="0.72"><TerracedParcel compact/></g>
          </g>
        </g>

        {/* Top Layer: Elevated Household Contract-Operation Tile (peels upward from base plate) */}
        <g data-motion="p-layer-top">
          <g className="amb-float-soft">
            <rect
              className="proc-land-layer-lip"
              x="-188"
              y="-36"
              width="376"
              height="84"
              rx="6"
              fill="color-mix(in srgb, var(--story-force) 22%, var(--ui-bg))"
              stroke="var(--story-force)"
              strokeWidth="1.2"
              strokeOpacity="0.55"
            />
            <rect
              className="proc-land-layer proc-land-layer-top"
              x="-188"
              y="-42"
              width="376"
              height="84"
              rx="6"
              fill="color-mix(in srgb, var(--story-force) 10%, var(--ui-bg))"
              stroke="var(--story-force)"
              strokeWidth="1.8"
            />
            <text className="proc-land-layer-title" x="-166" y="-16" textAnchor="start">家庭承包经营权</text>
            <text className="process-node-note proc-land-layer-role" x="166" y="-16" textAnchor="end">包产到户 · 分户自主经营</text>
            {[-162, -74, 14, 102].map((px, k) => (
              <g key={k} transform={`translate(${px},4)`}>
                <TerracedParcel variant="transferred" compact/>
              </g>
            ))}
          </g>
        </g>

        {/* Left Kinetic Red Deed Stamp */}
        <g transform="translate(694,260)">
          <g data-motion="p-land-stamp-ripple" opacity="0"><ArrivalRipple r={30} tone="force"/></g>
          <g data-motion="p-land-stamp" opacity="0">
            <DeedStamp label="包干" sublabel="1978 凤阳" tone="force" size={44}/>
          </g>
        </g>

        {/* Right 18 Red Thumbprints Seal */}
        <g transform="translate(1206,260)">
          <g data-motion="p-land-thumb" opacity="0">
            <ThumbprintSeal label="18枚红手印" sublabel="小岗村契约" size={28}/>
          </g>
        </g>

        {/* Stratified protection summary callout */}
        <g transform="translate(950,478)">
          <g data-motion="p-protected-ripple" opacity="0"><ArrivalRipple r={28} tone="organization"/></g>
          <g data-motion="p-protected" opacity="0">
            <Label text="两权分离 · 所有权归集体 · 经营权归农户" x="0" y="5" className="process-node-note"/>
          </g>
        </g>
      </g>
    ) : isThreeRights ? (
      /* prc-l-4: 农村“三权分置” — 3-layer isometric-stacked card separation */
      <g className="land-three-rights-diagram">
        {/* Vertical separation guides linking the 3 stacked plates */}
        <g transform="translate(950,404)">
          <g data-motion="p-tri-guides" opacity="0">
            {[-176, 176].map((gx) => (
              <line
                key={gx}
                className="proc-land-lift-guide"
                x1={gx}
                y1="0"
                x2={gx}
                y2="-156"
                stroke="var(--story-organization)"
                strokeWidth="1.25"
                strokeDasharray="4 4"
                strokeOpacity="0.6"
              />
            ))}
            <path
              className="proc-land-lift-guide"
              d="M-181,-144 L-176,-154 L-171,-144 M171,-144 L176,-154 L181,-144"
              fill="none"
              stroke="var(--story-force)"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.82"
            />
          </g>
        </g>

        {/* Layer 1 (Bottom): 集体所有权 */}
        <g transform="translate(950,430)">
          <g data-motion="p-tri-layer-0" opacity="0">
            <rect
              className="proc-land-layer-lip"
              x="-202"
              y="-21"
              width="404"
              height="54"
              rx="6"
              fill="color-mix(in srgb, var(--story-plan) 24%, var(--ui-bg))"
              stroke="var(--story-plan)"
              strokeWidth="1.2"
              strokeOpacity="0.58"
            />
            <rect
              className="proc-land-layer proc-land-layer-0"
              x="-202"
              y="-27"
              width="404"
              height="54"
              rx="6"
              fill="color-mix(in srgb, var(--story-plan) 12%, var(--ui-bg))"
              stroke="var(--story-plan)"
              strokeWidth="1.7"
            />
            <circle cx="-170" cy="0" r="15" fill="var(--ui-bg)" stroke="var(--story-plan)" strokeWidth="1.35"/>
            <g style={{ color: 'var(--story-plan)' }}><ShieldCheck x="-181" y="-11" size={22}/></g>
            <text className="proc-land-layer-title" x="-142" y="6" textAnchor="start">集体所有权</text>
            <text className="process-node-note proc-land-layer-role" x="184" y="5" textAnchor="end">01 · 落实归集体</text>
          </g>
        </g>

        {/* Layer 2 (Middle): 农户承包权 */}
        <g data-motion="p-tri-layer-1">
          <g className="amb-float-soft-mid">
            <rect
              className="proc-land-layer-lip"
              x="-202"
              y="-21"
              width="404"
              height="54"
              rx="6"
              fill="color-mix(in srgb, var(--story-organization) 22%, var(--ui-bg))"
              stroke="var(--story-organization)"
              strokeWidth="1.2"
              strokeOpacity="0.58"
            />
            <rect
              className="proc-land-layer proc-land-layer-1"
              x="-202"
              y="-27"
              width="404"
              height="54"
              rx="6"
              fill="color-mix(in srgb, var(--story-organization) 12%, var(--ui-bg))"
              stroke="var(--story-organization)"
              strokeWidth="1.75"
            />
            <circle cx="-170" cy="0" r="15" fill="var(--ui-bg)" stroke="var(--story-organization)" strokeWidth="1.35"/>
            <g transform="translate(-170,0)" style={{ color: 'var(--story-organization)' }}><Person size={20}/></g>
            <text className="proc-land-layer-title" x="-142" y="6" textAnchor="start">农户承包权</text>
            <text className="process-node-note proc-land-layer-role" x="184" y="5" textAnchor="end">02 · 稳定延包30年</text>
          </g>
        </g>

        {/* Layer 3 (Top): 土地经营权 */}
        <g data-motion="p-tri-layer-2">
          <g className="amb-float-soft">
            <rect
              className="proc-land-layer-lip"
              x="-202"
              y="-21"
              width="404"
              height="54"
              rx="6"
              fill="color-mix(in srgb, var(--story-force) 22%, var(--ui-bg))"
              stroke="var(--story-force)"
              strokeWidth="1.2"
              strokeOpacity="0.58"
            />
            <rect
              className="proc-land-layer proc-land-layer-2"
              x="-202"
              y="-27"
              width="404"
              height="54"
              rx="6"
              fill="color-mix(in srgb, var(--story-force) 11%, var(--ui-bg))"
              stroke="var(--story-force)"
              strokeWidth="1.8"
            />
            <circle cx="-170" cy="0" r="15" fill="var(--ui-bg)" stroke="var(--story-force)" strokeWidth="1.35"/>
            <g style={{ color: 'var(--story-force)' }}><Plant x="-181" y="-11" size={22}/></g>
            <text className="proc-land-layer-title" x="-142" y="6" textAnchor="start">土地经营权</text>
            <text className="process-node-note proc-land-layer-role" x="184" y="5" textAnchor="end">03 · 放活流转经营</text>
          </g>
        </g>

        {/* Left Kinetic Red Deed Stamp */}
        <g transform="translate(684,222)">
          <g data-motion="p-land-stamp-ripple" opacity="0"><ArrivalRipple r={30} tone="force"/></g>
          <g data-motion="p-land-stamp" opacity="0">
            <DeedStamp label="三权" sublabel="分置并行" tone="force" size={44}/>
          </g>
        </g>

        {/* Right protection bracket anchoring bottom 2 foundational rights */}
        <g transform="translate(1174,378)">
          <g data-motion="p-protected-ripple" opacity="0"><ArrivalRipple r={24} tone="organization"/></g>
          <g data-motion="p-protected" opacity="0" className="proc-land-bracket">
            <path d="M0,-54 H14 V54 H0" fill="none" stroke="var(--story-organization)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <text x="24" y="-4" textAnchor="start" className="process-node-note">底线守牢</text>
            <text x="24" y="16" textAnchor="start" className="process-node-note">两权稳固</text>
          </g>
        </g>
      </g>
    ) : rent ? (
      /* land-77: Bidirectional rent-reduction & rent-payment curved streams around anchored land */
      <g className="land-rent-diagram">
        <g transform="translate(950,354)">
          <g className="amb-breathe" aria-hidden="true">
            <rect x="-72" y="-38" width="144" height="76" rx="7" fill="none" stroke="var(--story-organization)" strokeWidth="1" strokeDasharray="3 5" strokeOpacity="0.34"/>
          </g>
          <rect x="-66" y="-32" width="132" height="64" rx="4" fill="var(--ui-bg)" fillOpacity="0.92" stroke="var(--story-plan)" strokeWidth="1.3" strokeDasharray="5 4"/>
          <g transform="translate(-54,-20)"><TerracedParcel compact/></g>
          <g transform="translate(-10,-20)"><TerracedParcel compact/></g>
          <g transform="translate(34,-20)"><TerracedParcel variant="proposal" compact/></g>
          <text x="0" y="22" textAnchor="middle" className="process-node-note">土地权属未普遍改变</text>
        </g>

        <path className="process-edge-context curve-track" d={rentUpperArc.d}/>
        <path data-motion="p-rent-policy" data-route="p-rent-upper" className="process-edge curve-edge" d={rentUpperArc.d}/>
        <g data-motion="p-rent-flow-upper" opacity="0" aria-hidden="true">
          <path className="amb-flow-dash-soft proc-flow-org" d={rentUpperArc.d} fill="none" stroke="var(--story-organization)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="5 14" strokeOpacity="0.54"/>
        </g>
        <ArrivalTip id="p-rent-tip-upper" x={rentUpperArc.ex} y={rentUpperArc.ey} angle={rentUpperArc.endAngle} tone="organization"/>
        <g data-motion="p-rent-comet" opacity="0"><CometHead tone="organization" r={4.6}/></g>
        <g data-motion="p-rent-policy-label" opacity="0">
          <Label text="地主减租减息" x="950" y="264"/>
        </g>

        <path className="process-edge-context curve-track" d={rentLowerArc.d}/>
        <path data-motion="p-rent-payment" data-route="p-rent-lower" className="process-edge curve-edge curve-edge-force" d={rentLowerArc.d}/>
        <g data-motion="p-rent-flow-lower" opacity="0" aria-hidden="true">
          <path className="amb-flow-dash-soft proc-flow-force" d={rentLowerArc.d} fill="none" stroke="var(--story-force)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="5 14" strokeOpacity="0.56"/>
        </g>
        <ArrivalTip id="p-rent-tip-lower" x={rentLowerArc.ex} y={rentLowerArc.ey} angle={rentLowerArc.endAngle} tone="force"/>
        <g data-motion="p-rent-payment-label" opacity="0">
          <Label text="农民交租交息" x="950" y="472"/>
        </g>
        {[0, 1, 2].map((i) => <g key={i} data-motion={`p-rent-${i}`} className="land-payment" opacity="0">
          <circle r="13" fill="var(--ui-bg)" stroke="var(--ui-accent)" strokeWidth="1.4"/>
          <Coins x="-9" y="-9" size={18}/>
        </g>)}
      </g>
    ) : value ? (
      /* land-71: Split proportional value columns (original retained left vs increment rising right) */
      <g className="land-value-diagram">
        <line x1="650" y1="444" x2="1245" y2="444" stroke="var(--ui-line)" strokeWidth="1.5"/>

        {/* Left column: 原有地价仍归原主 (anchored, immobile) */}
        <g data-motion="p-value-original" className="land-value-bar">
          <rect x="674" y="334" width="122" height="110" rx="2"/>
          {[0, 1, 2].map((k) => <line key={k} className="land-ridge" x1="684" y1={358 + k * 28} x2="786" y2={358 + k * 28}/>)}
          <path d="M664 444 H806 M674 438 V450 M796 438 V450" fill="none" stroke="var(--story-organization)" strokeWidth="1.8"/>
          <text x="735" y="394" textAnchor="middle">原有地价</text>
          <Label text="原有地价仍归原主" x="735" y="476" className="process-node-note"/>
        </g>

        {/* Right column: base datum + rising increment segment */}
        <rect x="1094" y="356" width="122" height="88" rx="2" fill="none" stroke="var(--story-plan)" strokeWidth="1.2" strokeDasharray="5 4" strokeOpacity="0.65"/>
        <text x="1155" y="406" textAnchor="middle" className="process-node-note">原价基准</text>

        <g transform="translate(1155,356)">
          <g data-motion="p-value-increment" className="land-value-bar is-increment" opacity="0">
            <rect x="-61" y="-86" width="122" height="86" rx="2"/>
            {[0, 1, 2].map((k) => <line key={k} className="land-ridge" x1="-50" y1={-20 - k * 22} x2="50" y2={-20 - k * 22}/>)}
            <text x="0" y="-38" textAnchor="middle">涨价归公</text>
          </g>
        </g>
        <g transform="translate(1155,270)">
          <g data-motion="p-value-ripple" opacity="0"><ArrivalRipple r={24} tone="force"/></g>
        </g>

        <path className="process-edge-context curve-track" d={valueArc.d}/>
        <path data-motion="p-land-transfer" data-route="p-value-route" className="process-edge curve-edge curve-edge-force" d={valueArc.d}/>
        <g data-motion="p-value-flow" opacity="0" aria-hidden="true">
          <path className="amb-flow-dash-soft proc-flow-force" d={valueArc.d} fill="none" stroke="var(--story-force)" strokeWidth="1.85" strokeLinecap="round" strokeDasharray="5 14" strokeOpacity="0.58"/>
        </g>
        <ArrivalTip id="p-value-tip" x={valueArc.ex} y={valueArc.ey} angle={valueArc.endAngle} tone="force"/>
        <g data-motion="p-value-comet" opacity="0"><CometHead tone="force" r={4.8}/></g>
        <g data-motion="p-value-arc-label" opacity="0">
          <Label text="革命后增值部分归国家" x="945" y="274" className="process-edge-label"/>
        </g>

        {/* Kinetic red value-assessment deed stamp */}
        <g transform="translate(1254,300)">
          <g data-motion="p-land-stamp-ripple" opacity="0"><ArrivalRipple r={26} tone="force"/></g>
          <g data-motion="p-land-stamp" opacity="0">
            <DeedStamp label="核价" sublabel="涨价归公" tone="force" size={38}/>
          </g>
        </g>
      </g>
    ) : (
      /* Terraced property parcel transfer (proposal / all / protected / equal / prc-l-1) */
      <g className="land-transfer-diagram">
        {/* Donor source survey grid outlines */}
        {Array.from({ length: 12 }, (_, i) => (
          <rect
            key={`ghost-${i}`}
            x={652 + (i % 4) * 44}
            y={262 + Math.floor(i / 4) * 35}
            width="38"
            height={equal ? 23 : 26}
            rx="2"
            fill="none"
            stroke="var(--ui-line)"
            strokeWidth="0.9"
            strokeDasharray="3 3"
            strokeOpacity="0.45"
          />
        ))}

        {/* Dynamic animated field-boundary subdivision lines across recipient grid */}
        <path
          data-motion="p-land-grid-h"
          className="proc-land-grid-line"
          d={equal
            ? 'M1044 256 H1236 M1044 287 H1236 M1044 317 H1236 M1044 347 H1236'
            : 'M1048 257 H1228 M1048 293 H1228 M1048 328 H1228 M1048 363 H1228'}
          fill="none"
          stroke="var(--story-organization)"
          strokeWidth="0.95"
          strokeOpacity="0.42"
        />
        <path
          data-motion="p-land-grid-v"
          className="proc-land-grid-line"
          d={equal
            ? 'M1046 254 V376 M1118 254 V376 M1190 254 V376 M1234 254 V376'
            : 'M1050 256 V365 M1094 256 V365 M1138 256 V365 M1182 256 V365 M1226 256 V365'}
          fill="none"
          stroke="var(--story-organization)"
          strokeWidth="0.95"
          strokeOpacity="0.42"
        />

        {/* Blueprint frame for unimplemented Taiping allocation (land-70) — note placed cleanly BELOW households */}
        {story.unimplemented && <g className="land-blueprint-frame">
          <rect x="1032" y="252" width="232" height="136" rx="4" fill="var(--story-plan)" fillOpacity="0.05" stroke="var(--story-plan)" strokeWidth="1.4" strokeDasharray="6 5"/>
          <path d="M1032 268 V252 H1048 M1248 252 H1264 V268 M1032 372 V388 H1048 M1248 388 H1264 V372" fill="none" stroke="var(--story-plan)" strokeWidth="2"/>
          <text x="1148" y="458" textAnchor="middle" className="process-node-note">蓝图推演 · 未付诸实施</text>
        </g>}

        {/* Animated terraced field parcels with ownership color transformation overlay */}
        {Array.from({ length: 12 }, (_, i) => <g
          data-motion={`p-parcel-${i}`}
          key={i}
          className={`land-parcel ${story.unimplemented ? 'is-proposal' : ''}`}
        >
          <TerracedParcel variant={story.unimplemented ? 'proposal' : 'default'} compact={equal}/>
          {transformsOwnership && (
            <g data-motion={`p-parcel-own-${i}`} opacity="0">
              <TerracedParcel variant="transferred" compact={equal}/>
            </g>
          )}
        </g>)}

        {/* Arched Deed-Seal transfer curve & traveling archival deed emblem */}
        <path className="process-edge-context curve-track" d={deedArc.d}/>
        <path data-motion="p-land-transfer" data-route="p-deed-route" className="process-edge curve-edge" d={deedArc.d}/>
        <g data-motion="p-land-flow" opacity="0" aria-hidden="true">
          <path className="amb-flow-dash-soft proc-flow-org" d={deedArc.d} fill="none" stroke="var(--story-organization)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="5 14" strokeOpacity="0.54"/>
        </g>
        <ArrivalTip id="p-deed-tip" x={deedArc.ex} y={deedArc.ey} angle={deedArc.endAngle} tone="organization"/>
        <g data-motion="p-deed-label" opacity="0">
          <Label text={deedCaption} x="940" y="270" className="process-edge-label"/>
        </g>
        <g data-motion="p-land-deed" className="land-deed land-deed-seal" opacity="0">
          <rect x="-15" y="-19" width="30" height="38" rx="2"/>
          <path d="M-9 -10 H9 M-9 -3 H9 M-9 4 H2" strokeOpacity="0.72"/>
          {!story.unimplemented && <circle cx="8" cy="10" r="6"/>}
        </g>
        <g transform="translate(1148,320)">
          <g data-motion="p-land-arrive-ripple" opacity="0"><ArrivalRipple r={32} tone="organization"/></g>
        </g>

        {/* Kinetic Red Deed Stamp landing cleanly beside recipient parcels */}
        {!story.unimplemented && <g transform="translate(1264,296)">
          <g data-motion="p-land-stamp-ripple" opacity="0"><ArrivalRipple r={28} tone="force"/></g>
          <g data-motion="p-land-stamp" opacity="0">
            <DeedStamp label={stampMeta.label} sublabel={stampMeta.sublabel} tone="force" size={40}/>
          </g>
        </g>}

        {/* Recipient households for equal / proposal distribution (clear of blueprint frame & note) */}
        {equal && [0, 1, 2].map((i) => <g key={i} transform={`translate(${1068 + i * 72},412)`}>
          <g data-motion={`p-household-${i}`} className="land-household" opacity="0">
            <circle r="15" fill="var(--ui-bg)" stroke="var(--story-organization)" strokeWidth="1.35"/>
            <Person size={19}/>
          </g>
        </g>)}

        {/* Unimplemented blueprint cinnabar cancel stamp */}
        {story.unimplemented && <g transform="translate(1148,320)">
          <g data-motion="p-land-reject" opacity="0">
            <RejectSeal label="未实行" angle={-12}/>
          </g>
        </g>}
      </g>
    )}

    {/* Protected zone: special warm rich-peasant highlight showcase for prc-l-1 vs standard Shield Badge */}
    {protectedLand && !isStratified && (isPreserveRich ? (
      <g transform="translate(950,448)">
        <g data-motion="p-protected-ripple" opacity="0">
          <ArrivalRipple r={38} tone="organization"/>
        </g>
        <g data-motion="p-protected" className="land-protected proc-land-preserve-frame" opacity="0">
          <g className="amb-breathe" aria-hidden="true">
            <rect
              x="-220"
              y="-40"
              width="440"
              height="80"
              rx="8"
              fill="none"
              stroke="var(--hero-gold)"
              strokeWidth="1.15"
              strokeDasharray="4 5"
              strokeOpacity="0.56"
            />
          </g>
          <rect
            className="proc-land-preserve-box"
            x="-212"
            y="-34"
            width="424"
            height="68"
            rx="6"
            fill="color-mix(in srgb, var(--hero-gold) 13%, var(--ui-bg))"
            stroke="var(--hero-gold)"
            strokeWidth="1.8"
          />
          {/* Intact preserved rich-peasant parcels */}
          <g transform="translate(-194,-9) scale(0.74)"><TerracedParcel compact/></g>
          <g transform="translate(-160,-9) scale(0.74)"><TerracedParcel compact/></g>
          <circle cx="-102" cy="0" r="15" fill="var(--ui-bg)" stroke="var(--hero-gold)" strokeWidth="1.5"/>
          <g style={{ color: 'var(--hero-gold)' }}><ShieldCheck x="-114" y="-12" size={24}/></g>
          <text className="proc-land-preserve-title" x="-72" y="-5" textAnchor="start">保存富农经济</text>
          <text className="process-node-note proc-land-preserve-sub" x="-72" y="17" textAnchor="start">区别于1947年 · 减少震动利于生产</text>
        </g>
      </g>
    ) : (
      <g transform="translate(950,454)">
        <g data-motion="p-protected-ripple" opacity="0">
          <ArrivalRipple r={32} tone="organization"/>
        </g>
        <g data-motion="p-protected" className="land-protected land-shield-badge" opacity="0">
          <rect x="-104" y="-24" width="208" height="48" rx="4"/>
          <circle cx="-74" cy="0" r="15" fill="var(--ui-bg)" stroke="var(--story-organization)" strokeWidth="1.35"/>
          <ShieldCheck x="-86" y="-12" size={24}/>
          <text x="14" y="6" textAnchor="middle">{protectedLand}</text>
          <Label text="保护 · 不随其他土地转移" x="0" y="42" className="process-node-note"/>
        </g>
      </g>
    ))}

    {/* Conclusion SealStamp cleanly above desktop subtitle band (y <= 590) */}
    <g transform="translate(950,546)">
      <g data-motion="p-land-note" opacity="0" className={`process-outcome ${story.unimplemented || story.noteTone === 'force' ? 'process-tone-force' : ''}`}>
        <SealStamp text={story.note} tone={story.unimplemented || story.noteTone === 'force' ? 'force' : 'organization'}/>
      </g>
    </g>
  </g>;
}

/** Ceremonial Amphitheater Wave Fill (e-41 三三制, prc-e-3 1954宪法, prc-m-2 中共八大, prc-m-8 1981历史决议). */
function Seats({ story, prefix = '' }) {
  const kind = detectSeatsKind(story, prefix);
  const isThreeThirds = kind === 'three-thirds';
  const cx = 950;
  const cy = 432;
  const rIn = 108;
  const rOut = 174;
  const rSeat = 141;
  const rBracket = 194;
  const sideX = isThreeThirds ? 234 : 258;
  const calloutPositions = [
    { x: cx - sideX, y: 298, ratioY: 330 },
    { x: cx, y: 174, ratioY: 208 },
    { x: cx + sideX, y: 298, ratioY: 330 },
  ];
  const shareLabels = isThreeThirds
    ? ['1 / 3', '1 / 3', '1 / 3']
    : kind === 'constitution'
      ? ['支柱一', '支柱二', '支柱三']
      : kind === 'eighth-congress'
        ? ['方针一', '方针二', '方针三']
        : kind === 'resolution-1981'
          ? ['精髓一', '精髓二', '精髓三']
          : ['01', '02', '03'];
  const rostrumTitle = isThreeThirds
    ? '三三制 · 民主议事席位'
    : kind === 'constitution'
      ? '第一届全国人大 · 宪制基石'
      : kind === 'eighth-congress'
        ? '中共八大 · 集体议事布局'
        : kind === 'resolution-1981'
          ? '历史决议 · 活的灵魂'
          : '民主议事 · 礼堂席位';

  return <g className="seats-process">
    {/* Subtle radial ceremonial spotlights fanning from rostrum into amphitheater sectors */}
    <g className="proc-rostrum-rays" aria-hidden="true">
      {[210, 270, 330].map((deg) => {
        const [x0, y0] = polarPoint(cx, cy, 40, deg);
        const [x1, y1] = polarPoint(cx, cy, rIn - 4, deg);
        return <line key={deg} x1={x0.toFixed(1)} y1={y0.toFixed(1)} x2={x1.toFixed(1)} y2={y1.toFixed(1)} stroke="var(--hero-gold)" strokeWidth="1" strokeDasharray="3 5" strokeOpacity="0.34"/>;
      })}
    </g>

    {/* Semicircular parliamentary base & podium guide arcs */}
    <path className="hemicycle-arc" d={arcPath(cx, cy, rOut + 6, 180, 360)}/>
    <path className="hemicycle-arc" d={arcPath(cx, cy, rIn - 10, 180, 360)} opacity="0.45"/>
    <path className="hemicycle-arc" d={arcPath(cx, cy, 84, 180, 360)}/>
    <line x1={cx - rOut - 10} y1={cy} x2={cx + rOut + 10} y2={cy} stroke="var(--ui-line)" strokeWidth="1.2" strokeDasharray="4 5" strokeOpacity="0.6"/>

    {/* Warm ceremonial center rostrum crest halo */}
    <g transform={`translate(${cx},${cy - 48})`}>
      <g data-motion="p-rostrum-crest" opacity="0" className="proc-rostrum-crest">
        <g className="amb-breathe proc-rostrum-halo">
          <circle r="22" fill="color-mix(in srgb, var(--hero-gold) 12%, transparent)" stroke="var(--hero-gold)" strokeWidth="1.1" strokeDasharray="3 4" strokeOpacity="0.62"/>
          <circle r="13.5" fill="var(--ui-bg)" stroke="var(--hero-gold)" strokeWidth="1.45"/>
          <path d="M0,-8 L2.2,-2.2 L8,0 L2.2,2.2 L0,8 L-2.2,2.2 L-8,0 L-2.2,-2.2 Z" fill="var(--hero-gold)" fillOpacity="0.88"/>
        </g>
      </g>
    </g>
    <text x={cx} y={cy - 14} textAnchor="middle" className="process-node-note">{rostrumTitle}</text>

    {/* 3 equal 60° arc sectors using motion.css .hemicycle-sector-0/1/2 tokens */}
    {story.groups.map((label, g) => {
      const startDeg = 180 + g * 60 + 1.8;
      const endDeg = 180 + (g + 1) * 60 - 1.8;
      const midDeg = 180 + g * 60 + 30;
      const [bx, by] = polarPoint(cx, cy, rBracket, midDeg);
      const [tx, ty] = polarPoint(cx, cy, rBracket + 12, midDeg);

      return <g key={label} className={`seat-group seat-group-${g} hemicycle-sector-${g}`}>
        <g data-motion={`p-sector-${g}`} opacity="0">
          <path className={`hemicycle-sector-${g}`} d={sectorPath(cx, cy, rIn, rOut, startDeg, endDeg)}/>
        </g>

        {/* Outer radial 60° bracket + ratio/pillar callout */}
        <path
          data-motion={`p-bracket-${g}`}
          className="hemicycle-bracket"
          d={arcPath(cx, cy, rBracket, startDeg + 2, endDeg - 2)}
        />
        <line x1={bx} y1={by} x2={tx} y2={ty} stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.5"/>
        <g transform={`translate(${calloutPositions[g].x},${calloutPositions[g].y})`}>
          <g data-motion={`p-seat-group-label-${g}`} opacity="0">
            <Label text={label} x="0" y="0"/>
          </g>
        </g>
        <g transform={`translate(${calloutPositions[g].x},${calloutPositions[g].ratioY})`}>
          <g data-motion={`p-seat-share-${g}`} opacity="0">
            <Label text={shareLabels[g]} x="0" y="0" className="seat-ratio"/>
          </g>
        </g>

        {/* 3 parliamentary seats illuminating along this sector's arc with staggered wave shimmer */}
        {[0, 1, 2].map((j) => {
          const deg = 180 + g * 60 + 12 + j * 18;
          const [sx, sy] = polarPoint(cx, cy, rSeat, deg);
          const idx = g * 3 + j;
          return <g key={j} transform={`translate(${sx.toFixed(1)},${sy.toFixed(1)})`}>
            <g data-motion={`p-seat-${idx}`} className="hemicycle-seat" opacity="0">
              <g className={`amb-seat-wave proc-seat-wave-${g}`} style={{ '--seat-delay': `${(idx * 0.26).toFixed(2)}s` }}>
                <circle className="hemicycle-seat" r="15.5"/>
                <Person size={18} color="var(--ui-bg)"/>
              </g>
            </g>
          </g>;
        })}
      </g>;
    })}

    {/* Crisp radial dividers between thirds at 240° and 300° */}
    {[240, 300].map((deg) => {
      const [x0, y0] = polarPoint(cx, cy, rIn - 8, deg);
      const [x1, y1] = polarPoint(cx, cy, rOut + 10, deg);
      return <line key={deg} x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--ui-bg)" strokeWidth="2.5"/>;
    })}

    {/* Concluding SealStamp + footnote strictly above subtitle band */}
    <g transform="translate(950,522)">
      <g data-motion="p-seat-ripple" opacity="0"><ArrivalRipple r={36} tone="organization"/></g>
      <g data-motion="p-seat-result" opacity="0" className="process-outcome">
        <SealStamp text={story.result} tone="organization"/>
      </g>
    </g>
    <Label
      text={isThreeThirds ? '九个席位为三等份的比例示意' : '半圆形礼堂席位示意 · 三大核心支柱'}
      x="950"
      y="582"
      className="process-node-note"
    />
  </g>;
}

/** Dynamic Strategic Frontline Lanes (writing-88 论持久战 vs e-45 解放战争三阶段). */
function Fronts({ story }) {
  const ys = [204, 318, 434];
  const isProtracted = story.labels[1] === '战略相持';

  return <g className="fronts-process">
    {/* Vertical reference line marking original defense frontier */}
    <line x1="1008" y1="176" x2="1008" y2="466" stroke="var(--ui-line)" strokeWidth="1" strokeDasharray="3 6" strokeOpacity="0.45"/>

    {story.labels.map((label, i) => {
      const y = ys[i];
      const isDefense = i === 0;
      const isStalemate = i === 1 && isProtracted;
      const isOffenseMid = i === 1 && !isProtracted;
      const isDecisive = i === 2;

      const friendlyPath = isDefense
        ? `M806 ${y} Q890 ${y - 14} 978 ${y}`
        : isStalemate
          ? `M806 ${y} Q882 ${y + 10} 954 ${y}`
          : isOffenseMid
            ? `M806 ${y} Q965 ${y - 20} 1142 ${y}`
            : `M806 ${y} Q1010 ${y - 16} 1218 ${y}`;

      const enemyPushPath = `M1226 ${y} Q1125 ${y + 12} 1028 ${y}`;
      const guerrillaPath = `M958 ${y - 8} Q1086 ${y - 44} 1206 ${y - 12}`;
      const secondFrontPath = `M860 ${y + 34} Q1040 ${y + 34} 1188 ${y + 8}`;

      return <g key={label} data-motion={`p-front-${i}`} className="strategic-stage" opacity="0">
        {/* Stage numeral & label */}
        <text x="642" y={y - 12} className="process-node-note" textAnchor="start">0{i + 1}</text>
        <Label text={label} x="642" y={y + 14} anchor="start"/>

        {/* Tactical frontline lane container */}
        <rect className="front-lane" x="790" y={y - 22} width="456" height="44" rx="4"/>
        <path d={`M802 ${y} H1236`} className="process-edge-context curve-track"/>

        {/* Primary tactical advance arc (no markerEnd; moving unit / spearhead leads cleanly) */}
        <path
          data-motion={`p-front-line-${i}`}
          data-route={`p-front-route-${i}`}
          d={friendlyPath}
          className={`process-edge curve-edge ${isDecisive || isOffenseMid ? 'curve-edge-force' : ''}`}
        />
        {/* Post-arrival living tactical flow dash overlay */}
        <g data-motion={`p-front-flow-${i}`} opacity="0" aria-hidden="true">
          <path
            className={`amb-flow-dash ${isDecisive || isOffenseMid ? 'proc-flow-force' : 'proc-flow-org'}`}
            d={friendlyPath}
            fill="none"
            stroke={isDecisive || isOffenseMid ? 'var(--story-force)' : 'var(--story-organization)'}
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeDasharray="6 12"
            strokeOpacity="0.68"
          />
        </g>

        {/* Unit formation or crimson spearhead traveling the lane */}
        <g data-motion={`p-front-unit-${i}`} className="front-unit" opacity="0">
          <g data-motion={`p-front-unit-${i}-heading`}>
            {isDecisive || isOffenseMid ? (
              <g className="front-spearhead">
                <polygon className="front-spearhead" points="-22,-9 14,0 -22,9 -13,0" filter="url(#map-glow-force)"/>
                <circle cx="7" cy="0" r="2.5" fill="var(--ui-bg)"/>
              </g>
            ) : (
              <Formation size={0.72}/>
            )}
          </g>
        </g>

        {/* Stage 0: Defensive double-wall fortification blocking incoming enemy push */}
        {isDefense && <>
          <g className="front-fort">
            <path d={`M1003 ${y - 23} V${y + 23} M1013 ${y - 23} V${y + 23}`}/>
            <path d={`M1013 ${y - 16} L1022 ${y - 10} L1013 ${y - 4} M1013 ${y + 4} L1022 ${y + 10} L1013 ${y + 16}`} strokeWidth="1.5"/>
          </g>
          <path data-motion="p-front-enemy-0" data-route="p-front-enemy-route-0" d={enemyPushPath} fill="none" stroke="var(--story-force)" strokeWidth="1.8" strokeDasharray="5 5"/>
          <g data-motion="p-front-enemy-unit-0" className="stalemate-opponent" opacity="0">
            <g data-motion="p-front-enemy-unit-0-heading"><Formation size={0.6}/></g>
          </g>
          <g transform={`translate(1008,${y})`}>
            <g data-motion="p-front-ripple-0" opacity="0"><ArrivalRipple r={24} tone="force"/></g>
            <g data-motion="p-front-beacon-0" opacity="0" aria-hidden="true">
              <g className="amb-ripple-loop">
                <circle r="17" className="proc-geo-beacon" fill="none" stroke="var(--story-force)" strokeWidth="1.2" strokeOpacity="0.5"/>
              </g>
            </g>
          </g>
        </>}

        {/* Stage 1A (writing-88): Stalemate oscillating tension waves + behind-enemy-lines guerrilla spark pulse */}
        {isStalemate && <>
          <g data-motion="p-front-wave" opacity="0">
            <g className="amb-breathe">
              <path className="front-wave front-wave-force" d={`M966 ${y - 14} Q976 ${y - 22} 986 ${y - 14} T1006 ${y - 14} T1026 ${y - 14} T1046 ${y - 14}`}/>
              <path className="front-wave" d={`M966 ${y} Q976 ${y - 8} 986 ${y} T1006 ${y} T1026 ${y} T1046 ${y}`}/>
              <path className="front-wave front-wave-force" d={`M966 ${y + 14} Q976 ${y + 6} 986 ${y + 14} T1006 ${y + 14} T1026 ${y + 14} T1046 ${y + 14}`}/>
            </g>
          </g>
          <g data-motion="p-stalemate-opponent" className="stalemate-opponent">
            <g transform="rotate(180)"><Formation size={0.7}/></g>
          </g>
          <path data-motion="p-guerrilla-arc" data-route="p-guerrilla-route" d={guerrillaPath} fill="none" stroke="var(--ui-accent)" strokeWidth="1.6" strokeDasharray="4 4"/>
          <g data-motion="p-guerrilla-flow" opacity="0" aria-hidden="true">
            <path className="amb-flow-dash-soft proc-flow-force" d={guerrillaPath} fill="none" stroke="var(--ui-accent)" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="5 12" strokeOpacity="0.6"/>
          </g>
          <g data-motion="p-guerrilla-spark" opacity="0"><CometHead tone="force" r={4.2}/></g>
          <g transform={`translate(1202,${y - 12})`}>
            <g data-motion="p-guerrilla-ripple" opacity="0"><ArrivalRipple r={18} tone="force"/></g>
          </g>
          <Label text="坚持与拉锯 · 改变力量对比" x="1020" y={y + 40} className="process-node-note"/>
        </>}

        {/* Stage 1B (e-45): Strategic Offensive breakthrough past old defense line */}
        {isOffenseMid && <>
          <g transform={`translate(1008,${y})`}>
            <g data-motion="p-front-ripple-1" opacity="0"><ArrivalRipple r={24} tone="force"/></g>
          </g>
          <Label text="突破防线 · 转入战略进攻" x="1020" y={y + 40} className="process-node-note"/>
        </>}

        {/* Stage 2: Decisive / Counteroffensive breakthrough */}
        {isDecisive && <>
          <g transform={`translate(1008,${y})`}>
            <g data-motion="p-front-break-ripple" opacity="0"><ArrivalRipple r={26} tone="force"/></g>
          </g>
          <g transform={`translate(1218,${y})`}>
            <g data-motion="p-front-ripple-2" opacity="0"><ArrivalRipple r={28} tone="force"/></g>
            <g data-motion="p-front-beacon-2" opacity="0" aria-hidden="true">
              <g className="amb-ripple-loop">
                <circle r="19" className="proc-geo-beacon" fill="none" stroke="var(--story-force)" strokeWidth="1.25" strokeOpacity="0.52"/>
              </g>
            </g>
          </g>
          {!isProtracted && <>
            <path data-motion="p-second-front" data-route="p-second-front-route" d={secondFrontPath} fill="none" stroke="var(--story-organization)" strokeWidth="1.6" strokeDasharray="4 4"/>
            <g data-motion="p-second-front-flow" opacity="0" aria-hidden="true">
              <path className="amb-flow-dash-soft proc-flow-org" d={secondFrontPath} fill="none" stroke="var(--story-organization)" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="5 12" strokeOpacity="0.56"/>
            </g>
            <g data-motion="p-second-front-spark" opacity="0"><CometHead tone="organization" r={4}/></g>
            <Label text="第二条战线配合" x="1018" y={y + 48} className="process-node-note"/>
          </>}
        </>}
      </g>;
    })}

    {/* Concluding SealStamp cleanly above desktop subtitle band */}
    <g transform="translate(950,548)">
      <g data-motion="p-front-result-ripple" opacity="0"><ArrivalRipple r={36} tone="force"/></g>
      <g data-motion="p-front-result" opacity="0" className="process-outcome">
        <SealStamp text={story.result} tone="force"/>
      </g>
    </g>
  </g>;
}

/** Three-Army Rendezvous (e-38): short curved approach indicators (explicitly non-full-route) + arrival ripples + living beacons. */
function Rendezvous({ layout }) {
  // These short curved arrows describe who met whom at the two endpoints, not the
  // geographical origins or full routes of the three armies.
  return <g className="rendezvous-process">
    {layout.nodes.map((n, i) => {
      const flipLeft = n.x > 1060;
      const startA = { x: clamp(n.x - 104, 635, 1265), y: clamp(n.y - 46, 145, 515) };
      const startB = { x: clamp(n.x + 104, 635, 1265), y: clamp(n.y + 46, 145, 515) };
      const arcA = curveData(startA, n, { bend: -26, trimStart: 0, trimEnd: 16 });
      const arcB = curveData(startB, n, { bend: 26, trimStart: 0, trimEnd: 16 });
      const arcs = [arcA, arcB];
      const names = ['红一方面军', i ? '红二方面军' : '红四方面军'];

      return <g key={i}>
        {arcs.map((arc, j) => <g key={j}>
          <path className="process-edge-context curve-track" d={arc.d}/>
          <path data-motion={`p-rend-arc-${i}-${j}`} data-route={`p-rend-route-${i}-${j}`} className="process-edge curve-edge curve-edge-force" d={arc.d}/>
          <g data-motion={`p-rend-flow-${i}-${j}`} opacity="0" aria-hidden="true">
            <path className="amb-flow-dash proc-flow-force" d={arc.d} fill="none" stroke="var(--story-force)" strokeWidth="2.1" strokeLinecap="round" strokeDasharray="6 12" strokeOpacity="0.68"/>
          </g>
          <g data-motion={`p-army-${i}-${j}`} className="army-relation" opacity="0">
            <g data-motion={`p-army-${i}-${j}-heading`}><Formation size={0.56}/></g>
            <Label text={names[j]} y={j ? 32 : -24}/>
          </g>
        </g>)}

        <g data-motion={`p-meeting-${i}`} className="process-node process-tone-force is-reached" transform={`translate(${n.x},${n.y})`}>
          <g data-motion={`p-meeting-ripple-${i}`} opacity="0">
            <ArrivalRipple r={22} tone="force"/>
          </g>
          <g data-motion={`p-rend-beacon-${i}`} opacity="0" aria-hidden="true">
            <g className="amb-ripple-loop">
              <circle r="17" className="proc-geo-beacon" fill="none" stroke="var(--story-force)" strokeWidth="1.2" strokeOpacity="0.5"/>
            </g>
          </g>
          <circle r="11" className="process-node-ring"/>
          <circle r="4" className="process-node-core"/>
          <Label text={n.label} x={flipLeft ? -22 : 22} y="6" anchor={flipLeft ? 'end' : 'start'}/>
        </g>
      </g>;
    })}

    <g transform="translate(950,550)">
      <g data-motion="p-rend-result-ripple" opacity="0"><ArrivalRipple r={36} tone="force"/></g>
      <g data-motion="p-rendezvous-result" opacity="0" className="process-outcome">
        <SealStamp text="三大主力会师 · 北上抗日" tone="force"/>
      </g>
    </g>
  </g>;
}

export function ProcessGraphic({ story, layout, phase, prefix = '' }) {
  return <g className={`process-graphic process-${story.mode}`}>
    <Label
      text={story.relation || (story.mode === 'land' ? '土地政策变化示意' : '内容关系示意')}
      x="950"
      y="122"
      className="process-diagram-note"
    />
    {story.mode === 'land' ? (
      <Land story={story} prefix={prefix}/>
    ) : story.mode === 'seats' ? (
      <Seats story={story} prefix={prefix}/>
    ) : story.mode === 'fronts' ? (
      <Fronts story={story}/>
    ) : story.mode === 'rendezvous' ? (
      <Rendezvous layout={layout}/>
    ) : story.mode === 'union' ? (
      <UnionScene story={story} layout={layout} phase={phase}/>
    ) : story.mode === 'debate' ? (
      <DebateScene story={story} layout={layout}/>
    ) : (
      <Graph story={story} layout={layout} phase={phase} prefix={prefix}/>
    )}
  </g>;
}

function makeFallbacks(anim, duration) {
  const { add, show, move, travel, trace } = anim;
  const pop = anim.pop || ((id, at, until = duration + 1, { scaleFrom = 0.84, dy = 8 } = {}) => {
    const tIn = clamp(at, 0, duration);
    const frames = [
      { at: 0, opacity: tIn <= 0 ? 1 : 0, transform: tIn <= 0 ? 'translateY(0px) scale(1)' : `translateY(${dy}px) scale(${scaleFrom})` },
    ];
    if (tIn > 0) {
      frames.push({ at: Math.max(0, tIn - 0.32), opacity: 0, transform: `translateY(${dy}px) scale(${scaleFrom})`, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
      frames.push({ at: Math.min(duration, tIn + 0.24), opacity: 1, transform: 'translateY(-1px) scale(1.03)', easing: 'ease-out' });
      frames.push({ at: Math.min(duration, tIn + 0.44), opacity: 1, transform: 'translateY(0px) scale(1)' });
    }
    if (until <= duration) {
      frames.push({ at: clamp(until - 0.35, tIn + 0.45, duration), opacity: 1, transform: 'translateY(0px) scale(1)' });
      frames.push({ at: clamp(until, tIn + 0.46, duration), opacity: 0, transform: `translateY(${dy * 0.4}px) scale(${scaleFrom})` });
    }
    frames.push({ at: duration, opacity: until <= duration ? 0 : 1, transform: 'translateY(0px) scale(1)' });
    add(id, frames);
  });

  const stamp = anim.stamp || ((id, at, until = duration + 1) => {
    const t0 = clamp(at, 0.16, duration - 0.5);
    const frames = [
      { at: 0, opacity: 0, transform: 'scale(1.28)' },
      { at: Math.max(0, t0 - 0.16), opacity: 0, transform: 'scale(1.28)', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      { at: Math.min(duration, t0 + 0.18), opacity: 1, transform: 'scale(0.97)', easing: 'ease-out' },
      { at: Math.min(duration, t0 + 0.36), opacity: 1, transform: 'scale(1)' },
    ];
    if (until <= duration) {
      frames.push({ at: clamp(until - 0.35, t0 + 0.38, duration), opacity: 1, transform: 'scale(1)' });
      frames.push({ at: clamp(until, t0 + 0.4, duration), opacity: 0, transform: 'scale(0.94)' });
    }
    frames.push({ at: duration, opacity: until <= duration ? 0 : 1, transform: 'scale(1)' });
    add(id, frames);
  });

  const ripple = anim.ripple || ((id, at, dur = 1.4) => {
    const t0 = clamp(at, 0.04, Math.max(0.05, duration - 0.3));
    const t1 = Math.min(duration, t0 + dur * 0.2);
    const t2 = Math.min(duration, t0 + dur);
    add(id, [
      { at: 0, opacity: 0, transform: 'scale(0.55)' },
      { at: Math.max(0, t0 - 0.02), opacity: 0, transform: 'scale(0.55)', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      { at: t1, opacity: 0.85, transform: 'scale(0.88)', easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      { at: t2, opacity: 0, transform: 'scale(2.15)' },
      { at: duration, opacity: 0, transform: 'scale(2.15)' },
    ]);
  });

  return { add, show, pop, stamp, ripple, move, travel, trace };
}

export function animateProcess(story, layout, anim) {
  const end = story.duration;
  const { add, show, pop, stamp, ripple, move, travel, trace } = makeFallbacks(anim, end);

  if (story.mode === 'land') {
    const variant = detectLandVariant(story);
    const isTwoLayer = variant === 'two-layer';
    const isThreeRights = variant === 'three-rights';
    const value = story.allocation === 'value';
    const rent = story.allocation === 'rent';
    const equal = story.allocation === 'equal' || story.allocation === 'proposal';
    const transformsOwnership = !story.unimplemented && (story.allocation === 'equal' || story.allocation === 'all' || story.allocation === 'protected');

    if (isTwoLayer) {
      pop('p-layer-base', 0);
      add('p-layer-guides', [
        { at: 0, opacity: 0, transform: 'scaleY(0.08)' },
        { at: 7.2, opacity: 0, transform: 'scaleY(0.08)', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        { at: 10.6, opacity: 1, transform: 'scaleY(1)' },
        { at: end, opacity: 1, transform: 'scaleY(1)' },
      ]);
      move('p-layer-top', [[950, 396], [950, 260]], 7.2, 10.8);
      stamp('p-land-thumb', 10.9);
      stamp('p-land-stamp', 11.4);
      ripple('p-land-stamp-ripple', 11.5, 1.5);
    } else if (isThreeRights) {
      pop('p-tri-layer-0', 0);
      move('p-tri-layer-1', [[950, 412], [950, 326]], 7.1, 10.4);
      move('p-tri-layer-2', [[950, 394], [950, 222]], 7.3, 11.0);
      add('p-tri-guides', [
        { at: 0, opacity: 0, transform: 'scaleY(0.08)' },
        { at: 7.2, opacity: 0, transform: 'scaleY(0.08)', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        { at: 10.8, opacity: 1, transform: 'scaleY(1)' },
        { at: end, opacity: 1, transform: 'scaleY(1)' },
      ]);
      stamp('p-land-stamp', 11.2);
      ripple('p-land-stamp-ripple', 11.3, 1.5);
    } else if (rent) {
      show('p-rent-policy', 7.1);
      trace('p-rent-policy', 7.1, 10.6);
      show('p-rent-flow-upper', 10.5);
      pop('p-rent-tip-upper', 10.55, end + 1, { scaleFrom: 0.45, dy: 0 });
      show('p-rent-comet', 7.1, 10.8);
      travel('p-rent-comet', 'p-rent-upper', 7.1, 10.6);
      pop('p-rent-policy-label', 7.5);

      show('p-rent-payment', 8.4);
      trace('p-rent-payment', 8.4, 11.8);
      show('p-rent-flow-lower', 11.7);
      pop('p-rent-tip-lower', 11.75, end + 1, { scaleFrom: 0.45, dy: 0 });
      pop('p-rent-payment-label', 8.8);
      [0, 1, 2].forEach((i) => {
        const s = 8.7 + i * 0.75;
        const e = Math.min(end - 0.8, s + 3.1);
        show(`p-rent-${i}`, s, e + 0.3);
        travel(`p-rent-${i}`, 'p-rent-lower', s, e);
      });
    } else if (value) {
      show('p-value-original', 0);
      show('p-land-transfer', 7.1);
      trace('p-land-transfer', 7.1, 10.9);
      show('p-value-flow', 10.8);
      pop('p-value-tip', 10.85, end + 1, { scaleFrom: 0.45, dy: 0 });
      show('p-value-comet', 7.1, 11.1);
      travel('p-value-comet', 'p-value-route', 7.1, 10.9);
      pop('p-value-arc-label', 7.6);
      add('p-value-increment', [
        { at: 0, opacity: 0, transform: 'scaleY(0.05)' },
        { at: 7.4, opacity: 0, transform: 'scaleY(0.05)', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        { at: 11.4, opacity: 1, transform: 'scaleY(1)' },
        { at: end, opacity: 1, transform: 'scaleY(1)' },
      ]);
      ripple('p-value-ripple', 11.1, 1.5);
      stamp('p-land-stamp', 11.45);
      ripple('p-land-stamp-ripple', 11.55, 1.4);
    } else {
      trace('p-land-grid-h', 8.1, 10.5);
      trace('p-land-grid-v', 8.5, 10.9);
      for (let i = 0; i < 12; i++) {
        const from = [652 + (i % 4) * 44, 262 + Math.floor(i / 4) * 35];
        const to = equal
          ? [1049 + (i % 3) * 72, 260 + Math.floor(i / 3) * 30]
          : [1054 + (i % 4) * 44, 262 + Math.floor(i / 4) * 35];
        const tStart = 7.3 + (i % 4) * 0.22 + Math.floor(i / 4) * 0.12;
        const tEnd = Math.min(12.8, tStart + 3.6);
        move(`p-parcel-${i}`, [from, to], tStart, tEnd);
        if (transformsOwnership) {
          add(`p-parcel-own-${i}`, [
            { at: 0, opacity: 0 },
            { at: tStart + 1.5, opacity: 0, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
            { at: tEnd, opacity: 1 },
            { at: end, opacity: 1 },
          ]);
        }
        if (story.unimplemented) {
          add(`p-parcel-${i}`, [
            { at: 0, opacity: 0.72 },
            { at: 13.7, opacity: 0.72 },
            { at: 14.5, opacity: 0.22 },
            { at: end, opacity: 0.22 },
          ]);
        }
      }
      show('p-land-transfer', 7.05);
      trace('p-land-transfer', 7.05, 11.4);
      show('p-land-flow', 11.3);
      pop('p-deed-tip', 11.35, end + 1, { scaleFrom: 0.45, dy: 0 });
      pop('p-deed-label', 7.3);
      show('p-land-deed', 7.15, 13.6);
      travel('p-land-deed', 'p-deed-route', 7.15, 11.8);
      ripple('p-land-arrive-ripple', 11.8, 1.5);

      if (equal) {
        [0, 1, 2].forEach((i) => pop(`p-household-${i}`, 7.5 + i * 0.28));
      }
      if (story.unimplemented) {
        stamp('p-land-reject', 14.3);
      } else {
        stamp('p-land-stamp', 12.1);
        ripple('p-land-stamp-ripple', 12.2, 1.5);
      }
    }

    if (story.protected) {
      const protAt = isTwoLayer ? 11.6 : isThreeRights ? 10.8 : 7.4;
      pop('p-protected', protAt);
      ripple('p-protected-ripple', protAt + 0.15, 1.5);
    }
    stamp('p-land-note', 14.3);
  } else if (story.mode === 'seats') {
    pop('p-rostrum-crest', 0.35, end + 1, { scaleFrom: 0.72, dy: 0 });
    [0, 1, 2].forEach((g) => {
      pop(`p-sector-${g}`, g === 0 ? 0 : 0.45 + g * 0.55, end + 1, { scaleFrom: 0.94, dy: 4 });
      pop(`p-seat-group-label-${g}`, g === 0 ? 0 : 0.75 + g * 0.55);
      trace(`p-bracket-${g}`, 7.1 + g * 0.55, 8.9 + g * 0.55);
      pop(`p-seat-share-${g}`, 7.5 + g * 0.55);
    });
    for (let i = 0; i < 9; i++) {
      const g = Math.floor(i / 3);
      const j = i % 3;
      pop(`p-seat-${i}`, 0.95 + g * 0.74 + j * 0.25, end + 1, { scaleFrom: 0.65, dy: 6 });
    }
    stamp('p-seat-result', 14.3);
    ripple('p-seat-ripple', 14.4, 1.5);
  } else if (story.mode === 'fronts') {
    const isProtracted = story.labels[1] === '战略相持';
    [0, 1, 2].forEach((i) => {
      const from = story.beats[i].at + 0.35;
      const to = Math.min(end - 0.8, from + 4.3);
      show(`p-front-${i}`, i === 0 ? 0 : from);
      trace(`p-front-line-${i}`, from + 0.15, to);
      show(`p-front-flow-${i}`, to - 0.1);
      show(`p-front-unit-${i}`, from + 0.15);
      travel(`p-front-unit-${i}`, `p-front-route-${i}`, from + 0.15, to);
    });

    trace('p-front-enemy-0', 0.8, 3.8);
    show('p-front-enemy-unit-0', 0.8, 5.4);
    travel('p-front-enemy-unit-0', 'p-front-enemy-route-0', 0.8, 3.8);
    ripple('p-front-ripple-0', 3.85, 1.5);
    show('p-front-beacon-0', 3.85);

    if (isProtracted) {
      show('p-front-wave', 8.2);
      move('p-stalemate-opponent', [[1188, 318], [1068, 318], [1092, 318], [1064, 318]], 7.5, 13.4);
      trace('p-guerrilla-arc', 9.2, 12.6);
      show('p-guerrilla-flow', 12.5);
      show('p-guerrilla-spark', 9.2, 13.0);
      travel('p-guerrilla-spark', 'p-guerrilla-route', 9.2, 12.6);
      ripple('p-guerrilla-ripple', 12.6, 1.5);
    } else {
      ripple('p-front-ripple-1', 9.5, 1.4);

      trace('p-second-front', 15.2, 18.4);
      show('p-second-front-flow', 18.3);
      show('p-second-front-spark', 15.2, 18.8);
      travel('p-second-front-spark', 'p-second-front-route', 15.2, 18.4);
    }

    ripple('p-front-break-ripple', 16.2, 1.4);
    ripple('p-front-ripple-2', 18.65, 1.5);
    show('p-front-beacon-2', 18.65);

    stamp('p-front-result', 16.0);
    ripple('p-front-result-ripple', 16.1, 1.5);
  } else if (story.mode === 'rendezvous') {
    layout.nodes.forEach((n, i) => {
      const base = i * 7 + 0.15;
      show(`p-meeting-${i}`, i === 0 ? 0 : base);
      [0, 1].forEach((j) => {
        trace(`p-rend-arc-${i}-${j}`, base + 0.35, base + 4.9);
        show(`p-rend-flow-${i}-${j}`, base + 4.8);
        show(`p-army-${i}-${j}`, base + 0.35);
        travel(`p-army-${i}-${j}`, `p-rend-route-${i}-${j}`, base + 0.35, base + 4.9);
      });
      ripple(`p-meeting-ripple-${i}`, base + 4.95, 1.6);
      show(`p-rend-beacon-${i}`, base + 4.95);
    });
    stamp('p-rendezvous-result', 14.3);
    ripple('p-rend-result-ripple', 14.4, 1.5);
  } else if (story.mode === 'union') {
    const groups = layout.nodes.slice(0, story.groups.length);
    groups.forEach((n, i) => {
      const at = n.phase * 7 + 0.25;
      add(n.id, [
        { at: 0, opacity: n.phase === 0 ? 1 : 0.28 },
        { at: Math.max(0, at - 0.3), opacity: n.phase === 0 ? 1 : 0.28 },
        { at, opacity: 1 },
        { at: end, opacity: 1 },
      ]);
      if (n.phase > 0) pop(`p-object-${i}`, at);
      ripple(`p-ripple-${i}`, at + 0.15, 1.35);
    });

    pop('p-origin-ambient', 0.6, end + 1, { scaleFrom: 0.72, dy: 0 });
    ripple('p-origin-wave-0', 0.8, 2.2);
    ripple('p-origin-wave-1', 1.6, 2.4);

    groups.forEach((_, i) => {
      const from = 7.3 + i * 0.35;
      const to = Math.min(12.2, from + 3.8);
      trace(`p-edge-${i}`, from, to);
      show(`p-flow-${i}`, to - 0.1);
      pop(`p-tip-${i}`, to - 0.05, end + 1, { scaleFrom: 0.45, dy: 0 });
      show(`p-token-${i}`, from, to + 0.3);
      travel(`p-token-${i}`, `p-route-${i}`, from, to);

      show(`p-spark-dot-a-${i}`, from + 0.4, to + 0.4);
      travel(`p-spark-dot-a-${i}`, `p-spark-a-${i}`, from + 0.4, to + 0.2);

      show(`p-spark-dot-b-${i}`, from + 1.1, Math.min(end - 0.5, to + 1.0));
      travel(`p-spark-dot-b-${i}`, `p-spark-b-${i}`, from + 1.1, Math.min(end - 0.7, to + 0.8));
    });

    pop('p-hub-medallion', 11.4);
    pop('p-union-ambient-0', 11.7, end + 1, { scaleFrom: 0.65, dy: 0 });
    pop('p-union-ambient-1', 12.2, end + 1, { scaleFrom: 0.65, dy: 0 });
    ripple('p-hub-ripple', 11.6, 1.5);
    ripple('p-union-wave-0', 11.8, 2.4);
    ripple('p-union-wave-1', 12.6, 2.6);
    ripple('p-union-wave-2', 14.3, 2.6);
    stamp('p-union-seal', 14.3);
  } else if (story.mode === 'debate') {
    const left = layout.nodes[0];
    const right = layout.nodes[1];
    const hasWinner = story.selected !== undefined;
    const isPairCorrespondence = Boolean(story.relation && story.relation.includes('对应'));
    const showForceReject = !hasWinner && story.finalTone === 'force';
    const finalDeg = hasWinner
      ? (story.selected === 1 ? 7.2 : -7.2)
      : isPairCorrespondence
        ? 0
        : showForceReject
          ? -5.2
          : -6.2;
    const panOffset = (deg) => Math.round(202 * Math.sin((deg * Math.PI) / 180));
    const rockA = isPairCorrespondence ? -4.5 : -5.8;
    const rockB = isPairCorrespondence ? 4.5 : 5.8;
    const overDeg = finalDeg === 0 ? -1.8 : finalDeg * 1.18;

    // Mechanical balance-scale crossbar rocking on beat 0/1 & settling firmly onto the decisive pole
    add('p-scale-beam', [
      { at: 0, transform: 'rotate(0deg)' },
      { at: 4.1, transform: 'rotate(0deg)', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      { at: 5.5, transform: `rotate(${rockA}deg)`, easing: 'cubic-bezier(0.42, 0, 0.58, 1)' },
      { at: 7.0, transform: `rotate(${rockB}deg)`, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      { at: 9.3, transform: `rotate(${overDeg.toFixed(1)}deg)`, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      { at: 10.6, transform: `rotate(${finalDeg}deg)` },
      { at: end, transform: `rotate(${finalDeg}deg)` },
    ]);
    ripple('p-scale-ring', 7.35, 1.55);

    [left, right].forEach((n, i) => {
      const enterFrom = [n.x + (i ? 68 : -68), n.y];
      const sign = i ? 1 : -1;
      const dyA = sign * panOffset(rockA);
      const dyB = sign * panOffset(rockB);
      const dyOver = sign * panOffset(overDeg);
      const dyFinal = sign * panOffset(finalDeg);

      // Node medallions ride vertically with suspended scale pans; text labels stay 100% horizontal
      add(`p-debate-side-${i}`, [
        { at: 0, transform: `translate(${enterFrom[0]}px,${enterFrom[1]}px)` },
        { at: 0.2, transform: `translate(${enterFrom[0]}px,${enterFrom[1]}px)`, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        { at: 4.1, transform: `translate(${n.x}px,${n.y}px)`, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        { at: 5.5, transform: `translate(${n.x}px,${n.y + dyA}px)`, easing: 'cubic-bezier(0.42, 0, 0.58, 1)' },
        { at: 7.0, transform: `translate(${n.x}px,${n.y + dyB}px)`, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        { at: 9.3, transform: `translate(${n.x}px,${n.y + dyOver}px)`, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        { at: 10.6, transform: `translate(${n.x}px,${n.y + dyFinal}px)` },
        { at: end, transform: `translate(${n.x}px,${n.y + dyFinal}px)` },
      ]);

      if (hasWinner) {
        const isWin = i === story.selected;
        add(`p-debate-tilt-${i}`, [
          { at: 0, transform: 'scale(1)', opacity: 1 },
          { at: 7.5, transform: 'scale(1)', opacity: 1, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
          { at: 10.6, transform: isWin ? 'scale(1.07)' : 'scale(0.9)', opacity: isWin ? 1 : 0.42 },
          { at: end, transform: isWin ? 'scale(1.07)' : 'scale(0.9)', opacity: isWin ? 1 : 0.42 },
        ]);
      } else {
        const emphasized = !isPairCorrespondence && !showForceReject && i === 0;
        add(`p-debate-tilt-${i}`, [
          { at: 0, transform: 'scale(1)', opacity: 1 },
          { at: 7.5, transform: 'scale(1)', opacity: 1, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
          { at: 10.6, transform: emphasized ? 'scale(1.05)' : 'scale(1)', opacity: 1 },
          { at: end, transform: emphasized ? 'scale(1.05)' : 'scale(1)', opacity: 1 },
        ]);
      }
      ripple(`p-side-ripple-${i}`, 4.1, 1.3);
    });

    trace('p-beam-l1', 4.4, 7.3);
    trace('p-beam-l2', 4.6, 7.4);
    trace('p-beam-r1', 4.4, 7.3);
    trace('p-beam-r2', 4.6, 7.4);
    show('p-beam-comet-l', 4.4, 7.5);
    travel('p-beam-comet-l', 'p-beam-route-l', 4.4, 7.3);
    show('p-beam-comet-r', 4.4, 7.5);
    travel('p-beam-comet-r', 'p-beam-route-r', 4.4, 7.3);

    const hideClashAt = showForceReject ? 14.3 : end + 1;
    pop('p-debate-clash', 7.2, hideClashAt, { scaleFrom: 0.65, dy: 0 });
    ripple('p-clash-ripple', 7.3, 1.5);
    pop('p-debate-bar', 7.4);

    if (hasWinner) {
      stamp('p-debate-reject', 8.6);
      ripple('p-reject-ripple', 8.7, 1.4);
    } else if (showForceReject) {
      stamp('p-debate-reject', 14.4);
      ripple('p-reject-ripple', 14.5, 1.4);
    }

    const resCount = hasWinner ? 1 : 2;
    for (let idx = 0; idx < resCount; idx++) {
      const from = 10.5 + idx * 0.25;
      const to = 14.1;
      trace(`p-res-edge-${idx}`, from, to);
      show(`p-res-flow-${idx}`, to - 0.1);
      pop(`p-res-tip-${idx}`, to - 0.05, end + 1, { scaleFrom: 0.45, dy: 0 });
      show(`p-res-comet-${idx}`, from, to + 0.3);
      travel(`p-res-comet-${idx}`, `p-res-route-${idx}`, from, to);
    }
    stamp('p-debate-result', 14.3);
    ripple('p-result-ripple', 14.4, 1.5);
  } else {
    // Graph scenes: geography, chain, fork, cycle, strategy
    const resultIdx = (story.mode === 'fork' || story.mode === 'strategy') ? layout.nodes.length - 1 : -1;
    const incomingTime = new Map();

    if (story.mode === 'cycle') {
      pop('p-cycle-hub', 0.4, end + 1, { scaleFrom: 0.78, dy: 0 });
    }
    if (story.mode === 'strategy') {
      show('p-strategy-radar', 0.25);
    }

    layout.edges.forEach((e, i) => {
      const from = e.phase * 7 + 0.45 + (story.mode === 'fork' ? (i % 3) * 0.28 : 0);
      const to = Math.min(end - 0.85, from + 4.1);
      trace(`p-edge-${i}`, from, to);
      show(`p-flow-${i}`, to - 0.1);
      pop(`p-tip-${i}`, to - 0.05, end + 1, { scaleFrom: 0.45, dy: 0 });
      show(`p-token-${i}`, from, to + 0.35);
      travel(`p-token-${i}`, `p-route-${i}`, from, to);
      if (e.label) pop(`p-edge-label-${i}`, from + 0.55);

      const prev = incomingTime.get(e.to);
      if (prev === undefined || to < prev) incomingTime.set(e.to, to);
    });

    layout.nodes.forEach((n, i) => {
      if (i === resultIdx) {
        const arriveAt = Math.min(14.3, incomingTime.get(i) ?? 14.3);
        stamp(`p-seal-${i}`, arriveAt);
        ripple(`p-ripple-${i}`, arriveAt + 0.08, 1.5);
        return;
      }

      const at = n.phase * 7 + 0.25;
      const context = story.mode === 'fork' && i > 0 && i <= story.branches.length ? 0 : 0.32;
      add(n.id, [
        { at: 0, opacity: n.phase === 0 ? 1 : context },
        { at: Math.max(0, at - 0.3), opacity: n.phase === 0 ? 1 : context },
        { at, opacity: 1 },
        { at: end, opacity: 1 },
      ]);

      const rippleAt = incomingTime.has(i) ? incomingTime.get(i) : at + 0.12;
      ripple(`p-ripple-${i}`, rippleAt, 1.45);
      if (story.mode === 'geography') {
        show(`p-beacon-${i}`, rippleAt);
      }

      if (story.mode !== 'geography' && n.phase > 0 && !(story.mode === 'fork' && i > 0 && i <= story.branches.length)) {
        pop(`p-object-${i}`, at);
      }
    });

    if (story.mode === 'fork') {
      layout.nodes.slice(1, 1 + story.branches.length).forEach((n, i) => {
        move(n.id, [[layout.nodes[0].x, layout.nodes[0].y + 44], [n.x, n.y]], 7.1 + i * 0.28, 10.6 + i * 0.28);
        pop(`p-label-${i + 1}`, 9.0 + i * 0.28);
        add(`p-object-${i + 1}`, [
          { at: 0, transform: `rotate(${(i - 1) * 10}deg)` },
          { at: 7.1, transform: `rotate(${(i - 1) * 10}deg)`, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
          { at: 11.4, transform: 'rotate(0deg)' },
          { at: end, transform: 'rotate(0deg)' },
        ]);
      });
    }

    if (story.outcome) {
      stamp('p-outcome', 14.3);
    }
  }
}
