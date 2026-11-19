import { Bank, BookOpenText, Factory, FileText, Handshake, MagnifyingGlass, User, Plant, Scroll, ShieldChevron, UsersThree, XCircle } from '@phosphor-icons/react';

export function hasPeople(label) {
  return !/建设|制度|纲领|主义|方针|政策|专政|文艺/.test(label) && /群众|民众|人民|市民|农民|工人|学生|代表|人士|各界|各阶层|各党派|军队|方面军|共产党|国民党|力量|势力|阶级|中间派|海员/.test(label);
}

function estimateTextUnits(text) {
  let units = 0;
  for (const ch of String(text || '')) {
    units += /[\u0000-\u00ff\s·]/.test(ch) ? 0.54 : 1.04;
  }
  return units;
}

/** Crisp double-ring archival medallion with opaque backing so lines never show behind icons. */
export function NodeMedallion({ radius = 28, tone, active = false, className = '', children }) {
  const innerR = Math.max(10, radius - 4.6);
  const tickIn = radius - 3.6;
  const tickOut = radius - 0.8;
  const toneClass = tone ? `node-medallion-${tone} tone-${tone}` : '';
  return <g className={`node-medallion ${toneClass} ${active ? 'is-active' : ''} ${className}`.trim()}>
    <circle className="node-medallion-outer" r={radius} fill="var(--ui-bg)" stroke="currentColor" strokeWidth="1.65"/>
    <circle className="node-medallion-inner" r={innerR} fill="currentColor" fillOpacity="0.07" stroke="currentColor" strokeWidth="0.85" strokeOpacity="0.44"/>
    <path
      className="node-medallion-ticks"
      d={`M0 ${-tickOut} V${-tickIn} M0 ${tickIn} V${tickOut} M${-tickOut} 0 H${-tickIn} M${tickIn} 0 H${tickOut}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="0.9"
      strokeOpacity="0.42"
    />
    {children}
  </g>;
}

export function StoryGlyph({ label = '', size = 38, tone, framed = true, active = false, className = '', ...props }) {
  const Icon = /失败|未实施|未实行|受挫/.test(label) ? XCircle
    : /考察|调查|分析|认识/.test(label) ? MagnifyingGlass
    : /土地|农村|农民/.test(label) ? Plant
    : /企业|工商业|生产|资本/.test(label) ? Factory
    : /武装|军|抗战|起义|斗争/.test(label) ? ShieldChevron
    : /合作|联合|联盟|团结|一致|停止内战|和平/.test(label) ? Handshake
    : /政府|政权|共和国|城市/.test(label) ? Bank
    : /纲领|约法|宣言|条约|决议|制度/.test(label) ? Scroll
    : hasPeople(label) ? UsersThree
    : /理论|思想|主义|学习|学堂|留学|教育|实践|科学|文化/.test(label) ? BookOpenText : FileText;

  if (!framed) {
    return <Icon x={-size / 2} y={-size / 2} size={size} weight="regular" {...props}/>;
  }

  const radius = Math.round(size * 0.68);
  const iconSize = Math.round(size * 0.56);
  return <NodeMedallion radius={radius} tone={tone} active={active} className={className}>
    <Icon x={-iconSize / 2} y={-iconSize / 2} size={iconSize} weight="regular" {...props}/>
  </NodeMedallion>;
}

/** Concentric double-ring shockwave for arrival impacts (driven by ripple() at local 0,0). */
export function ArrivalRipple({ r = 28, tone = 'organization', className = '' }) {
  const toneClass = tone === 'organization'
    ? 'arrival-ripple-org tone-organization'
    : `arrival-ripple-${tone} tone-${tone}`;
  return <g className={`arrival-ripple ${toneClass} ${className}`.trim()}>
    <circle r={r} fill="none"/>
    <circle r={Math.round(r * 0.68)} fill="none" strokeDasharray="3 3"/>
  </g>;
}

/** Editorial cinnabar/archival conclusion seal with double frame and ruled underline. */
export function SealStamp({ text, subtext, tone = 'force', width, className = '' }) {
  const safeText = String(text || '');
  const boxW = width || Math.max(168, Math.min(468, Math.round(estimateTextUnits(safeText) * 24.5 + 60)));
  const boxH = 48;
  const halfW = boxW / 2;
  const halfH = boxH / 2;
  const toneClass = tone === 'organization' ? 'seal-stamp-org tone-organization' : `seal-stamp-${tone}`;
  const inX = halfW - 4;
  const inY = halfH - 4;

  return <g className={`seal-stamp ${toneClass} ${className}`.trim()}>
    <rect className="seal-stamp-frame" x={-halfW} y={-halfH} width={boxW} height={boxH} rx="3"/>
    <path
      d={`M${-inX} ${-inY} H${inX} V${inY} H${-inX} Z`}
      strokeOpacity="0.34"
      strokeWidth="0.75"
    />
    <path
      d={`M${-halfW + 11} -4 L${-halfW + 17} -4 L${-halfW + 17} 4 L${-halfW + 11} 4 Z`}
      strokeOpacity="0.82"
      strokeWidth="1.4"
    />
    <line className="seal-stamp-rule" x1={-halfW + 14} y1={halfH + 6} x2={halfW - 14} y2={halfH + 6} strokeOpacity="0.68"/>
    <text className="seal-stamp-text" x="4" y="7" textAnchor="middle">{safeText}</text>
    {subtext && <text className="process-node-note seal-stamp-sub" x="0" y={halfH + 28} textAnchor="middle">{subtext}</text>}
  </g>;
}

/** Angled cinnabar cancel/rejection stamp centered at local (0,0). */
export function RejectSeal({ label = '否决', angle = -13, className = '' }) {
  const safeLabel = String(label || '否决');
  const boxW = Math.max(86, Math.round(estimateTextUnits(safeLabel) * 20.5 + 32));
  const boxH = 36;
  const halfW = boxW / 2;
  const halfH = boxH / 2;
  const inX = halfW - 3.5;
  const inY = halfH - 3.5;

  return <g className={`reject-seal ${className}`.trim()} transform={`rotate(${angle})`}>
    <rect className="seal-stamp-frame" x={-halfW} y={-halfH} width={boxW} height={boxH} rx="2.5"/>
    <path
      d={`M${-inX} ${-inY} H${inX} V${inY} H${-inX} Z`}
      strokeOpacity="0.48"
      strokeWidth="0.8"
    />
    <text className="reject-seal-label" x="0" y="6" textAnchor="middle">{safeLabel}</text>
  </g>;
}

/** Glowing path-tip indicator using MapScene's #map-glow-force / #map-glow-org filters. */
export function CometHead({ tone = 'organization', r = 4.6, className = '' }) {
  const isForce = tone === 'force';
  const glow = isForce ? 'url(#map-glow-force)' : 'url(#map-glow-org)';
  return <g className={`comet-head ${isForce ? 'comet-head-force tone-force' : ''} ${className}`.trim()}>
    <circle className="comet-head-halo" r={r * 2.1} filter={glow}/>
    <circle r={r} filter={glow}/>
  </g>;
}

/** Neutral unit counters, not historical insignia or literal unit counts. */
export function Formation({ size = 1 }) {
  return <g className="formation-symbol" transform={`scale(${size})`}>
    <rect className="formation-rear" x="-36" y="-19" width="17" height="12" rx="1.5"/>
    <rect className="formation-rear" x="-36" y="7" width="17" height="12" rx="1.5"/>
    <path className="formation-tether" d="M-19 -13 L-12 -6 M-19 13 L-12 6" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.45"/>
    <rect className="formation-counter" x="-12" y="-11" width="26" height="22" rx="2"/>
    <path className="formation-cross" d="M-9 -8 L11 8 M-9 8 L11 -8"/>
    <circle cx="1" cy="0" r="1.8" fill="currentColor" fillOpacity="0.7"/>
    <path className="formation-direction" d="M20 -7.5 L32 0 L20 7.5 L22.5 0 Z"/>
  </g>;
}

export function Person({ size = 23, ...props }) {
  return <User x={-size / 2} y={-size / 2} size={size} weight="duotone" {...props}/>;
}

/** Layered archival dossier stack with opaque sheet backing; optionally framed in a medallion. */
export function PaperStack({ size = 40, framed = false, tone = 'organization' }) {
  const s = framed ? Math.round(size * 0.56) : size;
  const w = s * 0.72;
  const h = s * 0.88;
  const stack = <g className="paper-stack">
    <rect x={-w / 2 + 5} y={-h / 2 - 4} width={w} height={h} rx="2" fill="var(--ui-bg)" stroke="currentColor" strokeWidth="1" strokeOpacity="0.34"/>
    <rect x={-w / 2 + 2.5} y={-h / 2 - 2} width={w} height={h} rx="2" fill="var(--ui-bg)" stroke="currentColor" strokeWidth="1.15" strokeOpacity="0.56"/>
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="2" fill="var(--ui-bg)" stroke="currentColor" strokeWidth="1.5"/>
    <path
      d={`M${-w / 2 + 4.5} ${-h / 2 + h * 0.3} H${w / 2 - 4.5} M${-w / 2 + 4.5} ${-h / 2 + h * 0.52} H${w / 2 - 5.5} M${-w / 2 + 4.5} ${-h / 2 + h * 0.74} H${w / 2 - 9}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeOpacity="0.72"
    />
  </g>;

  if (!framed) return stack;
  return <NodeMedallion radius={Math.round(size * 0.68)} tone={tone}>
    {stack}
  </NodeMedallion>;
}

/** Editorial toothed flywheel gear centered at (0, 0) for cycle apparatuses. */
export function GearWheel({ radius = 39, teeth = 12, tone = 'organization', innerRadius, className = '' }) {
  const outerR = radius;
  const toothDepth = Math.max(4.2, Math.min(7, radius * 0.14));
  const rootR = outerR - toothDepth;
  const pitchR = Math.max(8, rootR - 3.2);
  const hubR = innerRadius ?? Math.round(radius * 0.44);
  const step = (Math.PI * 2) / teeth;
  const pts = [];

  for (let i = 0; i < teeth; i += 1) {
    const a0 = i * step;
    const a1 = a0 + step * 0.18;
    const a2 = a0 + step * 0.34;
    const a3 = a0 + step * 0.62;
    const a4 = a0 + step * 0.78;
    pts.push(
      [Math.cos(a0) * rootR, Math.sin(a0) * rootR],
      [Math.cos(a1) * rootR, Math.sin(a1) * rootR],
      [Math.cos(a2) * outerR, Math.sin(a2) * outerR],
      [Math.cos(a3) * outerR, Math.sin(a3) * outerR],
      [Math.cos(a4) * rootR, Math.sin(a4) * rootR],
    );
  }
  const gearPath = `${pts.map(([x, y], idx) => `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} Z`;
  const spokeCount = teeth >= 10 ? 6 : 4;
  const spokes = Array.from({ length: spokeCount }, (_, i) => {
    const a = (i * Math.PI * 2) / spokeCount;
    return `M${(Math.cos(a) * hubR).toFixed(1)},${(Math.sin(a) * hubR).toFixed(1)} L${(Math.cos(a) * pitchR).toFixed(1)},${(Math.sin(a) * pitchR).toFixed(1)}`;
  }).join(' ');

  const toneClass = tone === 'force' ? 'tone-force' : tone === 'plan' ? 'tone-plan' : 'tone-organization';
  return <g className={`proc-gear ${toneClass} ${className}`.trim()}>
    <path
      className="proc-gear-teeth"
      d={gearPath}
      fill="currentColor"
      fillOpacity="0.08"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeOpacity="0.62"
      strokeLinejoin="round"
    />
    <circle
      className="proc-gear-ring"
      r={pitchR.toFixed(1)}
      fill="none"
      stroke="currentColor"
      strokeWidth="0.9"
      strokeDasharray="3 3"
      strokeOpacity="0.44"
    />
    <path
      className="proc-gear-spokes"
      d={spokes}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.05"
      strokeOpacity="0.38"
      strokeLinecap="round"
    />
    <circle
      className="proc-gear-hub"
      r={hubR}
      fill="var(--ui-bg)"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeOpacity="0.56"
    />
  </g>;
}

/** Kinetic archival cinnabar deed-seal stamp centered at (0, 0) for land policy apparatuses. */
export function DeedStamp({ label = '红契', sublabel, tone = 'force', size = 44, angle = -8, className = '' }) {
  const half = size / 2;
  const inner = half - 4;
  const toneClass = tone === 'organization' ? 'tone-organization' : 'tone-force';
  const chars = Array.from(String(label || '契')).slice(0, 2);
  return <g className={`proc-deed-stamp ${toneClass} ${className}`.trim()}>
    <g className="amb-breathe" aria-hidden="true">
      <circle
        className="proc-deed-stamp-glow"
        r={(half + 7).toFixed(1)}
        fill="currentColor"
        fillOpacity="0.09"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeOpacity="0.3"
        strokeDasharray="3 4"
      />
    </g>
    <g transform={`rotate(${angle})`}>
      <rect
        className="proc-deed-stamp-frame"
        x={-half}
        y={-half}
        width={size}
        height={size}
        rx="3.5"
        fill="var(--ui-bg)"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x={-inner}
        y={-inner}
        width={inner * 2}
        height={inner * 2}
        rx="2"
        fill="currentColor"
        fillOpacity="0.11"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeOpacity="0.55"
      />
      <path
        d={`M${-half + 3} ${-half + 9} V${-half + 3} H${-half + 9} M${half - 9} ${-half + 3} H${half - 3} V${-half + 9} M${-half + 3} ${half - 9} V${half - 3} H${-half + 9} M${half - 9} ${half - 3} H${half - 3} V${half - 9}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeOpacity="0.72"
      />
      <text className="proc-deed-stamp-glyph" x="0" y="6" textAnchor="middle">{chars.join('')}</text>
    </g>
    {sublabel && <text className="process-node-note proc-deed-stamp-sub" x="0" y={half + 19} textAnchor="middle">{sublabel}</text>}
  </g>;
}

/** Editorial red thumbprint covenant seal centered at (0, 0) for Xiaogang contract reform. */
export function ThumbprintSeal({ label = '18枚红手印', sublabel = '小岗村契约', size = 28, className = '' }) {
  const s = size / 28;
  return <g className={`proc-thumbprint-seal ${className}`.trim()}>
    <g className="amb-breathe" aria-hidden="true">
      <circle
        className="proc-deed-stamp-glow"
        r={(26 * s).toFixed(1)}
        fill="currentColor"
        fillOpacity="0.09"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeOpacity="0.32"
      />
    </g>
    <circle
      className="proc-thumbprint-badge"
      r={(21 * s).toFixed(1)}
      fill="var(--ui-bg)"
      stroke="currentColor"
      strokeWidth="1.65"
    />
    <g transform={`scale(${s.toFixed(2)})`} fill="none" stroke="currentColor" strokeLinecap="round">
      <path d="M-8,-4 C-8,-11 8,-11 8,-4 C8,3 7,8 4,11" strokeWidth="1.35" strokeOpacity="0.88"/>
      <path d="M-5.2,-3.5 C-5.2,-8 5.2,-8 5.2,-3.5 C5.2,2 4.5,6 2,9.5" strokeWidth="1.35" strokeOpacity="0.9"/>
      <path d="M-2.5,-3 C-2.5,-5.4 2.5,-5.4 2.5,-3 C2.5,1 1.8,4.5 -0.4,7.8" strokeWidth="1.35" strokeOpacity="0.92"/>
      <path d="M-8,1 C-7.5,5.5 -5.8,9 -3,11" strokeWidth="1.3" strokeOpacity="0.78"/>
      <path d="M-5,1.5 C-4.8,5 -3.6,7.8 -1.8,10" strokeWidth="1.3" strokeOpacity="0.82"/>
      <path d="M0,-2.2 V2.2" strokeWidth="1.4"/>
    </g>
    {label && <text className="process-node-note proc-deed-stamp-sub" x="0" y={(38 * s).toFixed(1)} textAnchor="middle">{label}</text>}
    {sublabel && <text className="process-node-note proc-deed-stamp-sub" x="0" y={(54 * s).toFixed(1)} textAnchor="middle">{sublabel}</text>}
  </g>;
}

/** Calm low-opacity rotating tactical radar sweep sector centered at (0, 0). */
export function RadarSector({ radius = 130, angle = 44, tone = 'organization', className = '' }) {
  const startRad = (-angle * Math.PI) / 180;
  const x0 = Math.cos(startRad) * radius;
  const y0 = Math.sin(startRad) * radius;
  const midRad = (-angle * 0.45 * Math.PI) / 180;
  const xm = Math.cos(midRad) * radius;
  const ym = Math.sin(midRad) * radius;
  const toneClass = tone === 'force' ? 'tone-force' : 'tone-organization';
  return <g className={`proc-radar-sector ${toneClass} ${className}`.trim()}>
    <path
      className="proc-radar-wedge"
      d={`M0,0 L${x0.toFixed(1)},${y0.toFixed(1)} A${radius},${radius} 0 0 1 ${radius.toFixed(1)},0 Z`}
      fill="currentColor"
      fillOpacity="0.07"
      stroke="none"
    />
    <path
      className="proc-radar-wedge"
      d={`M0,0 L${xm.toFixed(1)},${ym.toFixed(1)} A${radius},${radius} 0 0 1 ${radius.toFixed(1)},0 Z`}
      fill="currentColor"
      fillOpacity="0.08"
      stroke="none"
    />
    <line
      className="proc-radar-arm"
      x1="0"
      y1="0"
      x2={radius.toFixed(1)}
      y2="0"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeOpacity="0.58"
      strokeLinecap="round"
    />
    <circle cx={(radius * 0.68).toFixed(1)} cy="0" r="2.6" fill="currentColor" fillOpacity="0.72"/>
  </g>;
}
