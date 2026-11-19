import { useEffect, useMemo, useRef } from 'react';
import { FileText } from '@phosphor-icons/react';
import { STORY_PLACES, beatAt } from './stories.js';
import { storyTimeFor } from './volumes.js';
import { ProcessGraphic, processLayout, animateProcess } from './ProcessGraphic.jsx';
import { EARLY_HEROES } from './heroes/EarlyHeroes.jsx';
import { TURNING_HEROES } from './heroes/TurningHeroes.jsx';
import { PRC_HEROES } from './heroes/PrcHeroes.jsx';
import { Formation, Person, StoryGlyph } from './StorySymbols.jsx';
import { motionClock } from './motion-clock.js';

const HERO_SCENES = { ...EARLY_HEROES, ...TURNING_HEROES, ...PRC_HEROES };

const DOC_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const IMPACT_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const EXIT_EASE = 'cubic-bezier(0.4, 0, 1, 1)';
const WAVE_EASE = 'cubic-bezier(0.42, 0, 0.58, 1)';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function quadThrough(a, mid, b) {
  const cx = 2 * mid[0] - 0.5 * (a[0] + b[0]);
  const cy = 2 * mid[1] - 0.5 * (a[1] + b[1]);
  return `M${a[0].toFixed(1)},${a[1].toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)}`;
}

function quadArc(a, b, bend = 0) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const mx = (a[0] + b[0]) / 2 - (dy / len) * bend;
  const my = (a[1] + b[1]) / 2 + (dx / len) * bend;
  return `M${a[0].toFixed(1)},${a[1].toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)}`;
}

function parseCubicBezier(easing) {
  if (!easing || easing === 'linear') return null;
  if (easing === 'ease-out') return [0, 0, 0.58, 1];
  if (easing === 'ease-in-out') return [0.42, 0, 0.58, 1];
  if (easing === 'ease-in') return [0.42, 0, 1, 1];
  const match = String(easing).match(
    /cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/i,
  );
  return match ? match.slice(1, 5).map(Number) : null;
}

function bezierCoord(t, p1, p2) {
  const u = 1 - t;
  return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t;
}

function baseTransformCss(target) {
  const raw = target.getAttribute('transform');
  if (!raw) return '';
  return `${raw
    .replace(
      /translate\(\s*([-\d.eE]+)(?:[\s,]+([-\d.eE]+))?\s*\)/g,
      (_, x, y = '0') => `translate(${x}px,${y}px)`,
    )
    .replace(
      /rotate\(\s*([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)\s*\)/g,
      (_, a, cx, cy) => `translate(${cx}px,${cy}px) rotate(${a}deg) translate(${-Number(cx)}px,${-Number(cy)}px)`,
    )
    .replace(/rotate\(\s*([-\d.eE]+)\s*\)/g, (_, a) => `rotate(${a}deg)`)
    .trim()} `;
}

function Place({ id, point, active = false, children }) {
  const place = STORY_PLACES[id];
  return <g className={`story-place ${active ? 'story-place-active' : ''}`} transform={`translate(${point[0]},${point[1]})`}>
    <circle className="story-location-ring" r={active ? 11 : 6}/>
    <circle className="story-location-center" r="2.4"/>
    <text x={place.dx} y={place.dy} textAnchor={place.anchor || 'start'}>{place.name}</text>
    {children}
  </g>;
}

function Unit({ id, label, status, glow = false }) {
  return <g data-motion={id} className="route-unit" opacity="0">
    <g data-motion={`${id}-heading`}>
      <Formation size={0.78}/>
      {glow && <circle className="comet-head comet-head-force" cx="24" cy="0" r="4.6" filter="url(#map-glow-force)"/>}
    </g>
    {label && <text x="0" y="32" textAnchor="middle">{label}</text>}
    {status && <text x="0" y="-24" textAnchor="middle" className="unit-status">{status}</text>}
  </g>;
}

function RippleRing({ id, x, y, r = 20, inner = 12, className = '' }) {
  return <g transform={`translate(${x},${y})`} aria-hidden="true">
    <g data-motion={id} className={`arrival-ripple ${className}`.trim()} opacity="0">
      <circle r={r} fill="none"/>
      <circle r={inner} fill="none" opacity="0.65"/>
    </g>
  </g>;
}

function CometTip({ id, tone = 'force' }) {
  return <g data-motion={id} className={`comet-head ${tone === 'force' ? 'comet-head-force' : ''}`.trim()} opacity="0" aria-hidden="true">
    <circle r="4.4" filter={tone === 'org' ? 'url(#map-glow-org)' : 'url(#map-glow-force)'}/>
  </g>;
}

function Autumn({ points, phase, prefix, concealFuture }) {
  const plans = [
    ['first', ['xiushui', 'pingjiang', 'changsha'], '第1团'],
    ['third', ['tonggu', 'liuyang', 'changsha'], '第3团'],
    ['second', ['anyuan', 'liling', 'changsha'], '第2团'],
  ];
  const southMid = [points.sanwan[0] - 24, (points.wenjiashi[1] + points.sanwan[1]) / 2];
  const southPath = quadThrough(points.wenjiashi, southMid, points.sanwan);
  const ruralY = (points.wenjiashi[1] + points.sanwan[1]) / 2;
  return <>
    <defs><marker id={`${prefix}-plan-tip`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9" className="plan-arrowhead"/></marker></defs>
    <text x="760" y="108" textAnchor="middle" className="diagram-note">行动方向示意 · 编队符号不表示实际人数</text>
    <g data-motion="plan-group" className="plan-routes">
      {plans.map(([id, path, label]) => {
        const d = quadThrough(points[path[0]], points[path[1]], points[path[2]]);
        return <g key={id}>
          <path data-route={id} d={d} markerEnd={`url(#${prefix}-plan-tip)`}/>
          <path className="planned-corridor" d={d}/>
          <Unit id={`unit-${id}`} label={label} status={phase === 1 ? '受挫' : undefined}/>
        </g>;
      })}
      <text className="plan-caption" x={points.changsha[0] - 15} y={points.changsha[1] + 26} textAnchor="end">原定目标</text>
    </g>
    <RippleRing id="blocked-ripple" x={points.changsha[0]} y={points.changsha[1]} r={20} inner={12}/>
    <g className="blocked-target" transform={`translate(${points.changsha[0]},${points.changsha[1]})`}>
      <g data-motion="blocked" className="reject-seal" opacity="0">
        <circle r="17"/>
        <circle r="13" fill="none" strokeWidth="0.9" strokeOpacity="0.45"/>
        <path d="M-6.5,-6.5 L6.5,6.5 M6.5,-6.5 L-6.5,6.5"/>
      </g>
      <g data-motion="blocked-caption" opacity="0">
        <text x="-18" y="52" textAnchor="end">进攻受挫</text>
      </g>
    </g>
    {['changsha', 'xiushui', 'pingjiang', 'tonggu', 'liuyang', 'anyuan', 'liling', 'wenjiashi', 'sanwan']
      .filter((id) => !concealFuture || id !== 'sanwan')
      .map((id) => (
        <Place
          key={id}
          id={id}
          point={points[id]}
          active={(id === 'wenjiashi' && phase >= 2 && phase < 4) || (id === 'sanwan' && phase >= 4)}
        />
      ))}
    <RippleRing id="wenjiashi-ripple" x={points.wenjiashi[0]} y={points.wenjiashi[1]} r={22} inner={13}/>
    <RippleRing id="wenjiashi-rally-ripple" x={points.wenjiashi[0]} y={points.wenjiashi[1]} r={28} inner={17}/>
    <g data-motion="rally" className="rally-symbols" opacity="0">
      <g transform={`translate(${points.wenjiashi[0]},${points.wenjiashi[1]})`}>
        <circle r="27" className="rally-target"/>
        <g data-motion="rally-caption" opacity="0"><text x="46" y="44">余部会合</text></g>
      </g>
      {[0, 1, 2].map((i) => <g key={i} data-motion={`rally-${i}`} className="rally-formation"><Formation size={0.4}/></g>)}
    </g>
    {!concealFuture && <path d={southPath} className="south-route-ghost"/>}
    <path data-motion="south-band" d={southPath} className="south-route-band" opacity="0"/>
    <path data-motion="south-route" data-route="south" d={southPath} className="south-route" opacity="0"/>
    <Unit id="unit-south" glow/>
    <g transform={`translate(${points.sanwan[0] + 48},${ruralY + 16})`}>
      <g data-motion="rural-direction" className="rural-direction" opacity="0">
        <text x="0" y="-8">转向农村山区</text>
        <text className="direction-secondary" x="0" y="20">沿罗霄山脉南移</text>
      </g>
    </g>
    <RippleRing id="sanwan-ripple" x={points.sanwan[0]} y={points.sanwan[1]} r={20} inner={12}/>
    <g transform={`translate(${points.sanwan[0]},${points.sanwan[1]})`}>
      <g data-motion="sanwan-arrival" className="arrival-mark" opacity="0">
        <circle r="17"/>
        <text x="18" y="38">9月29日 · 三湾改编</text>
      </g>
    </g>
  </>;
}

function Organization({ points }) {
  const companies = [815, 960, 1105];
  const army = Array.from({ length: 12 }, (_, i) => ({ x: 793 + (i % 6) * 60, y: 250 + Math.floor(i / 6) * 57 }));
  const marchPath = quadArc(points.sanwan, points.jinggangshan, 18);
  const orgConnector = (x) => (x === 960 ? 'M960,260 L960,363' : `M960,260 C960,295 ${x},290 ${x},363`);
  return <>
    <Place id="sanwan" point={points.sanwan} active/>
    <Place id="jinggangshan" point={points.jinggangshan}/>
    <g data-motion="army-before" className="army-before">
      <text x="960" y="185" textAnchor="middle">整编队伍</text>
      {army.map((_, i) => <g key={i} data-motion={`soldier-${i}`} className="organization-formation"><Formation size={0.4}/></g>)}
      <RippleRing id="regiment-ripple" x={960} y={282} r={44} inner={30} className="arrival-ripple-org"/>
      <g transform="translate(960,282)">
        <g data-motion="regiment-result" className="regiment-result node-medallion" opacity="0">
          <circle r="46" className="node-medallion-outer"/>
          <circle r="40" className="regiment-circle"/>
          <text x="0" y="5" textAnchor="middle">一个团</text>
        </g>
      </g>
    </g>
    <g data-motion="organization-diagram" className="organization-diagram" opacity="0">
      <text x="960" y="188" textAnchor="middle" className="diagram-heading">把党的组织建到基层</text>
      {companies.map((x, i) => <g key={x}>
        <path d={orgConnector(x)} className="curve-track"/>
        <path data-motion={`organization-link-${i}`} d={orgConnector(x)} className="organization-link"/>
        <g className="node-medallion">
          <circle cx={x} cy="389" r="30" className="node-medallion-outer"/>
          <circle cx={x} cy="389" r="26" className="company-circle"/>
        </g>
        <text x={x} y="395" textAnchor="middle">连队</text>
        {[-1, 0, 1].map((j) => <g key={j} transform={`translate(${x + j * 22},439)`} className="company-members"><Person size={24}/></g>)}
        <g transform={`translate(${x},318)`}>
          <g data-motion={`branch-${i}`} className="party-branch" opacity="0">
            <rect x="-50" y="-14" width="100" height="28" rx="4"/>
            <FileText x="-40" y="-8" size={16}/>
            <text x="9" y="5" textAnchor="middle">党支部</text>
          </g>
        </g>
      </g>)}
      <g className="node-medallion">
        <circle cx="960" cy="234" r="29" className="node-medallion-outer"/>
        <circle cx="960" cy="234" r="25" className="regiment-circle"/>
      </g>
      <text x="960" y="239" textAnchor="middle">团</text>
      <text x="960" y="552" textAnchor="middle" className="diagram-note">连队与人物均为组织关系示意</text>
      <g className="soldiers-committee">
        <path data-motion="soldiers-committee-arc" d="M815,465 Q960,478 1105,465"/>
        <g transform="translate(960,495)">
          <g data-motion="soldiers-committee" opacity="0">
            <text x="-90" y="0" textAnchor="middle">官兵平等</text>
            <text x="90" y="0" textAnchor="middle">士兵委员会</text>
          </g>
        </g>
      </g>
    </g>
    <path data-motion="continue-south-band" d={marchPath} className="south-route-band" opacity="0"/>
    <path data-route="continue-south" data-motion="continue-south" d={marchPath} className="south-route" opacity="0"/>
    <Unit id="unit-continue" glow/>
    <RippleRing id="jinggangshan-ripple" x={points.jinggangshan[0]} y={points.jinggangshan[1]} r={20} inner={12}/>
    <g transform="translate(960,350)">
      <g data-motion="continue-caption" className="rural-direction" opacity="0">
        <text x="0" y="-10" textAnchor="middle">改编后，继续南下</text>
        <text x="0" y="20" textAnchor="middle" className="direction-secondary">1927年10月3日</text>
      </g>
    </g>
  </>;
}

function Uprising() {
  const leftArc = 'M930,356 Q830,376 790,444';
  const rightArc = 'M930,356 Q1030,376 1070,444';
  return <>
    <RippleRing id="nanchang-ripple-1" x={930} y={340} r={22} inner={13}/>
    <RippleRing id="nanchang-ripple-2" x={930} y={340} r={24} inner={14}/>
    <RippleRing id="nanchang-ripple-3" x={930} y={340} r={18} inner={10}/>
    <g className="story-place story-place-active" transform="translate(930,340)">
      <circle className="story-location-ring" r="12"/>
      <circle className="story-location-center" r="3"/>
      <text x="22" y="6">南昌</text>
    </g>
    <g data-motion="uprising-units" className="uprising-units">
      <g transform="translate(930,200)">
        <g data-motion="uprising-strength" opacity="0">
          <text x="0" y="-10" textAnchor="middle" className="uprising-strength">2万余人</text>
          <text x="0" y="17" textAnchor="middle" className="diagram-note">起义部队</text>
        </g>
      </g>
      {Array.from({ length: 9 }, (_, i) => {
        const angle = (i * Math.PI * 2) / 9;
        const inward = (Math.atan2(-Math.sin(angle) * 84, -Math.cos(angle) * 148) * 180) / Math.PI;
        return <g key={i} data-motion={`uprising-unit-${i}`} className="uprising-formation">
          <g transform={`rotate(${inward.toFixed(1)})`}><Formation size={0.42}/></g>
        </g>;
      })}
    </g>
    <g data-motion="uprising-tracks" opacity="0">
      <path d={leftArc} className="curve-track"/>
      <path d={rightArc} className="curve-track"/>
    </g>
    <g data-motion="uprising-response" className="uprising-response" opacity="0">
      <path data-motion="uprising-link-left" data-route="uprising-route-left" d={leftArc}/>
      <path data-motion="uprising-link-right" data-route="uprising-route-right" d={rightArc}/>
      <g transform="translate(790,476)">
        <g data-motion="uprising-outcome-left" className="seal-stamp" opacity="0">
          <rect x="-108" y="-22" width="216" height="44" rx="4" className="seal-stamp-frame"/>
          <text x="0" y="7" textAnchor="middle">独立领导革命战争</text>
        </g>
      </g>
      <g transform="translate(1070,476)">
        <g data-motion="uprising-outcome-right" className="seal-stamp" opacity="0">
          <rect x="-88" y="-22" width="176" height="44" rx="4" className="seal-stamp-frame"/>
          <text x="0" y="7" textAnchor="middle">创建人民军队</text>
        </g>
      </g>
    </g>
    <CometTip id="uprising-comet-left"/>
    <CometTip id="uprising-comet-right"/>
    <RippleRing id="uprising-outcome-ripple-left" x={790} y={476} r={22} inner={12}/>
    <RippleRing id="uprising-outcome-ripple-right" x={1070} y={476} r={22} inner={12}/>
  </>;
}

function Decision() {
  const leftArc = 'M930,301 Q830,326 790,404';
  const rightArc = 'M930,301 Q1030,326 1070,404';
  return <>
    <RippleRing id="hankou-ripple-1" x={930} y={285} r={22} inner={13}/>
    <RippleRing id="hankou-ripple-2" x={930} y={285} r={22} inner={13}/>
    <g className="story-place story-place-active" transform="translate(930,285)">
      <circle className="story-location-ring" r="12"/>
      <circle className="story-location-center" r="3"/>
      <text x="23" y="6">汉口 · 八七会议</text>
    </g>
    <g data-motion="decision-tracks" opacity="0">
      <path d={leftArc} className="curve-track"/>
      <path d={rightArc} className="curve-track"/>
    </g>
    <g data-motion="decision-fork" className="decision-fork" opacity="0">
      <path data-motion="decision-left" data-route="decision-route-left" d={leftArc}/>
      <path data-motion="decision-right" data-route="decision-route-right" d={rightArc}/>
      <g transform="translate(790,440)">
        <g data-motion="land-principle" opacity="0">
          <StoryGlyph label="土地革命" size={44} tone="force"/>
          <text x="0" y="56" textAnchor="middle">土地革命</text>
        </g>
      </g>
      <g transform="translate(1070,440)">
        <g data-motion="armed-principle" opacity="0">
          <StoryGlyph label="武装起义" size={44} tone="force"/>
          <text x="0" y="56" textAnchor="middle">武装起义</text>
        </g>
      </g>
    </g>
    <CometTip id="decision-comet-left"/>
    <CometTip id="decision-comet-right"/>
    <RippleRing id="land-ripple" x={790} y={440} r={26} inner={16}/>
    <RippleRing id="armed-ripple" x={1070} y={440} r={26} inner={16}/>
    <g data-motion="practice-link" className="practice-link" opacity="0">
      <path data-motion="practice-arc" d="M805,522 Q930,538 1055,522"/>
      <g transform="translate(930,564)">
        <g data-motion="practice-outcome" className="seal-stamp seal-stamp-org" opacity="0">
          <rect x="-178" y="-22" width="356" height="44" rx="4" className="seal-stamp-frame"/>
          <text x="0" y="7" textAnchor="middle">在此后的革命实践中寻找新道路</text>
        </g>
      </g>
    </g>
  </>;
}

/** All scene motion is sampled from the player's clock, including on seek. */
export function StoryLayer({ story, scene, projection, clock, sceneStart, controller, phase, reduce, concealFuture = false }) {
  const rootRef = useRef(null);
  const points = useMemo(
    () => Object.fromEntries(Object.entries(STORY_PLACES).map(([id, p]) => [id, projection(p.coordinates)])),
    [projection],
  );
  const hero = story.kind === 'process' ? HERO_SCENES[scene.id] : null;
  const layout = useMemo(
    () => (story.kind === 'process' && !hero ? processLayout(story, projection) : null),
    [story, projection, hero],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !story) return;
    const animations = [];
    const transformedIds = new Set();
    const styledNodes = new Set();
    const duration = story.duration;
    const node = (id) => root.querySelector(`[data-motion="${id}"]`);

    function prepareCenterOrigin(target) {
      target.style.transformBox = 'fill-box';
      target.style.transformOrigin = 'center';
      styledNodes.add(target);
    }

    function add(id, frames, options = {}) {
      const target = node(id);
      if (!target || !frames.length) return;
      let lastOffset = 0;
      const normalized = frames.map(({ at, ...frame }) => {
        const offset = Math.max(lastOffset, clamp(at / duration, 0, 1));
        lastOffset = offset;
        return { ...frame, offset };
      });
      const hasTransform = normalized.some((frame) => 'transform' in frame);
      const animation = target.animate(normalized, {
        duration: duration * 1000,
        fill: 'both',
        easing: 'linear',
        ...options,
      });
      if (hasTransform) transformedIds.add(id);
      animation.pause();
      animations.push(animation);
    }

    function show(id, at, until = duration + 1) {
      const frames = [{ at: 0, opacity: at <= 0 ? 1 : 0 }];
      if (at > 0) {
        const start = Math.max(0, at - 0.24);
        if (start > 0) frames.push({ at: start, opacity: 0, easing: DOC_EASE });
        else frames[0].easing = DOC_EASE;
        frames.push({ at, opacity: 1 });
      }
      if (until <= duration) {
        frames.push({ at: Math.max(at, until - 0.36), opacity: 1, easing: EXIT_EASE });
        frames.push({ at: until, opacity: 0 });
      }
      frames.push({ at: duration, opacity: until <= duration ? 0 : 1 });
      add(id, frames);
    }

    function pop(id, at, until = duration + 1, options = {}) {
      if (until && typeof until === 'object') {
        options = until;
        until = duration + 1;
      }
      const target = node(id);
      if (!target) return;
      const { scaleFrom = 0.84, dy = 8, dur = 0.44, easing = DOC_EASE } = options;
      prepareCenterOrigin(target);
      const additive = transformedIds.has(id);
      const prefix = additive ? '' : baseTransformCss(target);
      const rest = `${prefix}translateY(0px) scale(1)`.trim();
      const enter = `${prefix}translateY(${dy}px) scale(${scaleFrom})`.trim();
      const overshootY = dy === 0 ? 0 : -Math.sign(dy) * 1;
      const peak = `${prefix}translateY(${overshootY}px) scale(1.03)`.trim();
      const exit = `${prefix}translateY(${-Math.round(dy * 0.4)}px) scale(0.96)`.trim();

      const frames = [];
      let settledAt = 0;
      if (at <= 0) {
        frames.push({ at: 0, opacity: 1, transform: rest });
      } else {
        const start = Math.max(0, at - Math.min(0.24, dur * 0.55));
        const mid = Math.min(duration, start + dur * 0.64);
        settledAt = Math.min(duration, start + dur);
        frames.push({ at: 0, opacity: 0, transform: enter });
        if (start > 0) frames.push({ at: start, opacity: 0, transform: enter, easing });
        else frames[0].easing = easing;
        frames.push({ at: mid, opacity: 1, transform: peak, easing });
        frames.push({ at: settledAt, opacity: 1, transform: rest });
      }
      if (until <= duration) {
        const exitStart = Math.max(settledAt, until - 0.36);
        frames.push({ at: exitStart, opacity: 1, transform: rest, easing: EXIT_EASE });
        frames.push({ at: until, opacity: 0, transform: exit });
        frames.push({ at: duration, opacity: 0, transform: exit });
      } else {
        frames.push({ at: duration, opacity: 1, transform: rest });
      }
      if (additive) {
        add(id, frames.map(({ transform, ...restFrame }) => restFrame));
        add(id, frames.map(({ opacity, ...restFrame }) => restFrame), { composite: 'add' });
      } else {
        add(id, frames);
      }
    }

    function stamp(id, at, until = duration + 1, options = {}) {
      if (until && typeof until === 'object') {
        options = until;
        until = duration + 1;
      }
      const target = node(id);
      if (!target) return;
      const { scaleFrom = 1.28, scaleBounce = 0.97, dur = 0.38 } = options;
      prepareCenterOrigin(target);
      const additive = transformedIds.has(id);
      const prefix = additive ? '' : baseTransformCss(target);
      const rest = `${prefix}scale(1)`.trim();
      const drop = `${prefix}scale(${scaleFrom})`.trim();
      const impact = `${prefix}scale(${scaleBounce})`.trim();
      const exit = `${prefix}scale(0.95)`.trim();

      const frames = [];
      let settledAt = 0;
      if (at <= 0) {
        frames.push({ at: 0, opacity: 1, transform: rest });
      } else {
        const start = Math.max(0, at - Math.min(0.2, dur * 0.52));
        const hit = Math.min(duration, start + dur * 0.62);
        settledAt = Math.min(duration, start + dur);
        frames.push({ at: 0, opacity: 0, transform: drop });
        if (start > 0) frames.push({ at: start, opacity: 0, transform: drop, easing: IMPACT_EASE });
        else frames[0].easing = IMPACT_EASE;
        frames.push({ at: hit, opacity: 1, transform: impact, easing: DOC_EASE });
        frames.push({ at: settledAt, opacity: 1, transform: rest });
      }
      if (until <= duration) {
        const exitStart = Math.max(settledAt, until - 0.36);
        frames.push({ at: exitStart, opacity: 1, transform: rest, easing: EXIT_EASE });
        frames.push({ at: until, opacity: 0, transform: exit });
        frames.push({ at: duration, opacity: 0, transform: exit });
      } else {
        frames.push({ at: duration, opacity: 1, transform: rest });
      }
      if (additive) {
        add(id, frames.map(({ transform, ...restFrame }) => restFrame));
        add(id, frames.map(({ opacity, ...restFrame }) => restFrame), { composite: 'add' });
      } else {
        add(id, frames);
      }
    }

    function ripple(id, at, dur = 1.4, options = {}) {
      if (dur && typeof dur === 'object') {
        options = dur;
        dur = 1.4;
      }
      const target = node(id);
      if (!target) return;
      const { scaleFrom = 0.55, scalePeak = 0.75, scaleTo = 2.15, peakOpacity = 0.85 } = options;
      prepareCenterOrigin(target);
      const prefix = baseTransformCss(target);
      const tStart = `${prefix}scale(${scaleFrom})`.trim();
      if (reduce) {
        add(id, [
          { at: 0, opacity: 0, transform: tStart },
          { at: duration, opacity: 0, transform: tStart },
        ]);
        return;
      }
      const start = clamp(at, 0, Math.max(0, duration - 0.05));
      const peak = Math.min(duration, Math.max(start, start + dur * 0.16));
      const end = Math.min(duration, Math.max(peak, start + dur));
      const tPeak = `${prefix}scale(${scalePeak})`.trim();
      const tEnd = `${prefix}scale(${scaleTo})`.trim();
      const frames = [{ at: 0, opacity: 0, transform: tStart }];
      if (start > 0) frames.push({ at: start, opacity: 0, transform: tStart, easing: DOC_EASE });
      else frames[0].easing = DOC_EASE;
      frames.push({ at: peak, opacity: peakOpacity, transform: tPeak, easing: IMPACT_EASE });
      frames.push({ at: end, opacity: 0, transform: tEnd });
      if (end < duration) frames.push({ at: duration, opacity: 0, transform: tEnd });
      add(id, frames);
    }

    function move(id, positions, from, to, options = {}) {
      if (!positions || !positions.length) return;
      const defaultEasing = positions.length === 2 ? DOC_EASE : positions.length <= 8 ? WAVE_EASE : 'linear';
      const segEasing = options.easing ?? defaultEasing;
      const frames = [{ at: 0, transform: `translate(${positions[0][0]}px,${positions[0][1]}px)` }];
      const span = Math.max(0.001, to - from);
      const denom = Math.max(1, positions.length - 1);
      positions.forEach((point, i) => {
        const at = from + (span * i) / denom;
        const frame = { at, transform: `translate(${point[0]}px,${point[1]}px)` };
        if (i < positions.length - 1 && segEasing && segEasing !== 'linear') {
          frame.easing = segEasing;
        }
        frames.push(frame);
      });
      frames.push({ at: duration, transform: `translate(${positions.at(-1)[0]}px,${positions.at(-1)[1]}px)` });
      add(id, frames);
    }

    function travel(id, routeId, from, to, fraction = 1, options = {}) {
      if (fraction && typeof fraction === 'object') {
        options = fraction;
        fraction = 1;
      }
      const path = root.querySelector(`[data-route="${routeId}"]`);
      if (!path) return;
      const length = path.getTotalLength();
      const bezier = parseCubicBezier(options.easing ?? DOC_EASE);
      const steps = 48;
      const times = [];
      const positions = [];
      const angles = [];
      let previousAngle;
      for (let i = 0; i <= steps; i++) {
        const tau = i / steps;
        const timeFrac = bezier ? bezierCoord(tau, bezier[0], bezier[2]) : tau;
        const distFrac = bezier ? bezierCoord(tau, bezier[1], bezier[3]) : tau;
        const s = clamp(length * fraction * distFrac, 0, length);
        const p = path.getPointAtLength(s);
        times.push(from + (to - from) * timeFrac);
        positions.push([p.x, p.y]);
        const p0 = path.getPointAtLength(Math.max(0, s - 0.5));
        const p1 = path.getPointAtLength(Math.min(length, s + 0.5));
        let angle = (Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180) / Math.PI;
        if (previousAngle !== undefined) {
          while (angle - previousAngle > 180) angle -= 360;
          while (angle - previousAngle < -180) angle += 360;
        }
        previousAngle = angle;
        angles.push(angle);
      }
      const posFrames = [{ at: 0, transform: `translate(${positions[0][0]}px,${positions[0][1]}px)` }];
      positions.forEach((pt, i) => posFrames.push({ at: times[i], transform: `translate(${pt[0]}px,${pt[1]}px)` }));
      posFrames.push({ at: duration, transform: `translate(${positions.at(-1)[0]}px,${positions.at(-1)[1]}px)` });
      add(id, posFrames);

      if (node(`${id}-heading`)) {
        const rotFrames = [{ at: 0, transform: `rotate(${angles[0]}deg)` }];
        angles.forEach((angle, i) => rotFrames.push({ at: times[i], transform: `rotate(${angle}deg)` }));
        rotFrames.push({ at: duration, transform: `rotate(${angles.at(-1)}deg)` });
        add(`${id}-heading`, rotFrames);
      }
    }

    function trace(id, from, to, { easing = DOC_EASE } = {}) {
      const path = node(id);
      if (!path) return;
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length}`;
      styledNodes.add(path);
      const frames = [{ at: 0, opacity: from <= 0 ? 1 : 0, strokeDashoffset: length }];
      if (from > 0) {
        frames.push({ at: Math.max(0, from - 0.001), opacity: 0, strokeDashoffset: length });
        frames.push({ at: from, opacity: 1, strokeDashoffset: length, easing });
      } else {
        frames[0].easing = easing;
      }
      frames.push({ at: Math.max(from, to), opacity: 1, strokeDashoffset: 0 });
      if (to < duration) frames.push({ at: duration, opacity: 1, strokeDashoffset: 0 });
      add(id, frames);
    }

    if (story.kind === 'process') {
      const helpers = { add, show, pop, stamp, ripple, move, travel, trace };
      if (hero) {
        hero.animate(story, projection, helpers);
      } else {
        animateProcess(story, layout, helpers);
      }
    } else if (story.kind === 'autumn') {
      add('plan-group', [
        { at: 0, opacity: 0.95 },
        { at: 11.5, opacity: 0.95, easing: DOC_EASE },
        { at: 14, opacity: 0.24, easing: DOC_EASE },
        { at: 21, opacity: 0.1 },
        { at: duration, opacity: 0.1 },
      ]);
      ['first', 'third', 'second'].forEach((id, i) => {
        show(`unit-${id}`, 0.8 + i * 0.25, 13.8);
        travel(`unit-${id}`, id, 1 + i * 0.35, 6.5, 0.7);
      });
      ripple('blocked-ripple', 7.2, 1.35);
      stamp('blocked', 7.3, 21.5);
      pop('blocked-caption', 7.45, 21.5, { scaleFrom: 0.88, dy: 6 });
      show('rally', 14.2, 21.7);
      ripple('wenjiashi-ripple', 14.25, 1.5);
      pop('rally-caption', 14.4, 21.7, { scaleFrom: 0.86, dy: 6 });
      [0, 1, 2].forEach((i) => {
        const angle = (i * Math.PI * 2) / 3;
        const p = points.wenjiashi;
        move(
          `rally-${i}`,
          [
            [p[0] + Math.cos(angle) * 65, p[1] + Math.sin(angle) * 65],
            [p[0] + (i - 1) * 25, p[1] + 35],
          ],
          14.2 + i * 0.12,
          18.4,
        );
      });
      ripple('wenjiashi-rally-ripple', 18.4, 1.35, { scaleTo: 1.9, peakOpacity: 0.65 });
      show('south-route', 21.3);
      trace('south-route', 21.3, 29);
      show('south-band', 21.3);
      trace('south-band', 21.3, 29);
      show('unit-south', 21.3, 30);
      travel('unit-south', 'south', 21.3, 29);
      pop('rural-direction', 22.3, undefined, { scaleFrom: 0.88, dy: 10 });
      ripple('sanwan-ripple', 29.0, 1.5);
      pop('sanwan-arrival', 29.15, undefined, { scaleFrom: 0.86, dy: 6 });
    } else if (story.kind === 'organization') {
      Array.from({ length: 12 }, (_, i) => {
        const from = [793 + (i % 6) * 60, 250 + Math.floor(i / 6) * 57];
        const stagger = (i % 6) * 0.08 + Math.floor(i / 6) * 0.12;
        move(`soldier-${i}`, [from, [950 + (i % 3) * 10, 276 + Math.floor(i / 3) * 7]], 0.4 + stagger, 4.4 + stagger);
      });
      ripple('regiment-ripple', 4.35, 1.5, { scaleTo: 2.05, peakOpacity: 0.78 });
      pop('regiment-result', 4.25, undefined, { scaleFrom: 0.82, dy: 0 });
      show('army-before', 0, 7);
      show('organization-diagram', 7.2, 24.4);
      [0, 1, 2].forEach((i) => {
        trace(`organization-link-${i}`, 7.3 + i * 0.14, 9.3 + i * 0.14);
        pop(`branch-${i}`, 9.2 + i * 0.72, undefined, { scaleFrom: 0.82, dy: -12 });
      });
      trace('soldiers-committee-arc', 15.2, 16.8);
      pop('soldiers-committee', 15.5, 24.4, { scaleFrom: 0.88, dy: 8 });
      show('continue-south-band', 25.2);
      trace('continue-south-band', 25.2, 30.6);
      show('continue-south', 25.2);
      trace('continue-south', 25.2, 30.6);
      show('unit-continue', 25.2);
      travel('unit-continue', 'continue-south', 25.2, 30.6);
      ripple('jinggangshan-ripple', 30.6, 1.4);
      pop('continue-caption', 25.3, undefined, { scaleFrom: 0.88, dy: 10 });
    } else if (story.kind === 'uprising') {
      ripple('nanchang-ripple-1', 0.45, 1.8, { scalePeak: 0.85, scaleTo: 2.55, peakOpacity: 0.88 });
      ripple('nanchang-ripple-2', 7.15, 1.7, { scalePeak: 0.85, scaleTo: 2.75, peakOpacity: 0.9 });
      ripple('nanchang-ripple-3', 7.55, 1.6, { scaleFrom: 0.5, scalePeak: 0.8, scaleTo: 2.35, peakOpacity: 0.62 });
      pop('uprising-strength', 0, 14.3, { scaleFrom: 0.86, dy: 8 });
      Array.from({ length: 9 }, (_, i) => {
        const angle = (i * Math.PI * 2) / 9;
        const from = [930 + Math.cos(angle) * 148, 340 + Math.sin(angle) * 84];
        const to = [930 + Math.cos(angle) * 28, 340 + Math.sin(angle) * 28];
        move(`uprising-unit-${i}`, [from, to], 0.5 + i * 0.14, 6.4);
      });
      show('uprising-units', 0, 14.3);
      show('uprising-tracks', 14.3);
      show('uprising-response', 14.3);
      trace('uprising-link-left', 14.4, 16.5);
      trace('uprising-link-right', 14.6, 16.7);
      show('uprising-comet-left', 14.4, 16.75);
      travel('uprising-comet-left', 'uprising-route-left', 14.4, 16.5);
      show('uprising-comet-right', 14.6, 16.95);
      travel('uprising-comet-right', 'uprising-route-right', 14.6, 16.7);
      ripple('uprising-outcome-ripple-left', 16.5, 1.35);
      ripple('uprising-outcome-ripple-right', 16.7, 1.35);
      stamp('uprising-outcome-left', 16.55);
      stamp('uprising-outcome-right', 16.75);
    } else if (story.kind === 'decision') {
      ripple('hankou-ripple-1', 0.4, 1.7, { scalePeak: 0.85, scaleTo: 2.45, peakOpacity: 0.85 });
      ripple('hankou-ripple-2', 6.15, 1.5, { scalePeak: 0.85, scaleTo: 2.35, peakOpacity: 0.85 });
      show('decision-tracks', 6.15);
      show('decision-fork', 6.15);
      trace('decision-left', 6.2, 7.8);
      trace('decision-right', 6.45, 8.15);
      show('decision-comet-left', 6.2, 8.0);
      travel('decision-comet-left', 'decision-route-left', 6.2, 7.8);
      show('decision-comet-right', 6.45, 8.35);
      travel('decision-comet-right', 'decision-route-right', 6.45, 8.15);
      ripple('land-ripple', 7.8, 1.35);
      ripple('armed-ripple', 8.15, 1.35);
      stamp('land-principle', 7.85);
      stamp('armed-principle', 8.2);
      show('practice-link', 12.2);
      trace('practice-arc', 12.2, 13.7);
      stamp('practice-outcome', 13.3);
    }

    const motion = motionClock(animations, duration, (seconds) => {
      if (!reduce) return seconds;
      const beat = beatAt(story, seconds);
      return (story.beats[beat + 1]?.at || duration) - 0.05;
    });
    const active = {
      id: scene.id,
      seek(seconds, options) {
        motion.seek(seconds, reduce ? { playing: false } : options);
      },
    };
    controller.current = active;
    active.seek(storyTimeFor(story, scene, clock.current.time - sceneStart));
    return () => {
      animations.forEach((animation) => animation.cancel());
      styledNodes.forEach((el) => {
        el.style.transformBox = '';
        el.style.transformOrigin = '';
        el.style.strokeDasharray = '';
      });
      if (controller.current === active) controller.current = null;
    };
  }, [story, scene.id, scene.duration, projection, reduce, layout, hero]);

  const HeroGraphic = hero?.Graphic;

  return <g ref={rootRef} className={`authored-layer authored-${story.kind}`} data-phase={phase} role="img" aria-label={`${scene.title}的过程动画：${story.beats.slice(0, concealFuture ? phase + 1 : undefined).map((b) => b.title).join('，')}`}>
    {story.kind === 'process' && (HeroGraphic
      ? <HeroGraphic story={story} projection={projection} phase={phase} prefix={scene.id}/>
      : <ProcessGraphic story={story} layout={layout} phase={phase} prefix={scene.id}/>)}
    {story.kind === 'autumn' && <Autumn points={points} phase={phase} prefix={scene.id} concealFuture={concealFuture}/>}
    {story.kind === 'organization' && <Organization points={points}/>}
    {story.kind === 'uprising' && <Uprising/>}
    {story.kind === 'decision' && <Decision/>}
  </g>;
}
