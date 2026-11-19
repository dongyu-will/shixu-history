import { PRC_PLACES } from '../storyboards/prc-places.js';
import { HeroEmblem } from '../HeroEmblems.jsx';
import {
  ArrivalRipple,
  CometHead,
  NodeMedallion,
  RejectSeal,
  SealStamp,
} from '../StorySymbols.jsx';

const clamp = (v, low, high) => Math.max(low, Math.min(high, v));

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

function ArrivalTip({ id, x, y, angle, tone = 'organization' }) {
  return (
    <g transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${angle.toFixed(1)})`}>
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
    </g>
  );
}

/** Positioned wrappers for StorySymbols (which render centered at local 0,0). */
function PositionedSeal({ id, x, y, text, subtext, tone = 'force', width }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g data-motion={id} opacity="0">
        <SealStamp text={text} subtext={subtext} tone={tone} width={width} />
      </g>
    </g>
  );
}

function PositionedReject({ id, x, y, label = '否定', angle = -13 }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g data-motion={id} opacity="0">
        <RejectSeal label={label} angle={angle} />
      </g>
    </g>
  );
}

function PositionedRipple({ id, x, y, r = 28, tone = 'organization' }) {
  return (
    <g transform={`translate(${x},${y})`} aria-hidden="true">
      <g data-motion={id} opacity="0">
        <ArrivalRipple r={r} tone={tone} />
      </g>
    </g>
  );
}

function MotionComet({ id, tone = 'organization', r = 4.6 }) {
  return (
    <g data-motion={id} opacity="0" aria-hidden="true">
      <CometHead tone={tone} r={r} />
    </g>
  );
}

function projectPlace(projection, name, fallback) {
  const coords = PRC_PLACES[name];
  if (typeof projection === 'function' && coords) {
    const pt = projection(coords);
    if (Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1])) {
      return {
        x: clamp(pt[0], 640, 1265),
        y: clamp(pt[1], 148, 536),
      };
    }
  }
  return { x: fallback[0], y: fallback[1] };
}

/* ========================================================================== */
/* prc-e-1: 抗美援朝战争 (1950—1953) — Yalu River Shield & Truce Seal         */
/* ========================================================================== */

function kmyzGeometry(projection) {
  const bjRaw = projectPlace(projection, '北京市', [760, 320]);
  const ddRaw = projectPlace(projection, '丹东市', [1038, 294]);
  // Keep generous separation between Beijing, Dandong, and Korean frontier schematic node
  // so labels never collide at 1280x720 or 390x844 mobile viewBox.
  const beijing = { x: clamp(bjRaw.x, 678, 792), y: clamp(bjRaw.y, 260, 344) };
  const dandong = { x: clamp(ddRaw.x, 972, 1044), y: clamp(ddRaw.y, 268, 326) };
  const frontier = { x: clamp(dandong.x + 162, 1152, 1218), y: clamp(dandong.y + 34, 298, 368) };
  const decisionArc = curveData(beijing, dandong, { bend: -42, trimStart: 26, trimEnd: 26 });
  const crossArc = curveData(dandong, frontier, { bend: -28, trimStart: 24, trimEnd: 24 });
  const shieldArc = `M${(dandong.x - 10).toFixed(1)},${(dandong.y - 68).toFixed(1)} Q${(dandong.x + 42).toFixed(1)},${dandong.y.toFixed(1)} ${(dandong.x - 8).toFixed(1)},${(dandong.y + 74).toFixed(1)}`;
  return { beijing, dandong, frontier, decisionArc, crossArc, shieldArc };
}

function KmyzGraphic({ projection }) {
  const { beijing, dandong, frontier, decisionArc, crossArc, shieldArc } = kmyzGeometry(projection);
  return (
    <g className="hero-scene hero-prc-kmyz">
      <text x="950" y="118" textAnchor="middle" className="diagram-note">
        抗美援朝战略防御示意 · 非精确战役态势图
      </text>

      {/* Strategic pressure warning ring on Korean peninsula schematic anchor */}
      <g data-motion="kmyz-threat" opacity="0" transform={`translate(${frontier.x},${frontier.y})`}>
        <circle r="34" className="hero-crisis-ring amb-ripple-loop" fill="none" aria-hidden="true" />
        <g className="amb-breathe">
          <circle r="40" className="hero-crisis-ring" fill="none" />
          <circle r="22" className="hero-crisis-ring-inner" fill="none" />
        </g>
        <text x="0" y="-52" textAnchor="middle" className="process-edge-label">
          战火逼近鸭绿江
        </text>
      </g>

      {/* Shield arc along Yalu frontier */}
      <path
        data-motion="kmyz-shield"
        d={shieldArc}
        fill="none"
        className="hero-shield-arc"
        opacity="0"
      />
      <g data-motion="kmyz-shield-pulse" opacity="0" aria-hidden="true">
        <path d={shieldArc} fill="none" className="hero-shield-arc-glow amb-shield-pulse" />
      </g>

      {/* Beijing -> Dandong command arc */}
      <path
        data-motion="kmyz-cmd-arc"
        data-route="kmyz-cmd"
        d={decisionArc.d}
        className="process-edge process-edge-organization"
        fill="none"
        opacity="0"
      />
      <g data-motion="kmyz-cmd-flow" opacity="0" aria-hidden="true">
        <path className="amb-flow-dash amb-flow-dash-org" d={decisionArc.d} fill="none" />
      </g>
      <MotionComet id="kmyz-cmd-comet" tone="organization" />
      <ArrivalTip
        id="kmyz-cmd-tip"
        x={decisionArc.ex}
        y={decisionArc.ey}
        angle={decisionArc.endAngle}
        tone="organization"
      />

      {/* Dandong -> Frontier volunteer crossing arc */}
      <path
        data-motion="kmyz-cross-arc"
        data-route="kmyz-cross"
        d={crossArc.d}
        className="process-edge process-edge-force"
        fill="none"
        opacity="0"
      />
      <g data-motion="kmyz-cross-flow" opacity="0" aria-hidden="true">
        <path className="amb-flow-dash amb-flow-dash-force" d={crossArc.d} fill="none" />
      </g>
      <MotionComet id="kmyz-cross-comet" tone="force" />
      <ArrivalTip
        id="kmyz-cross-tip"
        x={crossArc.ex}
        y={crossArc.ey}
        angle={crossArc.endAngle}
        tone="force"
      />

      {/* Place medallions */}
      <g data-motion="kmyz-bj" opacity="0" transform={`translate(${beijing.x},${beijing.y})`}>
        <NodeMedallion tone="organization" radius={23}>
          <HeroEmblem name="rostrum" size={24} tone="org" />
        </NodeMedallion>
        <text x="0" y="-34" textAnchor="middle" className="process-node-title">
          北京 · 战略决策
        </text>
        <text x="0" y="42" textAnchor="middle" className="process-edge-label">
          1950.10 保家卫国
        </text>
      </g>

      <g data-motion="kmyz-dd" opacity="0" transform={`translate(${dandong.x},${dandong.y})`}>
        <NodeMedallion tone="force" radius={23} active>
          <HeroEmblem name="yalu-bridge" size={24} tone="force" />
        </NodeMedallion>
        <text x="-16" y="-36" textAnchor="end" className="process-node-title">
          丹东 · 鸭绿江口岸
        </text>
      </g>

      <PositionedRipple id="kmyz-ripple-dd" x={dandong.x} y={dandong.y} tone="force" r={26} />
      <PositionedRipple id="kmyz-ripple-truce" x={frontier.x} y={frontier.y} tone="organization" r={28} />

      <g data-motion="kmyz-truce" opacity="0" transform={`translate(${frontier.x},${frontier.y})`}>
        <circle r="24" fill="none" stroke="var(--story-organization)" strokeWidth="1" className="amb-ripple-loop" aria-hidden="true" />
        <NodeMedallion tone="organization" radius={22}>
          <g className="amb-breathe">
            <HeroEmblem name="defense-shield" size={24} tone="org" />
          </g>
        </NodeMedallion>
        <text x="0" y="42" textAnchor="middle" className="process-node-title">
          1953.7 停战协定
        </text>
      </g>

      {/* Distinction callout card */}
      <g data-motion="kmyz-pillars" opacity="0" transform="translate(950, 444)">
        <rect x="-254" y="-21" width="508" height="42" rx="21" className="hero-banner-pill" />
        <text x="0" y="5" textAnchor="middle" className="process-edge-label">
          保卫国家安全 · 打破美军不可战胜神话 · 赢得稳定和平环境
        </text>
      </g>

      <PositionedSeal id="kmyz-seal" x={950} y={528} text="立国之战 · 和平屏障" tone="force" width={286} />
    </g>
  );
}

function animateKmyz(story, _projection, h) {
  const b0 = story.beats[0]?.at ?? 0;
  const b1 = story.beats[1]?.at ?? 7;
  const b2 = story.beats[2]?.at ?? 14;
  const b3 = story.beats[3]?.at ?? 21;

  h.pop('kmyz-bj', b0 + 0.05);
  h.pop('kmyz-threat', b0 + 0.45, undefined, { scaleFrom: 0.72 });

  h.trace('kmyz-cmd-arc', b1 + 0.1, b1 + 1.9);
  h.show('kmyz-cmd-flow', b1 + 1.9);
  h.show('kmyz-cmd-comet', b1 + 0.1, b1 + 1.95);
  h.travel('kmyz-cmd-comet', 'kmyz-cmd', b1 + 0.1, b1 + 1.9);
  h.pop('kmyz-cmd-tip', b1 + 1.85);
  h.pop('kmyz-dd', b1 + 1.8);
  h.ripple('kmyz-ripple-dd', b1 + 1.85, 1.4);

  h.trace('kmyz-cross-arc', b1 + 2.4, b1 + 4.6);
  h.show('kmyz-cross-flow', b1 + 4.6);
  h.show('kmyz-cross-comet', b1 + 2.4, b1 + 4.65);
  h.travel('kmyz-cross-comet', 'kmyz-cross', b1 + 2.4, b1 + 4.6);
  h.pop('kmyz-cross-tip', b1 + 4.55);

  h.trace('kmyz-shield', b2 + 0.08, b2 + 1.8);
  h.show('kmyz-shield-pulse', b2 + 1.8);
  h.pop('kmyz-truce', b2 + 0.25);
  h.ripple('kmyz-ripple-truce', b2 + 0.35, 1.5);

  h.pop('kmyz-pillars', b3 + 0.04, undefined, { dy: 8 });
  h.stamp('kmyz-seal', b3 + 0.08);
}

/* ========================================================================== */
/* prc-e-5: 1956 社会主义基本制度确立 — Three Tributaries & Dual Pillars      */
/* ========================================================================== */

function system1956Geometry() {
  const streams = [
    { id: 'agri', x: 706, y: 204, title: '农业改造', sub: '互助组→初级社→高级社' },
    { id: 'craft', x: 706, y: 314, title: '手工业改造', sub: '供销社→生产合作社' },
    { id: 'biz', x: 706, y: 424, title: '工商业和平赎买', sub: '个别→全行业公私合营' },
  ];
  const econ = { x: 1018, y: 374 };
  const poli = { x: 1018, y: 226 };
  const apex = { x: 1208, y: 300 };
  const streamCurves = streams.map((s, i) =>
    curveData(s, econ, { bend: i === 0 ? -24 : i === 2 ? 24 : 0, trimStart: 28, trimEnd: 28 }),
  );
  const poliCurve = curveData(poli, apex, { bend: -24, trimStart: 26, trimEnd: 26 });
  const econCurve = curveData(econ, apex, { bend: 24, trimStart: 26, trimEnd: 26 });
  return { streams, poli, econ, apex, streamCurves, poliCurve, econCurve };
}

function System1956Graphic() {
  const { streams, poli, econ, apex, streamCurves, poliCurve, econCurve } = system1956Geometry();
  const streamEmblems = ['grain-ear', 'industry-gear', 'commerce-hall'];
  return (
    <g className="hero-scene hero-prc-1956">
      <text x="950" y="118" textAnchor="middle" className="diagram-note">
        三大改造汇流与社会主义基本制度确立示意
      </text>

      {streamCurves.map((c, i) => (
        <g key={streams[i].id}>
          <path
            data-motion={`s56-arc-${i}`}
            data-route={`s56-stream-${i}`}
            d={c.d}
            className="process-edge process-edge-organization"
            fill="none"
            opacity="0"
          />
          <g data-motion={`s56-stream-flow-${i}`} opacity="0" aria-hidden="true">
            <path className="amb-flow-dash amb-flow-dash-org" d={c.d} fill="none" />
          </g>
          <MotionComet id={`s56-comet-${i}`} tone="organization" />
          <ArrivalTip
            id={`s56-tip-${i}`}
            x={c.ex}
            y={c.ey}
            angle={c.endAngle}
            tone="organization"
          />
        </g>
      ))}

      {/* Dual pillars -> 1956 apex */}
      <path
        data-motion="s56-poli-arc"
        d={poliCurve.d}
        className="process-edge process-edge-organization"
        fill="none"
        opacity="0"
      />
      <g data-motion="s56-poli-flow" opacity="0" aria-hidden="true">
        <path className="amb-flow-dash amb-flow-dash-gold" d={poliCurve.d} fill="none" />
      </g>
      <ArrivalTip
        id="s56-poli-tip"
        x={poliCurve.ex}
        y={poliCurve.ey}
        angle={poliCurve.endAngle}
        tone="organization"
      />
      <path
        data-motion="s56-econ-arc"
        d={econCurve.d}
        className="process-edge process-edge-force"
        fill="none"
        opacity="0"
      />
      <g data-motion="s56-econ-flow" opacity="0" aria-hidden="true">
        <path className="amb-flow-dash amb-flow-dash-gold" d={econCurve.d} fill="none" />
      </g>
      <ArrivalTip
        id="s56-econ-tip"
        x={econCurve.ex}
        y={econCurve.ey}
        angle={econCurve.endAngle}
        tone="force"
      />

      {/* Left stream medallions */}
      {streams.map((s, i) => (
        <g key={s.id} data-motion={`s56-src-${i}`} opacity="0" transform={`translate(${s.x},${s.y})`}>
          <NodeMedallion tone="organization" radius={22}>
            {i === 1 ? (
              <g className="amb-gear-cw">
                <HeroEmblem name={streamEmblems[i]} size={22} tone="org" />
              </g>
            ) : (
              <HeroEmblem name={streamEmblems[i]} size={23} tone="org" />
            )}
          </NodeMedallion>
          <text x="0" y="-30" textAnchor="middle" className="process-node-title">
            {s.title}
          </text>
          <text x="0" y="40" textAnchor="middle" className="process-edge-label">
            {s.sub}
          </text>
        </g>
      ))}

      {/* Political & Economic pillars */}
      <g data-motion="s56-poli" opacity="0" transform={`translate(${poli.x},${poli.y})`}>
        <NodeMedallion tone="organization" radius={24}>
          <HeroEmblem name="rostrum" size={25} tone="org" />
        </NodeMedallion>
        <text x="0" y="-34" textAnchor="middle" className="process-node-title">
          基本政治制度
        </text>
        <text x="0" y="42" textAnchor="middle" className="process-edge-label">
          1954宪法 · 人大/政协/民族自治
        </text>
      </g>

      <g data-motion="s56-econ" opacity="0" transform={`translate(${econ.x},${econ.y})`}>
        <NodeMedallion tone="force" radius={25} active>
          <g className="amb-gear-cw">
            <HeroEmblem name="industry-gear" size={25} tone="force" />
          </g>
        </NodeMedallion>
        <text x="0" y="-35" textAnchor="middle" className="process-node-title">
          基本经济制度
        </text>
        <text x="0" y="44" textAnchor="middle" className="process-edge-label">
          公有制主体（最主要标志）
        </text>
      </g>
      <PositionedRipple id="s56-econ-ripple" x={econ.x} y={econ.y} tone="force" r={28} />

      <g data-motion="s56-apex" opacity="0" transform={`translate(${apex.x},${apex.y})`}>
        <circle r="31" fill="none" stroke="var(--hero-gold, var(--story-force))" strokeWidth="1.1" className="amb-ripple-loop" aria-hidden="true" />
        <NodeMedallion tone="force" radius={28} active>
          <g className="amb-breathe">
            <HeroEmblem name="compass-star" size={28} tone="force" />
          </g>
        </NodeMedallion>
        <text x="0" y="-38" textAnchor="middle" className="process-node-title">
          1956年底
        </text>
        <text x="0" y="48" textAnchor="middle" className="process-edge-label">
          进入社会主义初级阶段
        </text>
      </g>
      <PositionedRipple id="s56-apex-ripple" x={apex.x} y={apex.y} tone="force" r={34} />

      <PositionedSeal id="s56-seal" x={950} y={528} text="社会主义基本制度确立" tone="force" width={310} />
    </g>
  );
}

function animateSystem1956(story, _projection, h) {
  const b0 = story.beats[0]?.at ?? 0;
  const b1 = story.beats[1]?.at ?? 7;
  const b2 = story.beats[2]?.at ?? 14;
  const b3 = story.beats[3]?.at ?? 21;

  [0, 1, 2].forEach((i) => {
    h.pop(`s56-src-${i}`, b0 + 0.1 + i * 0.45);
    h.trace(`s56-arc-${i}`, b0 + 1.1 + i * 0.45, b0 + 3.1 + i * 0.45);
    h.show(`s56-stream-flow-${i}`, b0 + 3.1 + i * 0.45);
    h.show(`s56-comet-${i}`, b0 + 1.1 + i * 0.45, b0 + 3.15 + i * 0.45);
    h.travel(`s56-comet-${i}`, `s56-stream-${i}`, b0 + 1.1 + i * 0.45, b0 + 3.1 + i * 0.45);
    h.pop(`s56-tip-${i}`, b0 + 3.05 + i * 0.45);
  });

  h.pop('s56-poli', b1 + 0.15);
  h.pop('s56-econ', b1 + 1.0);
  h.ripple('s56-econ-ripple', b1 + 1.05, 1.5);

  h.trace('s56-poli-arc', b2 + 0.15, b2 + 1.6);
  h.show('s56-poli-flow', b2 + 1.6);
  h.pop('s56-poli-tip', b2 + 1.55);
  h.trace('s56-econ-arc', b2 + 0.3, b2 + 1.75);
  h.show('s56-econ-flow', b2 + 1.75);
  h.pop('s56-econ-tip', b2 + 1.7);
  h.pop('s56-apex', b2 + 1.65);
  h.ripple('s56-apex-ripple', b2 + 1.7, 1.6);

  h.stamp('s56-seal', b3 + 0.08);
}

/* ========================================================================== */
/* prc-e-6: 独立工业体系与“两弹一星” (1956—1976) — Backbone & Orbital Rings   */
/* ========================================================================== */

function industryGeometry(projection) {
  const anshan = projectPlace(projection, '鞍山市', [1148, 266]);
  const daqing = projectPlace(projection, '大庆市', [1182, 188]);
  const jiuquan = projectPlace(projection, '酒泉市', [774, 286]);
  const lop = projectPlace(projection, '罗布泊示意', [672, 268]);
  const hub = { x: 960, y: 364 };
  const c1 = curveData(anshan, daqing, { bend: -20, trimStart: 20, trimEnd: 20 });
  const c2 = curveData(daqing, jiuquan, { bend: -38, trimStart: 22, trimEnd: 22 });
  const c3 = curveData(jiuquan, lop, { bend: -16, trimStart: 20, trimEnd: 20 });
  return { anshan, daqing, jiuquan, lop, hub, c1, c2, c3 };
}

function IndustryGraphic({ projection }) {
  const { anshan, daqing, jiuquan, lop, hub, c1, c2, c3 } = industryGeometry(projection);
  const satOrbitD = 'M 116 0 A 116 52 0 1 1 -116 0 A 116 52 0 1 1 116 0';
  return (
    <g className="hero-scene hero-prc-industry">
      <text x="950" y="118" textAnchor="middle" className="diagram-note">
        独立工业骨干与“两弹一星”科技里程碑示意
      </text>

      {/* Industrial network arcs */}
      <path data-motion="ind-arc-1" data-route="ind-r1" d={c1.d} className="process-edge process-edge-organization" fill="none" opacity="0" />
      <g data-motion="ind-flow-1" opacity="0" aria-hidden="true">
        <path className="amb-flow-dash amb-flow-dash-org" d={c1.d} fill="none" />
      </g>
      <MotionComet id="ind-comet-1" tone="organization" />
      <ArrivalTip id="ind-tip-1" x={c1.ex} y={c1.ey} angle={c1.endAngle} tone="organization" />

      <path data-motion="ind-arc-2" data-route="ind-r2" d={c2.d} className="process-edge process-edge-organization" fill="none" opacity="0" />
      <g data-motion="ind-flow-2" opacity="0" aria-hidden="true">
        <path className="amb-flow-dash amb-flow-dash-org" d={c2.d} fill="none" />
      </g>
      <MotionComet id="ind-comet-2" tone="organization" />
      <ArrivalTip id="ind-tip-2" x={c2.ex} y={c2.ey} angle={c2.endAngle} tone="organization" />

      <path data-motion="ind-arc-3" data-route="ind-r3" d={c3.d} className="process-edge process-edge-force" fill="none" opacity="0" />
      <g data-motion="ind-flow-3" opacity="0" aria-hidden="true">
        <path className="amb-flow-dash amb-flow-dash-force" d={c3.d} fill="none" />
      </g>
      <MotionComet id="ind-comet-3" tone="force" />
      <ArrivalTip id="ind-tip-3" x={c3.ex} y={c3.ey} angle={c3.endAngle} tone="force" />

      {/* Map backbone nodes */}
      <g data-motion="ind-anshan" opacity="0" transform={`translate(${anshan.x},${anshan.y})`}>
        <NodeMedallion tone="organization" radius={20}>
          <HeroEmblem name="steel-furnace" size={22} tone="org" />
        </NodeMedallion>
        <text x="16" y="36" textAnchor="middle" className="process-node-title">鞍钢·东北重工</text>
      </g>
      <g data-motion="ind-daqing" opacity="0" transform={`translate(${daqing.x},${daqing.y})`}>
        <NodeMedallion tone="organization" radius={20}>
          <HeroEmblem name="oil-derrick" size={22} tone="org" />
        </NodeMedallion>
        <text x="-12" y="-28" textAnchor="middle" className="process-node-title">大庆油田</text>
      </g>
      <g data-motion="ind-jiuquan" opacity="0" transform={`translate(${jiuquan.x},${jiuquan.y})`}>
        <NodeMedallion tone="force" radius={20} active>
          <HeroEmblem name="rocket" size={22} tone="force" />
        </NodeMedallion>
        <text x="10" y="38" textAnchor="middle" className="process-node-title">酒泉航天</text>
      </g>
      <g data-motion="ind-lop" opacity="0" transform={`translate(${lop.x},${lop.y})`}>
        <NodeMedallion tone="force" radius={20} active>
          <g className="amb-atom-spin">
            <HeroEmblem name="atom-core" size={22} tone="force" />
          </g>
        </NodeMedallion>
        <text x="6" y="-28" textAnchor="middle" className="process-node-title">核试验基地</text>
      </g>

      {/* Three concentric Two-Bombs-One-Satellite rings + continuous elliptical Dongfanghong-1 orbit */}
      <g transform={`translate(${hub.x},${hub.y})`}>
        <g data-motion="ind-orbit-1" opacity="0">
          <g className="amb-atom-spin">
            <circle r="44" fill="none" className="hero-orbit-ring" />
          </g>
          <text x="0" y="-88" textAnchor="middle" className="process-edge-label">1964 · 原子弹</text>
        </g>
        <g data-motion="ind-orbit-2" opacity="0">
          <g className="amb-atom-spin amb-reverse">
            <circle r="76" fill="none" className="hero-orbit-ring hero-orbit-mid" />
          </g>
          <text x="126" y="10" textAnchor="start" className="process-edge-label">1967 · 氢弹</text>
        </g>
        <g data-motion="ind-orbit-3" opacity="0">
          <g transform="rotate(-18)">
            <path d={satOrbitD} fill="none" className="hero-orbit-sat" />
            <path d={satOrbitD} fill="none" className="amb-flow-dash amb-flow-dash-gold" aria-hidden="true" />
            <g className="amb-satellite-orbit">
              <g transform="rotate(18)">
                <g className="amb-orbit-sat">
                  <circle r="11" fill="none" stroke="var(--hero-gold, var(--story-force))" strokeWidth="1.05" className="amb-ripple-loop" aria-hidden="true" />
                  <circle r="11" fill="none" stroke="var(--story-force)" strokeWidth="0.9" className="amb-ripple-loop amb-delay-1" aria-hidden="true" />
                  <circle r="12" fill="var(--ui-bg)" stroke="var(--story-force)" strokeWidth="1.25" />
                  <HeroEmblem name="satellite" size={21} tone="force" />
                </g>
              </g>
            </g>
          </g>
          <text x="-120" y="42" textAnchor="end" className="process-edge-label">1970 · 东方红一号</text>
        </g>
        <g data-motion="ind-core" opacity="0">
          <NodeMedallion tone="force" radius={22} active>
            <g className="amb-atom-spin">
              <HeroEmblem name="atom-core" size={24} tone="force" />
            </g>
          </NodeMedallion>
        </g>
      </g>
      <PositionedRipple id="ind-ripple" x={hub.x} y={hub.y} tone="force" r={34} />

      <PositionedSeal id="ind-seal" x={950} y={528} text="独立完整工业体系 · 两弹一星" tone="organization" width={366} />
    </g>
  );
}

function animateIndustry(story, _projection, h) {
  const b0 = story.beats[0]?.at ?? 0;
  const b1 = story.beats[1]?.at ?? 7;
  const b2 = story.beats[2]?.at ?? 14;
  const b3 = story.beats[3]?.at ?? 21;

  h.pop('ind-anshan', b0 + 0.1);
  h.trace('ind-arc-1', b1 + 0.1, b1 + 1.8);
  h.show('ind-flow-1', b1 + 1.8);
  h.show('ind-comet-1', b1 + 0.1, b1 + 1.85);
  h.travel('ind-comet-1', 'ind-r1', b1 + 0.1, b1 + 1.8);
  h.pop('ind-tip-1', b1 + 1.75);
  h.pop('ind-daqing', b1 + 1.7);

  h.trace('ind-arc-2', b2 + 0.1, b2 + 1.8);
  h.show('ind-flow-2', b2 + 1.8);
  h.show('ind-comet-2', b2 + 0.1, b2 + 1.85);
  h.travel('ind-comet-2', 'ind-r2', b2 + 0.1, b2 + 1.8);
  h.pop('ind-tip-2', b2 + 1.75);
  h.pop('ind-jiuquan', b2 + 1.7);

  h.trace('ind-arc-3', b2 + 1.9, b2 + 3.0);
  h.show('ind-flow-3', b2 + 3.0);
  h.show('ind-comet-3', b2 + 1.9, b2 + 3.05);
  h.travel('ind-comet-3', 'ind-r3', b2 + 1.9, b2 + 3.0);
  h.pop('ind-tip-3', b2 + 2.95);
  h.pop('ind-lop', b2 + 2.9);

  h.pop('ind-core', b2 + 3.1);
  h.pop('ind-orbit-1', b2 + 3.4, undefined, { scaleFrom: 0.65 });
  h.pop('ind-orbit-2', b2 + 4.0, undefined, { scaleFrom: 0.72 });
  h.pop('ind-orbit-3', b2 + 4.6, undefined, { scaleFrom: 0.78 });
  h.ripple('ind-ripple', b2 + 4.7, 1.5);

  h.stamp('ind-seal', b3 + 0.08);
}

/* ========================================================================== */
/* prc-m-6: 中共十一届三中全会 (1978) — Reject Old Dogma & Reform Pivot       */
/* ========================================================================== */

function turn1978Geometry() {
  const oldBox = { x: 704, y: 294 };
  const center = { x: 944, y: 294 };
  const lines = [
    { id: 'thought', x: 1184, y: 196, label: '思想路线 · 实事求是' },
    { id: 'politic', x: 1196, y: 294, label: '政治路线 · 经济建设中心' },
    { id: 'org', x: 1184, y: 392, label: '组织路线 · 拨乱反正' },
  ];
  const breakArc = curveData(oldBox, center, { bend: -24, trimStart: 42, trimEnd: 30 });
  const fanArcs = lines.map((l, i) =>
    curveData(center, l, { bend: i === 0 ? -24 : i === 2 ? 24 : 0, trimStart: 28, trimEnd: 26 }),
  );
  return { oldBox, center, lines, breakArc, fanArcs };
}

function Turn1978Graphic() {
  const { oldBox, center, lines, breakArc, fanArcs } = turn1978Geometry();
  const lineEmblems = ['torch', 'industry-gear', 'compass-star'];
  return (
    <g className="hero-scene hero-prc-1978">
      <text x="950" y="118" textAnchor="middle" className="diagram-note">
        1978年12月 · 北京 · 建国以来具有深远意义的伟大转折
      </text>

      {/* Old constraints with PositionedReject */}
      <g data-motion="t78-old" opacity="0" transform={`translate(${oldBox.x},${oldBox.y})`}>
        <rect x="-78" y="-44" width="156" height="88" rx="12" className="hero-old-frame" />
        <text x="0" y="-8" textAnchor="middle" className="process-edge-label">“两个凡是”</text>
        <text x="0" y="18" textAnchor="middle" className="process-edge-label">以阶级斗争为纲</text>
      </g>
      <PositionedReject id="t78-reject" x={oldBox.x} y={oldBox.y} label="彻底否定" />

      {/* Break-out curve */}
      <path data-motion="t78-break-arc" data-route="t78-break" d={breakArc.d} className="process-edge process-edge-force" fill="none" opacity="0" />
      <g data-motion="t78-break-flow" opacity="0" aria-hidden="true">
        <path className="amb-flow-dash amb-flow-dash-gold" d={breakArc.d} fill="none" />
      </g>
      <MotionComet id="t78-break-comet" tone="force" />
      <ArrivalTip id="t78-break-tip" x={breakArc.ex} y={breakArc.ey} angle={breakArc.endAngle} tone="force" />

      {/* Icebreaker compass pivot */}
      <g data-motion="t78-center" opacity="0" transform={`translate(${center.x},${center.y})`}>
        <circle r="38" fill="none" stroke="var(--story-force)" strokeWidth="1" className="amb-ripple-loop" aria-hidden="true" />
        <g className="amb-breathe" aria-hidden="true">
          <circle r="40" fill="none" className="hero-compass-ring" />
        </g>
        <NodeMedallion tone="force" radius={26} active>
          <g className="amb-compass-settle">
            <HeroEmblem name="icebreaker-compass" size={28} tone="force" />
          </g>
        </NodeMedallion>
        <text x="0" y="-48" textAnchor="middle" className="process-node-title">十一届三中全会</text>
        <text x="0" y="54" textAnchor="middle" className="process-edge-label">开启改革开放新时期</text>
      </g>
      <PositionedRipple id="t78-center-ripple" x={center.x} y={center.y} tone="force" r={34} />

      {/* Three rectified lines */}
      {fanArcs.map((c, i) => (
        <g key={lines[i].id}>
          <path
            data-motion={`t78-fan-${i}`}
            data-route={`t78-route-${i}`}
            d={c.d}
            className="process-edge process-edge-organization"
            fill="none"
            opacity="0"
          />
          <g data-motion={`t78-fan-flow-${i}`} opacity="0" aria-hidden="true">
            <path className="amb-flow-dash amb-flow-dash-org" d={c.d} fill="none" />
          </g>
          <MotionComet id={`t78-comet-${i}`} tone="organization" />
          <ArrivalTip id={`t78-tip-${i}`} x={c.ex} y={c.ey} angle={c.endAngle} tone="organization" />
          <g data-motion={`t78-node-${i}`} opacity="0" transform={`translate(${lines[i].x},${lines[i].y})`}>
            <NodeMedallion tone="organization" radius={20}>
              {i === 1 ? (
                <g className="amb-gear-cw">
                  <HeroEmblem name={lineEmblems[i]} size={21} tone="org" />
                </g>
              ) : (
                <HeroEmblem name={lineEmblems[i]} size={21} tone="org" />
              )}
            </NodeMedallion>
            <text x="0" y="-28" textAnchor="middle" className="process-node-title">
              {lines[i].label}
            </text>
          </g>
        </g>
      ))}

      <g data-motion="t78-basis" opacity="0" transform="translate(950, 456)">
        <rect x="-252" y="-20" width="504" height="40" rx="20" className="hero-banner-pill" />
        <text x="0" y="5" textAnchor="middle" className="process-edge-label">
          深刻把握前途命运 · 深刻总结实践 · 洞察时代潮流 · 体悟人民期盼
        </text>
      </g>

      <PositionedSeal id="t78-seal" x={950} y={528} text="伟大转折 · 改革开放" tone="force" width={290} />
    </g>
  );
}

function animateTurn1978(story, _projection, h) {
  const b0 = story.beats[0]?.at ?? 0;
  const b1 = story.beats[1]?.at ?? 7;
  const b2 = story.beats[2]?.at ?? 14;
  const b3 = story.beats[3]?.at ?? 21;

  h.pop('t78-old', b0 + 0.1);
  h.stamp('t78-reject', b0 + 1.6);
  h.trace('t78-break-arc', b0 + 2.2, b0 + 4.3);
  h.show('t78-break-flow', b0 + 4.3);
  h.show('t78-break-comet', b0 + 2.2, b0 + 4.35);
  h.travel('t78-break-comet', 't78-break', b0 + 2.2, b0 + 4.3);
  h.pop('t78-break-tip', b0 + 4.25);
  h.pop('t78-center', b0 + 4.2);
  h.ripple('t78-center-ripple', b0 + 4.3, 1.6);

  [0, 1, 2].forEach((i) => {
    const start = b1 + 0.2 + i * 0.55;
    h.trace(`t78-fan-${i}`, start, start + 1.7);
    h.show(`t78-fan-flow-${i}`, start + 1.7);
    h.show(`t78-comet-${i}`, start, start + 1.75);
    h.travel(`t78-comet-${i}`, `t78-route-${i}`, start, start + 1.7);
    h.pop(`t78-tip-${i}`, start + 1.65);
    h.pop(`t78-node-${i}`, start + 1.6);
  });

  h.pop('t78-basis', b2 + 0.35, undefined, { dy: 8 });
  h.stamp('t78-seal', b3 + 0.08);
}

/* ========================================================================== */
/* prc-e-9: 经济特区与梯度对外开放 (1979—1990) — Coastal Opening Ripples      */
/* ========================================================================== */

function openGeometry(projection) {
  const sz = projectPlace(projection, '深圳市', [936, 412]);
  const zhRaw = projectPlace(projection, '珠海市', [896, 434]);
  // Ensure clean visual separation between Shenzhen and Zhuhai medallions.
  const zh = {
    x: Math.hypot(zhRaw.x - sz.x, zhRaw.y - sz.y) < 38 ? sz.x - 36 : zhRaw.x,
    y: Math.hypot(zhRaw.x - sz.x, zhRaw.y - sz.y) < 38 ? sz.y + 22 : zhRaw.y,
  };
  const st = projectPlace(projection, '汕头市', [996, 386]);
  const xm = projectPlace(projection, '厦门市', [1034, 344]);
  const hn = projectPlace(projection, '海南省', [802, 474]);
  const pd = projectPlace(projection, '浦东新区', [1124, 210]);
  const coastArc = curveData(sz, pd, { bend: 46, trimStart: 20, trimEnd: 24 });
  const hnArc = curveData(zh, hn, { bend: 22, trimStart: 18, trimEnd: 20 });
  const inlandArc = curveData(pd, { x: 842, y: 236 }, { bend: -22, trimStart: 24, trimEnd: 16 });
  return { sz, zh, st, xm, hn, pd, coastArc, hnArc, inlandArc };
}

function OpeningGraphic({ projection }) {
  const { sz, zh, st, xm, hn, pd, coastArc, hnArc, inlandArc } = openGeometry(projection);
  const sezs = [
    { id: 'sz', pt: sz, label: '深圳', dx: 0, dy: -24 },
    { id: 'zh', pt: zh, label: '珠海', dx: -30, dy: 24 },
    { id: 'st', pt: st, label: '汕头', dx: 34, dy: 14 },
    { id: 'xm', pt: xm, label: '厦门', dx: 34, dy: -6 },
  ];
  return (
    <g className="hero-scene hero-prc-open">
      <text x="950" y="118" textAnchor="middle" className="diagram-note">
        1980—1990 经济特区 → 沿海14城 → 海南 → 浦东梯度开放示意
      </text>

      {/* Coastal corridor arc */}
      <path data-motion="op-coast-arc" data-route="op-coast" d={coastArc.d} className="process-edge process-edge-organization" fill="none" opacity="0" />
      <g data-motion="op-coast-flow" opacity="0" aria-hidden="true">
        <path className="amb-flow-dash amb-flow-dash-gold" d={coastArc.d} fill="none" />
      </g>
      <MotionComet id="op-coast-comet" tone="organization" />
      <ArrivalTip id="op-coast-tip" x={coastArc.ex} y={coastArc.ey} angle={coastArc.endAngle} tone="organization" />

      {/* Hainan southward arc */}
      <path data-motion="op-hn-arc" data-route="op-hn" d={hnArc.d} className="process-edge process-edge-organization" fill="none" opacity="0" />
      <g data-motion="op-hn-flow" opacity="0" aria-hidden="true">
        <path className="amb-flow-dash amb-flow-dash-org" d={hnArc.d} fill="none" />
      </g>
      <ArrivalTip id="op-hn-tip" x={hnArc.ex} y={hnArc.ey} angle={hnArc.endAngle} tone="organization" />

      {/* Pudong Yangtze inland radiation */}
      <path data-motion="op-inland-arc" data-route="op-inland" d={inlandArc.d} className="process-edge process-edge-force" fill="none" opacity="0" />
      <g data-motion="op-inland-flow" opacity="0" aria-hidden="true">
        <path className="amb-flow-dash amb-flow-dash-force" d={inlandArc.d} fill="none" />
      </g>
      <MotionComet id="op-inland-comet" tone="force" />
      <ArrivalTip id="op-inland-tip" x={inlandArc.ex} y={inlandArc.ey} angle={inlandArc.endAngle} tone="force" />
      <text data-motion="op-inland-label" opacity="0" x={inlandArc.mx} y={inlandArc.my - 14} textAnchor="middle" className="process-edge-label">
        辐射长江流域与内地
      </text>

      {/* 1980 Four SEZ pearls */}
      {sezs.map((s) => (
        <g key={s.id} data-motion={`op-${s.id}`} opacity="0" transform={`translate(${s.pt.x},${s.pt.y})`}>
          {(s.id === 'sz' || s.id === 'xm') && (
            <circle
              r="18"
              fill="none"
              stroke="var(--hero-gold, var(--story-force))"
              strokeWidth="1"
              className={s.id === 'xm' ? 'amb-ripple-loop amb-delay-1' : 'amb-ripple-loop'}
              aria-hidden="true"
            />
          )}
          <NodeMedallion tone="force" radius={16} active={s.id === 'sz'}>
            <HeroEmblem name="port-crane" size={18} tone="force" />
          </NodeMedallion>
          <text x={s.dx} y={s.dy} textAnchor="middle" className="process-node-title">
            {s.label}
          </text>
        </g>
      ))}
      <PositionedRipple id="op-sz-ripple" x={sz.x} y={sz.y} tone="force" r={26} />

      {/* 1984 badge */}
      <g data-motion="op-1984" opacity="0" transform={`translate(${coastArc.mx + 78},${coastArc.my + 8})`}>
        <rect x="-86" y="-17" width="172" height="34" rx="17" className="hero-banner-pill" />
        <text x="0" y="5" textAnchor="middle" className="process-edge-label">1984 · 14个沿海城市</text>
      </g>

      {/* 1988 Hainan */}
      <g data-motion="op-hn" opacity="0" transform={`translate(${hn.x},${hn.y})`}>
        <circle r="20" fill="none" stroke="var(--story-organization)" strokeWidth="0.95" className="amb-ripple-loop" aria-hidden="true" />
        <NodeMedallion tone="organization" radius={18}>
          <HeroEmblem name="port-crane" size={20} tone="org" />
        </NodeMedallion>
        <text x="-30" y="5" textAnchor="end" className="process-node-title">1988 · 海南特区</text>
      </g>
      <PositionedRipple id="op-hn-ripple" x={hn.x} y={hn.y} tone="organization" r={24} />

      {/* 1990 Pudong */}
      <g data-motion="op-pd" opacity="0" transform={`translate(${pd.x},${pd.y})`}>
        <circle r="25" fill="none" stroke="var(--hero-gold, var(--story-force))" strokeWidth="1.05" className="amb-ripple-loop" aria-hidden="true" />
        <NodeMedallion tone="force" radius={23} active>
          <g className="amb-breathe">
            <HeroEmblem name="skyline-tower" size={25} tone="force" />
          </g>
        </NodeMedallion>
        <text x="0" y="-32" textAnchor="middle" className="process-node-title">1990 · 上海浦东</text>
      </g>
      <PositionedRipple id="op-pd-ripple" x={pd.x} y={pd.y} tone="force" r={32} />

      <PositionedSeal id="op-seal" x={1105} y={520} text="点—线—面 · 梯度对外开放" tone="organization" width={300} />
    </g>
  );
}

function animateOpening(story, _projection, h) {
  const b0 = story.beats[0]?.at ?? 0;
  const b1 = story.beats[1]?.at ?? 7;
  const b2 = story.beats[2]?.at ?? 14;
  const b3 = story.beats[3]?.at ?? 21;

  ['sz', 'zh', 'st', 'xm'].forEach((id, i) => {
    h.pop(`op-${id}`, b0 + 0.15 + i * 0.45);
  });
  h.ripple('op-sz-ripple', b0 + 0.3, 1.5);

  h.trace('op-coast-arc', b1 + 0.15, b1 + 2.4);
  h.show('op-coast-flow', b1 + 2.4);
  h.show('op-coast-comet', b1 + 0.15, b1 + 2.45);
  h.travel('op-coast-comet', 'op-coast', b1 + 0.15, b1 + 2.4);
  h.pop('op-coast-tip', b1 + 2.35);
  h.pop('op-1984', b1 + 1.0);

  h.trace('op-hn-arc', b2 + 0.15, b2 + 1.7);
  h.show('op-hn-flow', b2 + 1.7);
  h.pop('op-hn-tip', b2 + 1.65);
  h.pop('op-hn', b2 + 1.6);
  h.ripple('op-hn-ripple', b2 + 1.65, 1.4);

  h.pop('op-pd', b3 + 0.04);
  h.ripple('op-pd-ripple', b3 + 0.08, 1.5);
  h.trace('op-inland-arc', b3 + 0.12, b3 + 2.1);
  h.show('op-inland-flow', b3 + 2.1);
  h.show('op-inland-comet', b3 + 0.12, b3 + 2.15);
  h.travel('op-inland-comet', 'op-inland', b3 + 0.12, b3 + 2.1);
  h.pop('op-inland-tip', b3 + 2.05);
  h.pop('op-inland-label', b3 + 0.9);
  h.stamp('op-seal', b3 + 0.1);
}

/* ========================================================================== */
/* prc-m-19: 中共二十大与中国式现代化 (2022) — Three Leaps & Sunburst Star    */
/* ========================================================================== */

function modern20Geometry() {
  const leaps = [
    { id: 'l1', x: 700, y: 410, year: '1949', label: '站起来', emblem: 'rostrum' },
    { id: 'l2', x: 794, y: 312, year: '1978', label: '富起来', emblem: 'port-crane' },
    { id: 'l3', x: 950, y: 270, year: '2012—新时代', label: '强起来', emblem: 'skyline-tower' },
  ];
  const center = { x: 950, y: 270 };
  const leapArc1 = curveData(leaps[0], leaps[1], { bend: -26, trimStart: 24, trimEnd: 24 });
  const leapArc2 = curveData(leaps[1], leaps[2], { bend: -26, trimStart: 24, trimEnd: 30 });
  const traits = [
    { id: 't0', x: 1122, y: 180, label: '人口规模巨大', emblem: 'mod-people' },
    { id: 't1', x: 1212, y: 252, label: '全体人民共同富裕', emblem: 'mod-prosperity' },
    { id: 't2', x: 1202, y: 338, label: '物质与精神相协调', emblem: 'mod-culture' },
    { id: 't3', x: 1110, y: 408, label: '人与自然和谐共生', emblem: 'mod-eco' },
    { id: 't4', x: 960, y: 432, label: '走和平发展道路', emblem: 'mod-peace' },
  ];
  const traitArcs = traits.map((t, i) =>
    curveData(center, t, { bend: i % 2 ? 16 : -16, trimStart: 30, trimEnd: 20 }),
  );
  // 12 local-space circular sunburst rays centered at (0,0), offset 15 deg so zero rays are flat H/V
  const rays = Array.from({ length: 12 }, (_, i) => {
    const rad = ((i * 30 + 15 - 90) * Math.PI) / 180;
    const primary = i % 2 === 0;
    const rOut = primary ? 72 : 58;
    return {
      primary,
      x1: Math.cos(rad) * 34,
      y1: Math.sin(rad) * 34,
      x2: Math.cos(rad) * rOut,
      y2: Math.sin(rad) * rOut,
    };
  });
  return { leaps, center, leapArc1, leapArc2, traits, traitArcs, rays };
}

function Modern20Graphic() {
  const { leaps, center, leapArc1, leapArc2, traits, traitArcs, rays } = modern20Geometry();
  return (
    <g className="hero-scene hero-prc-20th">
      <text x="950" y="118" textAnchor="middle" className="diagram-note">
        三次历史性飞跃与中国式现代化五个中国特色示意
      </text>

      {/* Echo of e-47 12 sunburst rays slowly rotating around New Era center */}
      <g transform={`translate(${center.x},${center.y})`} aria-hidden="true">
        <g data-motion="m20-rays" opacity="0">
          <g className="amb-sunburst-spin">
            {rays.map((r, i) => (
              <line
                key={i}
                x1={r.x1.toFixed(1)}
                y1={r.y1.toFixed(1)}
                x2={r.x2.toFixed(1)}
                y2={r.y2.toFixed(1)}
                className={r.primary ? 'hero-sun-ray' : 'hero-sun-ray hero-sunburst-ray-sub'}
              />
            ))}
          </g>
        </g>
      </g>

      {/* Three leaps rising arcs */}
      <path data-motion="m20-leap-1" data-route="m20-r1" d={leapArc1.d} className="process-edge process-edge-organization" fill="none" opacity="0" />
      <g data-motion="m20-leap-flow-1" opacity="0" aria-hidden="true">
        <path className="amb-flow-dash amb-flow-dash-gold" d={leapArc1.d} fill="none" />
      </g>
      <MotionComet id="m20-comet-1" tone="organization" />
      <ArrivalTip id="m20-tip-1" x={leapArc1.ex} y={leapArc1.ey} angle={leapArc1.endAngle} tone="organization" />

      <path data-motion="m20-leap-2" data-route="m20-r2" d={leapArc2.d} className="process-edge process-edge-force" fill="none" opacity="0" />
      <g data-motion="m20-leap-flow-2" opacity="0" aria-hidden="true">
        <path className="amb-flow-dash amb-flow-dash-gold" d={leapArc2.d} fill="none" />
      </g>
      <MotionComet id="m20-comet-2" tone="force" />
      <ArrivalTip id="m20-tip-2" x={leapArc2.ex} y={leapArc2.ey} angle={leapArc2.endAngle} tone="force" />

      {/* Leap nodes */}
      {leaps.slice(0, 2).map((l, i) => (
        <g key={l.id} data-motion={`m20-l-${i}`} opacity="0" transform={`translate(${l.x},${l.y})`}>
          <NodeMedallion tone="organization" radius={21}>
            <HeroEmblem name={l.emblem} size={22} tone="org" />
          </NodeMedallion>
          <text x="0" y="-30" textAnchor="middle" className="process-edge-label">{l.year}</text>
          <text x="0" y="38" textAnchor="middle" className="process-node-title">{l.label}</text>
        </g>
      ))}

      {/* Center 20th Congress star */}
      <g data-motion="m20-center" opacity="0" transform={`translate(${center.x},${center.y})`}>
        <circle r="32" fill="none" stroke="var(--hero-gold, var(--story-force))" strokeWidth="1.15" className="amb-ripple-loop" aria-hidden="true" />
        <NodeMedallion tone="force" radius={28} active>
          <g className="amb-breathe">
            <HeroEmblem name="skyline-tower" size={29} tone="force" />
          </g>
        </NodeMedallion>
        <text x="0" y="-42" textAnchor="middle" className="process-node-title">中共二十大 · 强起来</text>
      </g>
      <PositionedRipple id="m20-ripple" x={center.x} y={center.y} tone="force" r={36} />

      {/* Five distinctive characteristics radiating */}
      {traits.map((t, i) => (
        <g key={t.id}>
          <path
            data-motion={`m20-tarc-${i}`}
            d={traitArcs[i].d}
            className="process-edge process-edge-organization"
            fill="none"
            opacity="0"
          />
          <g data-motion={`m20-tflow-${i}`} opacity="0" aria-hidden="true">
            <path className="amb-flow-dash amb-flow-dash-org" d={traitArcs[i].d} fill="none" />
          </g>
          <g data-motion={`m20-trait-${i}`} opacity="0" transform={`translate(${t.x},${t.y})`}>
            <NodeMedallion tone="organization" radius={16}>
              <HeroEmblem name={t.emblem} size={19} tone="org" />
            </NodeMedallion>
            <text x="0" y={i === 4 ? 32 : -24} textAnchor="middle" className="process-edge-label">
              {t.label}
            </text>
          </g>
        </g>
      ))}

      <PositionedSeal id="m20-seal" x={950} y={530} text="中国式现代化 · 民族复兴" tone="force" width={332} />
    </g>
  );
}

function animateModern20(story, _projection, h) {
  const b0 = story.beats[0]?.at ?? 0;
  const b1 = story.beats[1]?.at ?? 7;
  const b2 = story.beats[2]?.at ?? 14;
  const b3 = story.beats[3]?.at ?? 21;

  h.pop('m20-l-0', b0 + 0.1);
  h.trace('m20-leap-1', b0 + 0.55, b0 + 2.1);
  h.show('m20-leap-flow-1', b0 + 2.1);
  h.show('m20-comet-1', b0 + 0.55, b0 + 2.15);
  h.travel('m20-comet-1', 'm20-r1', b0 + 0.55, b0 + 2.1);
  h.pop('m20-tip-1', b0 + 2.05);
  h.pop('m20-l-1', b0 + 2.0);

  h.trace('m20-leap-2', b0 + 2.5, b0 + 4.2);
  h.show('m20-leap-flow-2', b0 + 4.2);
  h.show('m20-comet-2', b0 + 2.5, b0 + 4.25);
  h.travel('m20-comet-2', 'm20-r2', b0 + 2.5, b0 + 4.2);
  h.pop('m20-tip-2', b0 + 4.15);

  h.pop('m20-center', b1 + 0.1);
  h.pop('m20-rays', b1 + 0.3, undefined, { scaleFrom: 0.72 });
  h.ripple('m20-ripple', b1 + 0.25, 1.7);

  [0, 1, 2, 3, 4].forEach((i) => {
    const start = b2 + 0.1 + i * 0.38;
    h.trace(`m20-tarc-${i}`, start, start + 1.0);
    h.show(`m20-tflow-${i}`, start + 1.0);
    h.pop(`m20-trait-${i}`, start + 0.88);
  });

  h.stamp('m20-seal', b3 + 0.08);
}

export const PRC_HEROES = {
  'prc-e-1': { Graphic: KmyzGraphic, animate: animateKmyz },
  'prc-e-5': { Graphic: System1956Graphic, animate: animateSystem1956 },
  'prc-e-6': { Graphic: IndustryGraphic, animate: animateIndustry },
  'prc-m-6': { Graphic: Turn1978Graphic, animate: animateTurn1978 },
  'prc-e-9': { Graphic: OpeningGraphic, animate: animateOpening },
  'prc-m-19': { Graphic: Modern20Graphic, animate: animateModern20 },
};
