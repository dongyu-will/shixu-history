import {
  Bank,
  Scroll,
  ShieldChevron,
  TreeStructure,
  UsersThree,
  Warning,
} from '@phosphor-icons/react';
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
const IMPACT_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

/** Trimmed quadratic Bezier path starting/ending cleanly outside node rims. */
function curveData(a, b, { bend = 0, trimStart = 32, trimEnd = 34 } = {}) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const nx = -uy;
  const ny = ux;
  const cx = (a.x + b.x) / 2 + nx * bend;
  const cy = (a.y + b.y) / 2 + ny * bend;

  const maxTrim = dist * 0.74;
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

  const endAngle = (Math.atan2(ey - cy, ex - cx) * 180) / Math.PI;
  const d = `M${sx.toFixed(1)},${sy.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`;
  return { d, sx, sy, cx, cy, ex, ey, endAngle };
}

/** Arrival chevron popped cleanly at curve completion (never floats detached mid-trace). */
function ArrivalTip({ id, x, y, angle, tone = 'organization', size = 1 }) {
  const stroke = tone === 'force'
    ? 'var(--story-force)'
    : tone === 'gold'
      ? 'var(--hero-gold, var(--motion-sector-2))'
      : 'var(--story-organization)';
  const w = 7.8 * size;
  const h = 4.6 * size;
  return <g transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${angle.toFixed(1)})`}>
    <g data-motion={id} opacity="0">
      <path
        d={`M${(-w).toFixed(1)},${(-h).toFixed(1)} L${(0.6 * size).toFixed(1)},0 L${(-w).toFixed(1)},${h.toFixed(1)}`}
        fill="none"
        stroke={stroke}
        strokeWidth={size > 1 ? 2.6 : 2.05}
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

/** 5-pointed star path centered at (cx, cy) with outer/inner radii. */
function starPath(cx, cy, rOuter, rInner) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const deg = -90 + i * 36;
    const r = i % 2 === 0 ? rOuter : rInner;
    const [x, y] = polarPoint(cx, cy, r, deg);
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `${pts.join(' ')} Z`;
}

/** 4-pointed compass/starlight diamond path centered at (0, 0). */
function fourPointStar(rOuter, rInner, offsetDeg = 0) {
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const deg = offsetDeg + i * 45;
    const r = i % 2 === 0 ? rOuter : rInner;
    const [x, y] = polarPoint(0, 0, r, deg);
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `${pts.join(' ')} Z`;
}

/* ========================================================================== */
/* HERO 1: e-36 遵义会议 (1935)                                                */
/* ========================================================================== */

const ZUNYI_GEOM = (() => {
  const pivot = { x: 950, y: 268 };
  const crisisStart = { x: 738, y: 268 };
  const crisisRetreat = { x: 716, y: 268 };
  const guide = { x: 1174, y: 268 };
  const mil = { x: 818, y: 398 };
  const org = { x: 1082, y: 398 };
  const seal = { x: 950, y: 524 };

  const crisisTop = curveData({ x: 770, y: 254 }, { x: 902, y: 258 }, { bend: -22, trimStart: 0, trimEnd: 0 });
  const crisisMid = curveData({ x: 772, y: 268 }, { x: 900, y: 268 }, { bend: -7, trimStart: 0, trimEnd: 0 });
  const crisisBot = curveData({ x: 770, y: 282 }, { x: 902, y: 278 }, { bend: 22, trimStart: 0, trimEnd: 0 });

  const guideBeam = curveData(pivot, guide, { bend: -20, trimStart: 44, trimEnd: 33 });
  const milBeam = curveData(pivot, mil, { bend: -24, trimStart: 44, trimEnd: 32 });
  const orgBeam = curveData(pivot, org, { bend: 24, trimStart: 44, trimEnd: 32 });

  const convMil = curveData(mil, { x: 894, y: 498 }, { bend: 24, trimStart: 30, trimEnd: 4 });
  const convOrg = curveData(org, { x: 1006, y: 498 }, { bend: -24, trimStart: 30, trimEnd: 4 });

  return {
    pivot,
    crisisStart,
    crisisRetreat,
    guide,
    mil,
    org,
    seal,
    crisisTop,
    crisisMid,
    crisisBot,
    guideBeam,
    milBeam,
    orgBeam,
    convMil,
    convOrg,
  };
})();

function ZunyiGraphic({ story, phase }) {
  const g = ZUNYI_GEOM;
  const anchorText = story?.anchor ? `${story.anchor.replace(/[市县]$/, '')} · 事件所在地` : '遵义 · 事件所在地';
  const compassTicks = Array.from({ length: 12 }, (_, i) => {
    const deg = i * 30;
    const major = i % 3 === 0;
    const [x0, y0] = polarPoint(0, 0, major ? 31 : 34, deg);
    const [x1, y1] = polarPoint(0, 0, 39, deg);
    return `M${x0.toFixed(1)},${y0.toFixed(1)} L${x1.toFixed(1)},${y1.toFixed(1)}`;
  }).join(' ');

  return <g className="process-graphic hero-scene hero-zunyi">
    {/* Header note & top anchor badge — cleanly above focal stage, never behind subtitles */}
    <text x="950" y="120" textAnchor="middle" className="process-diagram-note">
      {story?.relation || '纠正与转向'}
    </text>
    <text x="950" y="150" textAnchor="middle" className="process-node-note hero-anchor-text">
      {anchorText}
    </text>

    {/* Subtle horizontal pivot guide rule */}
    <path
      className="curve-track"
      d="M780,268 Q860,268 902,268 M998,268 Q1074,268 1138,268"
      opacity="0.34"
    />

    {/* Beat 0: Dashed crisis pressure arcs pushing from left toward central compass pivot */}
    <g data-motion="z-crisis-arcs" className="hero-crisis-group" opacity="0">
      <path className="hero-crisis-arc" data-route="z-crisis-route-top" d={g.crisisTop.d}/>
      <path className="hero-crisis-arc hero-crisis-arc-mid" d={g.crisisMid.d}/>
      <path className="hero-crisis-arc" data-route="z-crisis-route-bot" d={g.crisisBot.d}/>
    </g>
    <g data-motion="z-crisis-pulse-0" opacity="0">
      <circle r="3.4" fill="var(--story-plan)" stroke="var(--ui-bg)" strokeWidth="1.2"/>
    </g>
    <g data-motion="z-crisis-pulse-1" opacity="0">
      <circle r="3.4" fill="var(--story-plan)" stroke="var(--ui-bg)" strokeWidth="1.2"/>
    </g>

    {/* Beat 1 & 2 dashed context tracks */}
    <path className="curve-track" d={g.guideBeam.d}/>
    <path className="curve-track" d={g.milBeam.d}/>
    <path className="curve-track" d={g.orgBeam.d}/>
    <path className="curve-track" d={g.convMil.d}/>
    <path className="curve-track" d={g.convOrg.d}/>

    {/* Beat 1: Focused beams from Zunyi compass to 从中国实际出发, 军事问题, 组织问题 */}
    <path
      data-motion="z-guide-beam"
      data-route="z-guide-route"
      className="process-edge curve-edge hero-guiding-beam"
      d={g.guideBeam.d}
      opacity="0"
    />
    <g data-motion="z-guide-flow" opacity="0" aria-hidden="true">
      <path className="amb-flow-dash amb-flow-dash-gold" d={g.guideBeam.d} fill="none"/>
    </g>
    <ArrivalTip id="z-guide-tip" x={g.guideBeam.ex} y={g.guideBeam.ey} angle={g.guideBeam.endAngle} tone="gold"/>
    <g data-motion="z-guide-comet" opacity="0">
      <CometHead tone="force" r={4.2}/>
    </g>

    <path
      data-motion="z-beam-mil"
      data-route="z-route-mil"
      className="process-edge curve-edge curve-edge-force"
      d={g.milBeam.d}
      opacity="0"
    />
    <g data-motion="z-mil-flow" opacity="0" aria-hidden="true">
      <path className="amb-flow-dash amb-flow-dash-force" d={g.milBeam.d} fill="none"/>
    </g>
    <ArrivalTip id="z-tip-mil" x={g.milBeam.ex} y={g.milBeam.ey} angle={g.milBeam.endAngle} tone="force"/>
    <g data-motion="z-comet-mil" opacity="0">
      <CometHead tone="force" r={4.6}/>
    </g>

    <path
      data-motion="z-beam-org"
      data-route="z-route-org"
      className="process-edge curve-edge"
      d={g.orgBeam.d}
      opacity="0"
    />
    <g data-motion="z-org-flow" opacity="0" aria-hidden="true">
      <path className="amb-flow-dash amb-flow-dash-org" d={g.orgBeam.d} fill="none"/>
    </g>
    <ArrivalTip id="z-tip-org" x={g.orgBeam.ex} y={g.orgBeam.ey} angle={g.orgBeam.endAngle} tone="organization"/>
    <g data-motion="z-comet-org" opacity="0">
      <CometHead tone="organization" r={4.6}/>
    </g>

    {/* Beat 2: Twin convergence arcs downward into cinnabar SealStamp */}
    <path
      data-motion="z-conv-mil"
      data-route="z-conv-route-mil"
      className="process-edge curve-edge curve-edge-force"
      d={g.convMil.d}
      opacity="0"
    />
    <g data-motion="z-conv-mil-flow" opacity="0" aria-hidden="true">
      <path className="amb-flow-dash amb-flow-dash-force" d={g.convMil.d} fill="none"/>
    </g>
    <ArrivalTip id="z-conv-tip-mil" x={g.convMil.ex} y={g.convMil.ey} angle={g.convMil.endAngle} tone="force"/>
    <g data-motion="z-conv-comet-mil" opacity="0">
      <CometHead tone="force" r={4.4}/>
    </g>

    <path
      data-motion="z-conv-org"
      data-route="z-conv-route-org"
      className="process-edge curve-edge curve-edge-force"
      d={g.convOrg.d}
      opacity="0"
    />
    <g data-motion="z-conv-org-flow" opacity="0" aria-hidden="true">
      <path className="amb-flow-dash amb-flow-dash-force" d={g.convOrg.d} fill="none"/>
    </g>
    <ArrivalTip id="z-conv-tip-org" x={g.convOrg.ex} y={g.convOrg.ey} angle={g.convOrg.endAngle} tone="force"/>
    <g data-motion="z-conv-comet-org" opacity="0">
      <CometHead tone="force" r={4.4}/>
    </g>

    {/* Left Crisis Medallion (outer handles horizontal recoil, inner handles tilt + dim) */}
    <g data-motion="z-crisis-pos" className="process-node process-tone-plan is-reached" style={{ opacity: 1 }}>
      <g data-motion="z-crisis-body">
        <NodeMedallion radius={29} tone="plan">
          <Warning x={-13} y={-13} size={26} weight="regular"/>
        </NodeMedallion>
        <text x="0" y="-44" textAnchor="middle">错误军事领导</text>
      </g>
    </g>

    {/* Cinnabar RejectSeal stamped over retreated 错误军事领导 */}
    <g transform={`translate(${g.crisisRetreat.x},${g.crisisRetreat.y})`}>
      <g data-motion="z-reject-ripple" opacity="0">
        <ArrivalRipple r={34} tone="force"/>
      </g>
      <g data-motion="z-reject-seal" opacity="0">
        <RejectSeal label="纠错" angle={-13}/>
      </g>
    </g>

    {/* Central Pivot Date Label */}
    <g transform="translate(950,190)">
      <g data-motion="z-pivot-date" opacity="0">
        <text x="0" y="0" textAnchor="middle" className="process-node-note hero-sub-note">1935.1 · 贵州遵义</text>
      </g>
    </g>

    {/* Central Compass Pivot at (950, 268) */}
    <g transform={`translate(${g.pivot.x},${g.pivot.y})`}>
      {/* Beat 0 tense pulsing crisis ring */}
      <g data-motion="z-tense-ring" className="hero-tense-ring">
        <circle r="38" fill="var(--ui-bg)" fillOpacity="0.92" stroke="var(--story-plan)" strokeWidth="1.5" strokeDasharray="5 5"/>
        <circle r="24" fill="none" stroke="var(--story-force)" strokeWidth="1.15" strokeDasharray="3 4" strokeOpacity="0.68"/>
      </g>
      <g data-motion="z-tense-core">
        <circle r="5" fill="var(--story-force)"/>
      </g>

      {/* Beat 1 golden-vermilion starlight compass ripples */}
      <g data-motion="z-compass-ripple-0" opacity="0">
        <ArrivalRipple r={40} tone="force"/>
      </g>
      <g data-motion="z-compass-ripple-1" opacity="0">
        <ArrivalRipple r={44} tone="force" className="hero-ripple-gold"/>
      </g>

      {/* Beat 1 Zunyi Starlight Compass Rose */}
      <g data-motion="z-compass-star" className="hero-compass" opacity="0">
        <circle r="40" fill="none" stroke="var(--hero-gold, var(--motion-sector-2))" strokeWidth="1.1" className="amb-ripple-loop" aria-hidden="true"/>
        <circle className="hero-compass-dial" r="40" fill="var(--ui-bg)" stroke="var(--story-force)" strokeWidth="1.8"/>
        <circle r="32" fill="var(--story-force)" fillOpacity="0.08" stroke="var(--hero-gold, var(--motion-sector-2))" strokeWidth="1" strokeOpacity="0.72" className="amb-breathe"/>
        <path className="hero-compass-ticks" d={compassTicks} fill="none" stroke="var(--hero-gold, var(--motion-sector-2))" strokeWidth="1" strokeOpacity="0.75"/>
        <g className="amb-compass-settle">
          <path className="hero-compass-star-sub" d={fourPointStar(23, 5.5, 45)} fill="var(--hero-gold, var(--motion-sector-2))" fillOpacity="0.88"/>
          <path className="hero-compass-star" d={fourPointStar(30, 6.5, 0)} fill="var(--story-force)" stroke="var(--ui-bg)" strokeWidth="1"/>
          <circle className="hero-compass-core" r="5.2" fill="var(--hero-gold, var(--motion-sector-2))" stroke="var(--ui-bg)" strokeWidth="1.3" filter="url(#map-glow-force)"/>
        </g>
      </g>
    </g>

    {/* Right Guiding Direction Medallion: 从中国实际出发 */}
    <g transform={`translate(${g.guide.x},${g.guide.y})`} className={`process-node process-tone-force ${phase >= 1 ? 'is-reached' : ''}`} style={{ opacity: 1 }}>
      <g data-motion="z-guide-ripple" opacity="0">
        <ArrivalRipple r={32} tone="force" className="hero-ripple-gold"/>
      </g>
      <g data-motion="z-guide-node" opacity="0">
        <circle r="30" fill="none" stroke="var(--hero-gold, var(--motion-sector-2))" strokeWidth="1" strokeOpacity="0.38" className="amb-breathe" aria-hidden="true"/>
        <NodeMedallion radius={27} tone="force" active>
          <g className="amb-compass-settle">
            <HeroEmblem name="compass-star" size={28} tone="force"/>
          </g>
        </NodeMedallion>
        <text x="0" y="-44" textAnchor="middle">从中国实际出发</text>
      </g>
    </g>

    {/* Twin Focused Medallions: 军事问题 & 组织问题 */}
    <g transform={`translate(${g.mil.x},${g.mil.y})`} className={`process-node process-tone-force ${phase >= 1 ? 'is-reached' : ''}`} style={{ opacity: 1 }}>
      <g data-motion="z-ripple-mil" opacity="0">
        <ArrivalRipple r={32} tone="force"/>
      </g>
      <g data-motion="z-node-mil" opacity="0">
        <circle r="29" fill="none" stroke="var(--story-force)" strokeWidth="0.95" strokeOpacity="0.32" className="amb-breathe" aria-hidden="true"/>
        <NodeMedallion radius={26} tone="force" active>
          <ShieldChevron x={-12} y={-12} size={24} weight="regular"/>
        </NodeMedallion>
        <text x="-38" y="6" textAnchor="end">军事问题</text>
      </g>
    </g>

    <g transform={`translate(${g.org.x},${g.org.y})`} className={`process-node process-tone-organization ${phase >= 1 ? 'is-reached' : ''}`} style={{ opacity: 1 }}>
      <g data-motion="z-ripple-org" opacity="0">
        <ArrivalRipple r={32} tone="organization"/>
      </g>
      <g data-motion="z-node-org" opacity="0">
        <circle r="29" fill="none" stroke="var(--story-organization)" strokeWidth="0.95" strokeOpacity="0.32" className="amb-breathe" aria-hidden="true"/>
        <NodeMedallion radius={26} tone="organization" active>
          <TreeStructure x={-12} y={-12} size={24} weight="regular"/>
        </NodeMedallion>
        <text x="38" y="6" textAnchor="start">组织问题</text>
      </g>
    </g>

    <g transform="translate(950,404)">
      <g data-motion="z-focus-note" opacity="0">
        <text x="0" y="0" textAnchor="middle" className="process-node-note hero-sub-note">集中解决</text>
      </g>
    </g>

    {/* Beat 2: Cinnabar SealStamp cleanly above desktop subtitles (subtext baseline y=576 < 595) */}
    <g transform={`translate(${g.seal.x},${g.seal.y})`}>
      <g data-motion="z-seal-ripple" opacity="0">
        <ArrivalRipple r={38} tone="force"/>
      </g>
      <g data-motion="z-seal" className="process-outcome" opacity="0">
        <SealStamp text="独立自主解决问题" subtext="生死攸关的转折点" tone="force"/>
      </g>
    </g>
  </g>;
}

function animateZunyi(story, _projection, helpers) {
  const end = story?.duration || 21;
  const { add, show, pop, stamp, ripple, travel, trace } = helpers;
  const g = ZUNYI_GEOM;

  // Beat 0 (0-7s): Crisis pressure from left toward central pivot
  pop('z-pivot-date', 0.25);
  add('z-crisis-pos', [
    { at: 0, transform: `translate(${g.crisisStart.x}px,${g.crisisStart.y}px)` },
    { at: 7.35, transform: `translate(${g.crisisStart.x}px,${g.crisisStart.y}px)`, easing: DOC_EASE },
    { at: 8.35, transform: `translate(${g.crisisRetreat.x}px,${g.crisisRetreat.y}px)` },
    { at: end, transform: `translate(${g.crisisRetreat.x}px,${g.crisisRetreat.y}px)` },
  ]);
  add('z-crisis-body', [
    { at: 0, opacity: 1, transform: 'rotate(0deg) scale(1)' },
    { at: 7.35, opacity: 1, transform: 'rotate(0deg) scale(1)', easing: DOC_EASE },
    { at: 8.4, opacity: 0.36, transform: 'rotate(-11deg) scale(0.9)' },
    { at: end, opacity: 0.36, transform: 'rotate(-11deg) scale(0.9)' },
  ]);
  add('z-crisis-arcs', [
    { at: 0, opacity: 0 },
    { at: 0.35, opacity: 0, easing: DOC_EASE },
    { at: 1.15, opacity: 0.92 },
    { at: 7.15, opacity: 0.92, easing: DOC_EASE },
    { at: 8.05, opacity: 0.16 },
    { at: end, opacity: 0.16 },
  ]);
  show('z-crisis-pulse-0', 1.15, 6.25);
  travel('z-crisis-pulse-0', 'z-crisis-route-top', 1.15, 5.85);
  show('z-crisis-pulse-1', 1.85, 6.45);
  travel('z-crisis-pulse-1', 'z-crisis-route-bot', 1.85, 6.25);

  add('z-tense-ring', [
    { at: 0, opacity: 0.88, transform: 'scale(0.94)' },
    { at: 2.0, opacity: 0.56, transform: 'scale(1.07)' },
    { at: 4.0, opacity: 0.9, transform: 'scale(0.94)' },
    { at: 6.0, opacity: 0.58, transform: 'scale(1.06)' },
    { at: 7.3, opacity: 0.85, transform: 'scale(0.96)', easing: IMPACT_EASE },
    { at: 7.95, opacity: 0, transform: 'scale(1.22)' },
    { at: end, opacity: 0, transform: 'scale(1.22)' },
  ]);
  show('z-tense-core', 0, 7.8);

  // Beat 1 (7-14s): RejectSeal stamps, Starlight Compass ignites & fires beams
  stamp('z-reject-seal', 7.38);
  ripple('z-reject-ripple', 7.46, 1.4);

  add('z-compass-star', [
    { at: 0, opacity: 0, transform: 'rotate(-28deg) scale(0.54)' },
    { at: 7.75, opacity: 0, transform: 'rotate(-28deg) scale(0.54)', easing: IMPACT_EASE },
    { at: 8.45, opacity: 1, transform: 'rotate(3deg) scale(1.06)', easing: DOC_EASE },
    { at: 8.9, opacity: 1, transform: 'rotate(0deg) scale(1)' },
    { at: end, opacity: 1, transform: 'rotate(0deg) scale(1)' },
  ]);
  ripple('z-compass-ripple-0', 7.95, 1.65, { scaleTo: 2.25, peakOpacity: 0.88 });
  ripple('z-compass-ripple-1', 8.35, 1.75, { scaleTo: 2.55, peakOpacity: 0.72 });

  trace('z-guide-beam', 8.3, 10.65);
  show('z-guide-flow', 10.65);
  pop('z-guide-tip', 10.6, end + 1, { scaleFrom: 0.45, dy: 0 });
  show('z-guide-comet', 8.3, 10.9);
  travel('z-guide-comet', 'z-guide-route', 8.3, 10.65);
  pop('z-guide-node', 10.6);
  ripple('z-guide-ripple', 10.7, 1.4);

  trace('z-beam-mil', 8.5, 11.2);
  show('z-mil-flow', 11.2);
  pop('z-tip-mil', 11.15, end + 1, { scaleFrom: 0.45, dy: 0 });
  show('z-comet-mil', 8.5, 11.45);
  travel('z-comet-mil', 'z-route-mil', 8.5, 11.2);
  pop('z-node-mil', 11.15);
  ripple('z-ripple-mil', 11.25, 1.45);

  trace('z-beam-org', 8.75, 11.45);
  show('z-org-flow', 11.45);
  pop('z-tip-org', 11.4, end + 1, { scaleFrom: 0.45, dy: 0 });
  show('z-comet-org', 8.75, 11.7);
  travel('z-comet-org', 'z-route-org', 8.75, 11.45);
  pop('z-node-org', 11.4);
  ripple('z-ripple-org', 11.5, 1.45);

  pop('z-focus-note', 11.65);

  // Beat 2 (14-21s): Twin arcs converge downward into SealStamp
  trace('z-conv-mil', 14.15, 16.1);
  show('z-conv-mil-flow', 16.1);
  pop('z-conv-tip-mil', 16.05, end + 1, { scaleFrom: 0.45, dy: 0 });
  show('z-conv-comet-mil', 14.15, 16.35);
  travel('z-conv-comet-mil', 'z-conv-route-mil', 14.15, 16.1);

  trace('z-conv-org', 14.3, 16.25);
  show('z-conv-org-flow', 16.25);
  pop('z-conv-tip-org', 16.2, end + 1, { scaleFrom: 0.45, dy: 0 });
  show('z-conv-comet-org', 14.3, 16.5);
  travel('z-conv-comet-org', 'z-conv-route-org', 14.3, 16.25);

  stamp('z-seal', 16.25);
  ripple('z-seal-ripple', 16.35, 1.55);
}

/* ========================================================================== */
/* HERO 2: e-38 红军长征胜利会师 (1936)                                         */
/* ========================================================================== */

function buildRendezvousGeometry(story, projection) {
  const locs = story?.locations || [
    { place: '会宁县', label: '会宁', phase: 0 },
    { place: '西吉县', label: '将台堡地区', phase: 1 },
  ];
  const resolvePoint = (loc, fallback) => {
    const coords = PROCESS_PLACES[loc.place];
    if (typeof projection === 'function' && coords) {
      const pt = projection(coords);
      if (Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1])) {
        return { x: pt[0], y: pt[1], label: loc.label };
      }
    }
    return { x: fallback[0], y: fallback[1], label: loc.label };
  };

  const huining = resolvePoint(locs[0], [713.5, 472.4]);
  const jiangtaibao = resolvePoint(locs[1], [1186.5, 237.4]);

  // Approach vectors for 会宁 (Beat 0) — schematic convergence relations, not full Long March routes
  const h4Start = { x: clamp(huining.x - 82, 588, 675), y: clamp(huining.y + 74, 518, 552) };
  const h1Start = { x: clamp(huining.x + 98, 775, 865), y: clamp(huining.y - 116, 326, 390) };

  const h4Arc = curveData(h4Start, huining, { bend: 22, trimStart: 0, trimEnd: 24 });
  const h4March = curveData(h4Start, huining, { bend: 22, trimStart: 0, trimEnd: 46 });
  const h1Arc = curveData(h1Start, huining, { bend: 26, trimStart: 0, trimEnd: 24 });
  const h1March = curveData(h1Start, huining, { bend: 26, trimStart: 0, trimEnd: 46 });

  // Approach vectors for 将台堡地区 (Beat 1)
  const j2Start = { x: clamp(jiangtaibao.x - 36, 1080, 1210), y: clamp(jiangtaibao.y + 126, 330, 392) };
  const j1Start = { x: clamp(jiangtaibao.x - 144, 995, 1090), y: clamp(jiangtaibao.y + 10, 215, 290) };

  const j2Arc = curveData(j2Start, jiangtaibao, { bend: 22, trimStart: 0, trimEnd: 24 });
  const j2March = curveData(j2Start, jiangtaibao, { bend: 22, trimStart: 0, trimEnd: 48 });
  const j1Arc = curveData(j1Start, jiangtaibao, { bend: -20, trimStart: 0, trimEnd: 24 });
  const j1March = curveData(j1Start, jiangtaibao, { bend: -20, trimStart: 0, trimEnd: 48 });

  // Unified Beat 2 rally point and bold northward vector (北上抗日)
  const rally = {
    x: clamp((huining.x + jiangtaibao.x) / 2, 910, 990),
    y: clamp((huining.y + jiangtaibao.y) / 2 - 11, 320, 365),
  };
  const unifyLeft = curveData(huining, rally, { bend: 26, trimStart: 23, trimEnd: 20 });
  const unifyRight = curveData(jiangtaibao, rally, { bend: -28, trimStart: 23, trimEnd: 20 });
  const northTarget = { x: rally.x + 4, y: 166 };
  const northArc = curveData(rally, northTarget, { bend: -14, trimStart: 19, trimEnd: 0 });

  return {
    huining,
    jiangtaibao,
    h4Start,
    h1Start,
    h4Arc,
    h4March,
    h1Arc,
    h1March,
    j2Start,
    j1Start,
    j2Arc,
    j2March,
    j1Arc,
    j1March,
    rally,
    unifyLeft,
    unifyRight,
    northTarget,
    northArc,
  };
}

function RendezvousHeroGraphic({ story, projection, phase }) {
  const g = buildRendezvousGeometry(story, projection);

  // Label coordinates tuned for zero overlap on both desktop and mobile (viewBox 540..1380)
  const h4Label = { x: clamp(g.h4Start.x - 6, 610, 668), y: clamp(g.h4Start.y + 28, 558, 576) };
  const h1Label = { x: g.h1Start.x, y: g.h1Start.y - 16 };
  const j2Label = { x: g.j2Start.x + 2, y: g.j2Start.y + 28 };
  const j1Label = { x: g.j1Start.x, y: g.j1Start.y - 34 };
  const northLabel = { x: g.rally.x - 38, y: 224 };

  const huiningLabelFlipRight = g.huining.x < 650;
  const jiangLabelFlipLeft = g.jiangtaibao.x > 1240;

  return <g className="process-graphic process-rendezvous hero-scene hero-rendezvous">
    {/* Explicit historical disclaimer cleanly visible at top (y = 122) */}
    <text x="950" y="122" textAnchor="middle" className="process-diagram-note">
      {story?.relation || '会师关系示意 · 非长征全程路线'}
    </text>

    {/* Beat 0: 会宁 rendezvous approach vectors (红四方面军 & 红一方面军) */}
    <g className="hero-rendezvous-group">
      <path className="process-edge-context curve-track" d={g.h4Arc.d}/>
      <path d={g.h4March.d} data-route="r-march-0-0" fill="none" stroke="none"/>
      <path data-motion="r-arc-0-0" className="process-edge curve-edge curve-edge-force" d={g.h4Arc.d} opacity="0"/>
      <ArrivalTip id="r-tip-0-0" x={g.h4Arc.ex} y={g.h4Arc.ey} angle={g.h4Arc.endAngle} tone="force"/>
      <g data-motion="r-unit-0-0" className="army-relation" opacity="0">
        <g data-motion="r-unit-0-0-heading"><Formation size={0.56}/></g>
      </g>
      <g transform={`translate(${h4Label.x.toFixed(1)},${h4Label.y.toFixed(1)})`}>
        <g data-motion="r-label-0-0" opacity="0">
          <text x="0" y="0" textAnchor="middle" className="hero-army-label">红四方面军</text>
        </g>
      </g>

      <path className="process-edge-context curve-track" d={g.h1Arc.d}/>
      <path d={g.h1March.d} data-route="r-march-0-1" fill="none" stroke="none"/>
      <path data-motion="r-arc-0-1" className="process-edge curve-edge curve-edge-force" d={g.h1Arc.d} opacity="0"/>
      <ArrivalTip id="r-tip-0-1" x={g.h1Arc.ex} y={g.h1Arc.ey} angle={g.h1Arc.endAngle} tone="force"/>
      <g data-motion="r-unit-0-1" className="army-relation" opacity="0">
        <g data-motion="r-unit-0-1-heading"><Formation size={0.56}/></g>
      </g>
      <g transform={`translate(${h1Label.x.toFixed(1)},${h1Label.y.toFixed(1)})`}>
        <g data-motion="r-label-0-1" opacity="0">
          <text x="0" y="0" textAnchor="middle" className="hero-army-label">红一方面军</text>
        </g>
      </g>
    </g>

    {/* Beat 1: 将台堡地区 rendezvous approach vectors (红二方面军 & 红一方面军) */}
    <g className="hero-rendezvous-group">
      <path className="process-edge-context curve-track" d={g.j2Arc.d}/>
      <path d={g.j2March.d} data-route="r-march-1-0" fill="none" stroke="none"/>
      <path data-motion="r-arc-1-0" className="process-edge curve-edge curve-edge-force" d={g.j2Arc.d} opacity="0"/>
      <ArrivalTip id="r-tip-1-0" x={g.j2Arc.ex} y={g.j2Arc.ey} angle={g.j2Arc.endAngle} tone="force"/>
      <g data-motion="r-unit-1-0" className="army-relation" opacity="0">
        <g data-motion="r-unit-1-0-heading"><Formation size={0.56}/></g>
      </g>
      <g transform={`translate(${j2Label.x.toFixed(1)},${j2Label.y.toFixed(1)})`}>
        <g data-motion="r-label-1-0" opacity="0">
          <text x="0" y="0" textAnchor="middle" className="hero-army-label">红二方面军</text>
        </g>
      </g>

      <path className="process-edge-context curve-track" d={g.j1Arc.d}/>
      <path d={g.j1March.d} data-route="r-march-1-1" fill="none" stroke="none"/>
      <path data-motion="r-arc-1-1" className="process-edge curve-edge curve-edge-force" d={g.j1Arc.d} opacity="0"/>
      <ArrivalTip id="r-tip-1-1" x={g.j1Arc.ex} y={g.j1Arc.ey} angle={g.j1Arc.endAngle} tone="force"/>
      <g data-motion="r-unit-1-1" className="army-relation" opacity="0">
        <g data-motion="r-unit-1-1-heading"><Formation size={0.56}/></g>
      </g>
      <g transform={`translate(${j1Label.x.toFixed(1)},${j1Label.y.toFixed(1)})`}>
        <g data-motion="r-label-1-1" opacity="0">
          <text x="0" y="0" textAnchor="middle" className="hero-army-label">红一方面军</text>
        </g>
      </g>
    </g>

    {/* Beat 2: Unification bridge & bold vermilion northward vector (北上抗日) */}
    <path data-motion="r-unify-left" className="hero-unify-bridge" d={g.unifyLeft.d} opacity="0"/>
    <g data-motion="r-unify-flow-l" opacity="0" aria-hidden="true">
      <path className="amb-flow-dash amb-flow-dash-force" d={g.unifyLeft.d} fill="none"/>
    </g>
    <path data-motion="r-unify-right" className="hero-unify-bridge" d={g.unifyRight.d} opacity="0"/>
    <g data-motion="r-unify-flow-r" opacity="0" aria-hidden="true">
      <path className="amb-flow-dash amb-flow-dash-force" d={g.unifyRight.d} fill="none"/>
    </g>
    <g transform={`translate(${g.rally.x.toFixed(1)},${g.rally.y.toFixed(1)})`}>
      <g data-motion="r-unify-node" opacity="0">
        <circle r="18" fill="none" stroke="var(--story-force)" strokeWidth="1.1" className="amb-ripple-loop" aria-hidden="true"/>
        <NodeMedallion radius={16} tone="force" active>
          <g className="amb-breathe">
            <HeroEmblem name="compass-star" size={18} tone="force"/>
          </g>
        </NodeMedallion>
      </g>
    </g>

    <path data-motion="r-north-band" className="hero-north-band" d={g.northArc.d} opacity="0"/>
    <path
      data-motion="r-north-vector"
      data-route="r-north-route"
      className="hero-north-vector"
      d={g.northArc.d}
      opacity="0"
    />
    <g data-motion="r-north-flow" opacity="0" aria-hidden="true">
      <path className="amb-flow-dash amb-flow-dash-gold" d={g.northArc.d} fill="none"/>
    </g>
    <ArrivalTip id="r-north-tip" x={g.northArc.ex} y={g.northArc.ey} angle={g.northArc.endAngle} tone="force" size={1.55}/>
    <g data-motion="r-north-comet" opacity="0">
      <CometHead tone="force" r={5.4}/>
    </g>
    <g transform={`translate(${g.northTarget.x.toFixed(1)},${g.northTarget.y.toFixed(1)})`}>
      <g data-motion="r-north-ripple" opacity="0">
        <ArrivalRipple r={24} tone="force"/>
      </g>
    </g>
    <g transform={`translate(${northLabel.x.toFixed(1)},${northLabel.y.toFixed(1)})`}>
      <g data-motion="r-north-label" opacity="0">
        <text x="0" y="0" textAnchor="end" className="hero-north-label">北上抗日</text>
      </g>
    </g>

    {/* Projected Location Node 0: 会宁 (1936.10.9) */}
    <g
      transform={`translate(${g.huining.x.toFixed(1)},${g.huining.y.toFixed(1)})`}
      className={`process-node process-tone-force ${phase >= 0 ? 'is-reached' : ''} ${phase === 0 ? 'is-current' : ''}`}
      style={{ opacity: 1 }}
    >
      <g data-motion="r-ripple-0" opacity="0">
        <ArrivalRipple r={26} tone="force"/>
      </g>
      <g data-motion="r-loc-0">
        <circle r="21" fill="none" stroke="var(--story-force)" strokeWidth="0.95" strokeOpacity="0.38" className="amb-breathe" aria-hidden="true"/>
        <NodeMedallion radius={19} tone="force" active={phase === 0}>
          <HeroEmblem name="mountain-peaks" size={22} tone="force"/>
        </NodeMedallion>
        <text x={huiningLabelFlipRight ? 26 : -26} y="-12" textAnchor={huiningLabelFlipRight ? 'start' : 'end'}>
          {g.huining.label}
        </text>
        <text x={huiningLabelFlipRight ? 26 : -26} y="15" textAnchor={huiningLabelFlipRight ? 'start' : 'end'} className="process-node-note hero-sub-note">
          1936.10.9
        </text>
      </g>
    </g>

    {/* Projected Location Node 1: 将台堡地区 (10.22) */}
    <g
      transform={`translate(${g.jiangtaibao.x.toFixed(1)},${g.jiangtaibao.y.toFixed(1)})`}
      className={`process-node process-tone-force ${phase >= 1 ? 'is-reached' : ''} ${phase === 1 ? 'is-current' : ''}`}
      style={{ opacity: 1 }}
    >
      <g data-motion="r-ripple-1" opacity="0">
        <ArrivalRipple r={26} tone="force"/>
      </g>
      <g data-motion="r-loc-1" opacity="0">
        <circle r="21" fill="none" stroke="var(--story-force)" strokeWidth="0.95" strokeOpacity="0.38" className="amb-breathe" aria-hidden="true"/>
        <NodeMedallion radius={19} tone="force" active={phase === 1}>
          <HeroEmblem name="mountain-peaks" size={22} tone="force"/>
        </NodeMedallion>
        <text x={jiangLabelFlipLeft ? -26 : 26} y="-10" textAnchor={jiangLabelFlipLeft ? 'end' : 'start'}>
          {g.jiangtaibao.label}
        </text>
        <text x={jiangLabelFlipLeft ? -26 : 26} y="18" textAnchor={jiangLabelFlipLeft ? 'end' : 'start'} className="process-node-note hero-sub-note">
          10.22
        </text>
      </g>
    </g>

    {/* Beat 2: Victory Cinnabar SealStamp cleanly above desktop subtitles (subtext baseline y=576 < 595) */}
    <g transform="translate(950,524)">
      <g data-motion="r-seal-ripple" opacity="0">
        <ArrivalRipple r={38} tone="force"/>
      </g>
      <g data-motion="r-seal" className="process-outcome" opacity="0">
        <SealStamp text="三大主力会师 · 长征胜利结束" subtext="转危为安 · 北上抗日" tone="force"/>
      </g>
    </g>
  </g>;
}

function animateRendezvousHero(story, _projection, helpers) {
  const end = story?.duration || 21;
  const { show, pop, stamp, ripple, travel, trace } = helpers;

  // Beat 0 (0-7s): 红四方面军 & 红一方面军 converge onto 会宁
  show('r-loc-0', 0);
  trace('r-arc-0-0', 0.45, 4.75);
  pop('r-tip-0-0', 4.7, end + 1, { scaleFrom: 0.45, dy: 0 });
  show('r-unit-0-0', 0.45);
  travel('r-unit-0-0', 'r-march-0-0', 0.45, 4.75);
  pop('r-label-0-0', 0.65);

  trace('r-arc-0-1', 0.75, 5.05);
  pop('r-tip-0-1', 5.0, end + 1, { scaleFrom: 0.45, dy: 0 });
  show('r-unit-0-1', 0.75);
  travel('r-unit-0-1', 'r-march-0-1', 0.75, 5.05);
  pop('r-label-0-1', 0.95);

  ripple('r-ripple-0', 5.05, 1.6);

  // Beat 1 (7-14s): 红二方面军 & 红一方面军 converge onto 将台堡地区
  pop('r-loc-1', 7.1, end + 1, { scaleFrom: 0.85, dy: 4 });
  trace('r-arc-1-0', 7.45, 11.45);
  pop('r-tip-1-0', 11.4, end + 1, { scaleFrom: 0.45, dy: 0 });
  show('r-unit-1-0', 7.45);
  travel('r-unit-1-0', 'r-march-1-0', 7.45, 11.45);
  pop('r-label-1-0', 7.65);

  trace('r-arc-1-1', 7.75, 11.75);
  pop('r-tip-1-1', 11.7, end + 1, { scaleFrom: 0.45, dy: 0 });
  show('r-unit-1-1', 7.75);
  travel('r-unit-1-1', 'r-march-1-1', 7.75, 11.75);
  pop('r-label-1-1', 7.95);

  ripple('r-ripple-1', 11.75, 1.6);

  // Beat 2 (14-21s): Unified bold vermilion northward vector (北上抗日) & Victory SealStamp
  trace('r-unify-left', 14.1, 15.1);
  show('r-unify-flow-l', 15.1);
  trace('r-unify-right', 14.2, 15.2);
  show('r-unify-flow-r', 15.2);
  pop('r-unify-node', 15.0, end + 1, { scaleFrom: 0.6, dy: 0 });

  trace('r-north-band', 15.1, 17.15);
  trace('r-north-vector', 15.1, 17.15);
  show('r-north-flow', 17.15);
  pop('r-north-tip', 17.1, end + 1, { scaleFrom: 0.5, dy: 0 });
  show('r-north-comet', 15.1, 17.45);
  travel('r-north-comet', 'r-north-route', 15.1, 17.15);
  ripple('r-north-ripple', 17.15, 1.45);
  pop('r-north-label', 15.65);

  stamp('r-seal', 16.6);
  ripple('r-seal-ripple', 16.7, 1.55);
}

/* ========================================================================== */
/* HERO 3: e-47 新中国成立 (1949)                                              */
/* ========================================================================== */

const FOUNDING_GEOM = (() => {
  const center = { x: 950, y: 355 };
  const seal = { x: 950, y: 526 };
  const prepNodes = [
    { id: 'f-prep-0', label: '人民政协', x: 736, y: 250, bend: 30 },
    { id: 'f-prep-1', label: '共同纲领', x: 950, y: 232, bend: 0 },
    { id: 'f-prep-2', label: '全国人民', x: 1164, y: 250, bend: -30 },
  ];
  const streams = prepNodes.map((n) => curveData(n, center, { bend: n.bend, trimStart: 31, trimEnd: 46 }));

  // 12 local-space circular sunburst rays centered at (0,0) (offset 15 deg so zero rays are flat H/V)
  // Circular envelope (rOut <= 138) stays safely clear of header (y=146) and SealStamp (y=502) throughout 360-deg rotation.
  const rayAngles = [15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345];
  const rays = rayAngles.map((deg, idx) => {
    const rad = (deg * Math.PI) / 180;
    const primary = idx % 2 === 0;
    const rIn = 48;
    const rOut = primary ? 138 : 108;
    const x0 = Math.cos(rad) * rIn;
    const y0 = Math.sin(rad) * rIn;
    const x1 = Math.cos(rad) * rOut;
    const y1 = Math.sin(rad) * rOut;
    return {
      idx,
      deg,
      primary,
      d: `M${x0.toFixed(1)},${y0.toFixed(1)} L${x1.toFixed(1)},${y1.toFixed(1)}`,
      x1,
      y1,
    };
  });

  const sealLink = curveData({ x: 950, y: 438 }, { x: 950, y: 496 }, { bend: -6, trimStart: 0, trimEnd: 0 });
  return { center, seal, prepNodes, streams, rays, sealLink };
})();

function FoundingGraphic({ story, phase }) {
  const g = FOUNDING_GEOM;
  const prepIcons = [
    <Bank key="bank" x={-12} y={-12} size={24} weight="regular"/>,
    <Scroll key="scroll" x={-12} y={-12} size={24} weight="regular"/>,
    <UsersThree key="users" x={-12} y={-12} size={24} weight="regular"/>,
  ];

  return <g className="process-graphic hero-scene hero-founding">
    {/* Top header & subtle anchor note — completely clear of bottom subtitle */}
    <text x="950" y="118" textAnchor="middle" className="process-diagram-note">
      {story?.relation || '建国准备与成立'}
    </text>
    <text x="950" y="146" textAnchor="middle" className="process-node-note hero-anchor-text">
      北京 · 开国大典
    </text>

    {/* Beat 1: Background radiant sunburst rays & settled liberation aura rings */}
    <g className="hero-sunburst-layer" aria-hidden="true">
      <g transform={`translate(${g.center.x},${g.center.y})`}>
        <g data-motion="f-aura-0" opacity="0">
          <g className="amb-breathe">
            <circle className="hero-sunburst-aura" r="76" strokeDasharray="4 5"/>
          </g>
        </g>
        <g data-motion="f-aura-1" opacity="0">
          <g className="amb-breathe">
            <circle className="hero-sunburst-aura hero-sunburst-aura-outer" r="114"/>
          </g>
        </g>
        <g data-motion="f-wave-0" opacity="0">
          <ArrivalRipple r={42} tone="force"/>
        </g>
        <g data-motion="f-wave-1" opacity="0">
          <ArrivalRipple r={46} tone="force" className="hero-ripple-gold"/>
        </g>
        <g data-motion="f-wave-2" opacity="0">
          <ArrivalRipple r={50} tone="force"/>
        </g>

        <g className="amb-sunburst-spin">
          {g.rays.map((ray) => <g key={ray.idx}>
            <path
              data-motion={`f-ray-${ray.idx}`}
              className={ray.primary ? 'hero-sunburst-ray' : 'hero-sunburst-ray hero-sunburst-ray-sub'}
              d={ray.d}
              opacity="0"
            />
            {ray.primary && <g transform={`translate(${ray.x1.toFixed(1)},${ray.y1.toFixed(1)})`}>
              <g data-motion={`f-ray-tip-${ray.idx}`} opacity="0">
                <path d={fourPointStar(4.6, 1.5, 0)} fill="var(--hero-gold, var(--motion-sector-2))"/>
              </g>
            </g>}
          </g>)}
        </g>
      </g>
    </g>

    {/* Beat 0: Three converging streams into central Beijing monument */}
    {g.streams.map((stream, i) => <g key={i}>
      <path className="process-edge-context curve-track" d={stream.d}/>
      <path
        data-motion={`f-stream-${i}`}
        data-route={`f-route-${i}`}
        className="process-edge curve-edge"
        d={stream.d}
        opacity="0"
      />
      <g data-motion={`f-stream-flow-${i}`} opacity="0" aria-hidden="true">
        <path className="amb-flow-dash amb-flow-dash-org" d={stream.d} fill="none"/>
      </g>
      <ArrivalTip id={`f-tip-${i}`} x={stream.ex} y={stream.ey} angle={stream.endAngle} tone="organization"/>
      <g data-motion={`f-comet-${i}`} opacity="0">
        <CometHead tone="force" r={4.4}/>
      </g>
    </g>)}

    {/* Beat 0: Three archival preparation medallions arranged in a balanced arc */}
    {g.prepNodes.map((n, i) => <g
      key={n.id}
      transform={`translate(${n.x},${n.y})`}
      className={`process-node process-tone-organization ${phase >= 0 ? 'is-reached' : ''}`}
      style={{ opacity: 1 }}
    >
      <g data-motion={n.id} opacity="0">
        <NodeMedallion radius={26} tone="organization">
          {prepIcons[i]}
        </NodeMedallion>
        <text x="0" y="-42" textAnchor="middle">{n.label}</text>
      </g>
    </g>)}

    {/* Central Beijing Monument Medallion at (950, 355) */}
    <g transform={`translate(${g.center.x},${g.center.y})`}>
      <g data-motion="f-prep-ripple" opacity="0">
        <ArrivalRipple r={42} tone="force"/>
      </g>
      <g data-motion="f-monument-crown" opacity="0">
        <circle r="46" fill="none" stroke="var(--hero-gold, var(--motion-sector-2))" strokeWidth="1.15" className="amb-ripple-loop" aria-hidden="true"/>
        <g className="amb-breathe">
          <circle r="46" fill="none" stroke="var(--hero-gold, var(--motion-sector-2))" strokeWidth="1.2" strokeDasharray="3 4" strokeOpacity="0.85"/>
        </g>
      </g>
      <g data-motion="f-monument" className="hero-monument" opacity="0">
        <circle className="hero-monument-outer" r="38" fill="var(--ui-bg)" stroke="var(--story-force)" strokeWidth="2"/>
        <circle className="hero-monument-inner" r="31.5" fill="var(--story-force)" fillOpacity="0.1" stroke="var(--hero-gold, var(--motion-sector-2))" strokeWidth="1.05" strokeOpacity="0.8"/>
        {/* Bespoke Tiananmen ceremonial rostrum silhouette */}
        <g className="hero-monument-crest amb-breathe">
          <HeroEmblem name="rostrum" size={44} tone="force"/>
        </g>
      </g>
    </g>

    <g transform="translate(950,424)">
      <g data-motion="f-monument-date" opacity="0">
        <text x="0" y="0" textAnchor="middle" className="process-node-note hero-sub-note">1949.10.1 · 北京</text>
      </g>
    </g>

    {/* Beat 2: Ceremony link & Grand double-ruled cinnabar SealStamp at y = 526 */}
    <path data-motion="f-seal-link" className="process-edge curve-edge curve-edge-force" d={g.sealLink.d} opacity="0"/>
    <g data-motion="f-seal-flow" opacity="0" aria-hidden="true">
      <path className="amb-flow-dash amb-flow-dash-gold" d={g.sealLink.d} fill="none"/>
    </g>
    <ArrivalTip id="f-seal-tip" x={g.sealLink.ex} y={g.sealLink.ey} angle={g.sealLink.endAngle} tone="force"/>

    <g transform={`translate(${g.seal.x},${g.seal.y})`}>
      <g data-motion="f-grand-wings" className="hero-grand-wings" opacity="0">
        <path d="M-206,-4 H-156 M-194,4 H-156 M156,-4 H206 M156,4 H194" fill="none" stroke="var(--hero-gold, var(--motion-sector-2))" strokeWidth="1.4" strokeLinecap="round"/>
        <path d={fourPointStar(4.4, 1.5, 0)} transform="translate(-214,0)" fill="var(--hero-gold, var(--motion-sector-2))"/>
        <path d={fourPointStar(4.4, 1.5, 0)} transform="translate(214,0)" fill="var(--hero-gold, var(--motion-sector-2))"/>
      </g>
      <g data-motion="f-seal-ripple" opacity="0">
        <ArrivalRipple r={40} tone="force"/>
      </g>
      <g data-motion="f-seal" className="process-outcome" opacity="0">
        <SealStamp text="中华人民共和国成立" subtext="民族独立 · 人民解放 · 开启新纪元" tone="force"/>
      </g>
    </g>
  </g>;
}

function animateFounding(story, _projection, helpers) {
  const end = story?.duration || 21;
  const { show, pop, stamp, ripple, travel, trace } = helpers;
  const g = FOUNDING_GEOM;

  // Beat 0 (0-7s): Three archival medallions stream into Beijing monument
  g.prepNodes.forEach((n, i) => {
    pop(n.id, 0.25 + i * 0.35);
    const from = 1.45 + i * 0.28;
    const to = 4.65 + i * 0.22;
    trace(`f-stream-${i}`, from, to);
    show(`f-stream-flow-${i}`, to);
    pop(`f-tip-${i}`, to - 0.05, end + 1, { scaleFrom: 0.45, dy: 0 });
    show(`f-comet-${i}`, from, to + 0.3);
    travel(`f-comet-${i}`, `f-route-${i}`, from, to);
  });

  pop('f-monument', 4.75, end + 1, { scaleFrom: 0.76, dy: 4 });
  pop('f-monument-date', 5.1);
  ripple('f-prep-ripple', 4.9, 1.5);

  // Beat 1 (7-14s): Sunburst rays & triple concentric shockwave ripples sweep nationwide
  pop('f-monument-crown', 7.15, end + 1, { scaleFrom: 0.65, dy: 0 });
  g.rays.forEach((ray) => {
    const stagger = (ray.idx % 6) * 0.14;
    const from = 7.25 + stagger;
    const to = 10.45 + stagger;
    trace(`f-ray-${ray.idx}`, from, to);
    if (ray.primary) {
      pop(`f-ray-tip-${ray.idx}`, to - 0.05, end + 1, { scaleFrom: 0.3, dy: 0 });
    }
  });

  ripple('f-wave-0', 7.25, 2.5, { scaleFrom: 0.52, scalePeak: 0.9, scaleTo: 3.05, peakOpacity: 0.88 });
  ripple('f-wave-1', 8.15, 2.6, { scaleFrom: 0.52, scalePeak: 0.92, scaleTo: 3.3, peakOpacity: 0.82 });
  ripple('f-wave-2', 9.15, 2.7, { scaleFrom: 0.52, scalePeak: 0.95, scaleTo: 3.55, peakOpacity: 0.78 });

  pop('f-aura-0', 8.35, end + 1, { scaleFrom: 0.65, dy: 0 });
  pop('f-aura-1', 9.25, end + 1, { scaleFrom: 0.65, dy: 0 });

  // Beat 2 (14-21s): Grand cinnabar SealStamp at y = 526
  trace('f-seal-link', 14.1, 15.1);
  show('f-seal-flow', 15.1);
  pop('f-seal-tip', 15.05, end + 1, { scaleFrom: 0.45, dy: 0 });
  stamp('f-seal', 15.15);
  ripple('f-seal-ripple', 15.25, 1.65);
  pop('f-grand-wings', 15.5, end + 1, { scaleFrom: 0.82, dy: 0 });
}

export const TURNING_HEROES = {
  'e-36': {
    Graphic: ZunyiGraphic,
    animate: animateZunyi,
  },
  'e-38': {
    Graphic: RendezvousHeroGraphic,
    animate: animateRendezvousHero,
  },
  'e-47': {
    Graphic: FoundingGraphic,
    animate: animateFounding,
  },
};
