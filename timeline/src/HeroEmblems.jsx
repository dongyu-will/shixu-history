/**
 * Bespoke editorial-archival SVG emblems for all 12 Hero scenes (Vol I + Vol II).
 * Every silhouette is authored centered at (0, 0) in a -16..16 local box using
 * `currentColor` strokes and subtle duotone fills for crisp Day & Night contrast.
 */

const TONE_COLOR = {
  org: 'var(--story-organization)',
  organization: 'var(--story-organization)',
  force: 'var(--story-force)',
  plan: 'var(--story-plan)',
  gold: 'var(--hero-gold, var(--motion-sector-2))',
  inherit: 'currentColor',
};

/** Symmetric 8-tooth precision mechanical gear centered strictly at (0, 0). */
const GEAR_TEETH_PATH = (() => {
  const teeth = 8;
  const rOuter = 13.2;
  const rRoot = 9.6;
  const step = (Math.PI * 2) / teeth;
  const pts = [];
  for (let i = 0; i < teeth; i += 1) {
    const a0 = i * step - step * 0.28;
    const a1 = i * step - step * 0.16;
    const a2 = i * step + step * 0.16;
    const a3 = i * step + step * 0.28;
    pts.push([Math.cos(a0) * rRoot, Math.sin(a0) * rRoot]);
    pts.push([Math.cos(a1) * rOuter, Math.sin(a1) * rOuter]);
    pts.push([Math.cos(a2) * rOuter, Math.sin(a2) * rOuter]);
    pts.push([Math.cos(a3) * rRoot, Math.sin(a3) * rRoot]);
  }
  return `${pts.map(([x, y], idx) => `${idx === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')} Z`;
})();

const EMBLEM_RENDERERS = {
  /* ---------------- Vol I: Modern Chinese History (1840-1949) ---------------- */

  warship: () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-13,4 L-10,9.8 H10 L13,4 L8.8,5.2 H-8.8 Z" fill="currentColor" fillOpacity="0.2" strokeWidth="1.5" />
      <path d="M-2,4.8 V-12.5 M5.5,4.8 V-9" strokeWidth="1.3" />
      <path d="M-8.2,-9.5 Q-10.2,-4.2 -8.4,1.2 H3.8 Q2.2,-4.2 3.8,-9.5 Z" fill="currentColor" fillOpacity="0.14" strokeWidth="1.35" />
      <path d="M5.5,-7.5 Q10.2,-3.8 11.2,1.6 H5.5 Z" fill="currentColor" fillOpacity="0.12" strokeWidth="1.25" />
      <path d="M-2,-12.5 L3.2,-11 L-2,-9.5" strokeWidth="1.15" />
      <path d="M-14,12.5 Q-7,14.6 0,12.5 T14,12.5" strokeWidth="1.15" strokeOpacity="0.72" />
    </g>
  ),

  'treaty-crack': () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M-11,-11 H-1.2 L-3.2,-4.2 L0.8,0.8 L-3,6 L-1.2,11 H-11 A2,2 0 0 1 -13,9 V-9 A2,2 0 0 1 -11,-11 Z"
        fill="currentColor"
        fillOpacity="0.13"
        strokeWidth="1.4"
      />
      <path
        d="M2.8,-11 H11 A2,2 0 0 1 13,-9 V9 A2,2 0 0 1 11,11 H2.8 L0.8,6 L4.6,0.8 L0.8,-4.2 Z"
        fill="currentColor"
        fillOpacity="0.13"
        strokeWidth="1.4"
      />
      <path d="M-9.5,-5.5 H-5.2 M-9.5,-1 H-5.6 M-9.5,3.6 H-5.8" strokeWidth="1" strokeOpacity="0.68" />
      <path d="M5.4,-5.5 H9.5 M5.8,-1 H9.5 M5.4,3.6 H9.2" strokeWidth="1" strokeOpacity="0.68" />
      <path d="M1,-12.8 L-1.8,-4.2 L2.5,0.8 L-1.6,6.2 L1.2,12.8" strokeWidth="1.7" />
    </g>
  ),

  torch: () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M0,-14.4 C4.8,-10.4 6.6,-6 4.1,-2.2 C2.9,-0.5 1.8,0.2 0,0.2 C-1.8,0.2 -2.9,-0.5 -4.1,-2.2 C-6.6,-6 -4.8,-10.4 0,-14.4 Z"
        fill="currentColor"
        fillOpacity="0.22"
        strokeWidth="1.5"
      />
      <path d="M0,-9.6 C2,-7 2.4,-4.2 0,-1.8 C-2.4,-4.2 -2,-7 0,-9.6 Z" fill="currentColor" fillOpacity="0.46" strokeWidth="1" />
      <path d="M-6.2,0.6 H6.2 L4.4,4.8 H-4.4 Z" fill="currentColor" fillOpacity="0.16" strokeWidth="1.4" />
      <path d="M-2.6,4.8 L-1.4,13.6 H1.4 L2.6,4.8 Z" fill="currentColor" fillOpacity="0.16" strokeWidth="1.35" />
      <path d="M-8.8,-7.4 L-11,-9 M8.8,-7.4 L11,-9 M-8.4,-2 L-11,-2 M8.4,-2 L11,-2" strokeWidth="1.1" strokeOpacity="0.66" />
    </g>
  ),

  'red-boat-emblem': () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-13.2,9.8 Q-6.6,12 0,9.8 T13.2,9.8" strokeWidth="1.15" strokeOpacity="0.7" />
      <path d="M-13.5,2.4 Q-10.4,7.2 -5.4,7.6 H6.4 Q11,7.2 13.5,2.8 L9.4,3.4 H-9.4 Z" fill="currentColor" fillOpacity="0.24" strokeWidth="1.4" />
      <path d="M-7.4,3.4 L-6.8,-2.8 H7.2 L7.8,3.4 Z" fill="currentColor" fillOpacity="0.08" strokeWidth="1.3" />
      <path d="M-4.6,-0.6 H-2.2 M-1.2,-0.6 H1.2 M2.2,-0.6 H4.6" strokeWidth="1.4" />
      <path
        d="M-10.5,-2.4 Q-5,-8.4 0.2,-8.8 Q5.4,-8.4 11,-2.4 Q5,-4 0.2,-4.1 Q-4.8,-4 -10.5,-2.4 Z"
        fill="currentColor"
        fillOpacity="0.24"
        strokeWidth="1.35"
      />
      <path
        d="M0,-14 L0.9,-11.8 L3.2,-11.8 L1.3,-10.4 L2,-8.4 L0,-9.6 L-2,-8.4 L-1.3,-10.4 L-3.2,-11.8 L-0.9,-11.8 Z"
        fill="currentColor"
        fillOpacity="0.82"
        strokeWidth="0.6"
      />
    </g>
  ),

  'compass-star': () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle r="12.4" strokeWidth="1.25" strokeOpacity="0.74" />
      <path d="M0,-14.6 V-11 M0,11 V14.6 M-14.6,0 H-11 M11,0 H14.6" strokeWidth="1.25" />
      <path d="M-6.8,-6.8 L-2.4,-2.4 M6.8,-6.8 L2.4,-2.4 M-6.8,6.8 L-2.4,2.4 M6.8,6.8 L2.4,2.4" strokeWidth="1" strokeOpacity="0.58" />
      <path
        d="M0,-10.8 L2.7,-2.7 L10.8,0 L2.7,2.7 L0,10.8 L-2.7,2.7 L-10.8,0 L-2.7,-2.7 Z"
        fill="currentColor"
        fillOpacity="0.22"
        strokeWidth="1.4"
      />
      <circle r="2.2" fill="currentColor" stroke="none" />
    </g>
  ),

  'mountain-peaks': () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M0,-14.2 L1,-11.7 L3.6,-11.7 L1.5,-10.1 L2.3,-7.6 L0,-9.1 L-2.3,-7.6 L-1.5,-10.1 L-3.6,-11.7 L-1,-11.7 Z"
        fill="currentColor"
        fillOpacity="0.82"
        strokeWidth="0.65"
      />
      <path d="M-13.8,10.4 L-7.2,-3.2 L-2.6,3.6 M2.6,3.6 L7.6,-2.4 L13.8,10.4" fill="currentColor" fillOpacity="0.1" strokeWidth="1.35" />
      <path d="M-9.4,10.4 L0,-5.2 L9.4,10.4 Z" fill="currentColor" fillOpacity="0.2" strokeWidth="1.5" />
      <path d="M-3.4,0.6 L0,-1.5 L3.4,0.6" strokeWidth="1.1" strokeOpacity="0.78" />
      <path d="M-14,10.4 H14 M-9,13.2 Q0,11.2 9,13.2" strokeWidth="1.2" strokeOpacity="0.74" />
    </g>
  ),

  rostrum: () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M0,-14.6 L0.9,-12.2 L3.4,-12.2 L1.4,-10.7 L2.1,-8.4 L0,-9.8 L-2.1,-8.4 L-1.4,-10.7 L-3.4,-12.2 L-0.9,-12.2 Z"
        fill="currentColor"
        fillOpacity="0.86"
        strokeWidth="0.6"
      />
      <path d="M-8.8,-3.8 L-5.8,-7.4 H5.8 L8.8,-3.8 Z" fill="currentColor" fillOpacity="0.22" strokeWidth="1.35" />
      <path d="M-13.4,0.8 Q-9.5,-0.6 -7.4,-2.5 H7.4 Q9.5,-0.6 13.4,0.8 Z" fill="currentColor" fillOpacity="0.24" strokeWidth="1.4" />
      <path d="M-11.2,1.6 H11.2 V11 H-11.2 Z" fill="currentColor" fillOpacity="0.12" strokeWidth="1.4" />
      <path
        d="M-2.2,11 V6.8 A2.2,2.2 0 0 1 2.2,6.8 V11 M-7.8,11 V7.6 A1.6,1.6 0 0 1 -4.6,7.6 V11 M4.6,11 V7.6 A1.6,1.6 0 0 1 7.8,7.6 V11"
        strokeWidth="1.15"
      />
      <path d="M-14,12.6 H14" strokeWidth="1.5" />
    </g>
  ),

  /* ---------------- Vol II: PRC History (1949-New Era) ---------------- */

  'defense-shield': () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M0,-13.6 L11,-9.6 V-1.6 C11,6.2 6.2,11.4 0,14 C-6.2,11.4 -11,6.2 -11,-1.6 V-9.6 Z"
        fill="currentColor"
        fillOpacity="0.14"
        strokeWidth="1.55"
      />
      <path
        d="M0,-10.4 L8.2,-7.4 V-1.6 C8.2,4.4 4.6,8.4 0,10.6 C-4.6,8.4 -8.2,4.4 -8.2,-1.6 V-7.4 Z"
        strokeWidth="0.9"
        strokeOpacity="0.54"
      />
      <path
        d="M0,-6.6 L1.1,-3.6 L4.2,-3.6 L1.7,-1.8 L2.6,1.2 L0,-0.6 L-2.6,1.2 L-1.7,-1.8 L-4.2,-3.6 L-1.1,-3.6 Z"
        fill="currentColor"
        fillOpacity="0.74"
        strokeWidth="0.6"
      />
      <path d="M-5.6,3.2 Q-2.8,6.2 0,5.2 Q2.8,6.2 5.6,3.2" strokeWidth="1.25" />
    </g>
  ),

  'yalu-bridge': () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-12.6,2.5 Q-6.3,-8.5 0,2.5 Q6.3,-8.5 12.6,2.5" fill="currentColor" fillOpacity="0.12" strokeWidth="1.5" />
      <path d="M-9.2,2.5 L-6.3,-2.8 L-3.4,2.5 M3.4,2.5 L6.3,-2.8 L9.2,2.5 M-6.3,-2.8 V2.5 M6.3,-2.8 V2.5" strokeWidth="1.05" strokeOpacity="0.78" />
      <path d="M-14.5,2.5 H14.5" strokeWidth="1.65" />
      <path d="M-11,2.5 V9 M0,2.5 V9.5 M11,2.5 V9" strokeWidth="1.65" />
      <path d="M-14,11.8 Q-7,14 0,11.8 T14,11.8" strokeWidth="1.2" strokeOpacity="0.72" />
    </g>
  ),

  'grain-ear': () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-2,13.5 C-2,5 0,-3 3,-12.6" strokeWidth="1.5" />
      <path d="M-1,5 C-5.5,3 -6.5,-0.5 -2.5,-2 C-0.5,-0.5 0,2.5 -1,5 Z" fill="currentColor" fillOpacity="0.22" strokeWidth="1.2" />
      <path d="M0,-0.5 C-4.2,-2.5 -5,-5.8 -1,-7.2 C0.8,-5.5 1.2,-2.5 0,-0.5 Z" fill="currentColor" fillOpacity="0.22" strokeWidth="1.2" />
      <path d="M1.2,-6 C-2.2,-8 -2.4,-11 1.2,-12.5 C2.8,-10.5 2.5,-7.8 1.2,-6 Z" fill="currentColor" fillOpacity="0.26" strokeWidth="1.2" />
      <path d="M0,4.5 C4.5,3 6,-0.2 2.5,-2 C0.5,-0.8 -0.2,2 0,4.5 Z" fill="currentColor" fillOpacity="0.22" strokeWidth="1.2" />
      <path d="M1,-1 C5.2,-2.8 6.2,-6 2.8,-7.5 C1,-6 0.5,-3 1,-1 Z" fill="currentColor" fillOpacity="0.22" strokeWidth="1.2" />
      <path d="M-2,12 C-8,9.5 -11,5 -11.5,0.5 M-1.5,12.5 C4.5,10.5 8.5,7 10,2.5" strokeWidth="1.25" strokeOpacity="0.82" />
    </g>
  ),

  'industry-gear': () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d={GEAR_TEETH_PATH} fill="currentColor" fillOpacity="0.16" strokeWidth="1.45" />
      <circle r="5.2" fill="var(--ui-bg)" stroke="currentColor" strokeWidth="1.4" />
      <circle r="2" fill="currentColor" stroke="none" />
    </g>
  ),

  'commerce-hall': () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-12.5,-4.4 H-7.5 V-9.6 H7.5 V-4.4 H12.5 V11.2 H-12.5 Z" fill="currentColor" fillOpacity="0.13" strokeWidth="1.45" />
      <path d="M-5.4,-7.1 H5.4 M-13.5,-4.4 H13.5" strokeWidth="1.35" />
      <path d="M-8.6,-1.2 H-5 V2.2 H-8.6 Z M5,-1.2 H8.6 V2.2 H5 Z M-1.8,-1.2 H1.8 V2.2 H-1.8 Z" fill="currentColor" fillOpacity="0.2" strokeWidth="1.05" />
      <path d="M-3.4,11.2 V6.5 A3.4,3.4 0 0 1 3.4,6.5 V11.2" strokeWidth="1.4" />
      <path d="M-14,11.2 H14" strokeWidth="1.5" />
    </g>
  ),

  'steel-furnace': () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-12,11.6 V-2.4 A3,3 0 0 1 -6,-2.4 V11.6" fill="currentColor" fillOpacity="0.13" strokeWidth="1.35" />
      <path d="M-3.5,11.6 L-1.5,-7 H4.5 L6.5,11.6 Z" fill="currentColor" fillOpacity="0.22" strokeWidth="1.5" />
      <path d="M-2.6,-7 H5.6 M1.5,-7 V-11.6 M-0.5,-9.8 H3.5" strokeWidth="1.25" />
      <path d="M6.2,-4.4 L12.5,11.6 M8,-0.8 L10.2,11.6" strokeWidth="1.2" />
      <path d="M4,-11.5 Q7,-14.4 11,-12.8" strokeWidth="1.1" strokeOpacity="0.68" />
      <path d="M-14,11.6 H14" strokeWidth="1.5" />
    </g>
  ),

  'oil-derrick': () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-9,12 L-2.6,-12 H2.6 L9,12" fill="currentColor" fillOpacity="0.1" strokeWidth="1.55" />
      <path d="M-4.6,-12 H4.6 M0,-14.4 V-12" strokeWidth="1.45" />
      <path d="M-4.2,-5.5 H4.2 M-6.2,2 H6.2" strokeWidth="1.15" />
      <path d="M-4,-5.5 L6,2 M4,-5.5 L-6,2 M-6.2,2 L8.4,11.6 M6.2,2 L-8.4,11.6" strokeWidth="1.05" strokeOpacity="0.8" />
      <path d="M-13,12 H13" strokeWidth="1.5" />
    </g>
  ),

  'atom-core': () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <ellipse rx="13" ry="5.2" strokeWidth="1.25" strokeOpacity="0.88" />
      <ellipse rx="13" ry="5.2" transform="rotate(60)" strokeWidth="1.25" strokeOpacity="0.88" />
      <ellipse rx="13" ry="5.2" transform="rotate(-60)" strokeWidth="1.25" strokeOpacity="0.88" />
      <circle r="3.1" fill="currentColor" fillOpacity="0.3" strokeWidth="1.35" />
      <circle r="1.4" fill="currentColor" stroke="none" />
      <circle cx="13" cy="0" r="1.55" fill="currentColor" stroke="none" />
      <circle cx="-6.5" cy="11.2" r="1.55" fill="currentColor" stroke="none" />
      <circle cx="-6.5" cy="-11.2" r="1.55" fill="currentColor" stroke="none" />
    </g>
  ),

  rocket: () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M0,-14.2 C3.4,-10.2 4.6,-5.5 4.6,0.5 V7.2 H-4.6 V0.5 C-4.6,-5.5 -3.4,-10.2 0,-14.2 Z" fill="currentColor" fillOpacity="0.18" strokeWidth="1.5" />
      <path d="M-4.4,-3.2 H4.4 M-4.5,2.8 H4.5" strokeWidth="1.05" strokeOpacity="0.72" />
      <circle cx="0" cy="-6.2" r="1.6" fill="currentColor" fillOpacity="0.52" stroke="none" />
      <path d="M-4.6,2.5 L-9.6,8.8 L-4.6,7.5 Z M4.6,2.5 L9.6,8.8 L4.6,7.5 Z" fill="currentColor" fillOpacity="0.22" strokeWidth="1.35" />
      <path d="M-2.6,7.2 L-3.4,9.8 H3.4 L2.6,7.2 M0,10.2 V14.2 M-2.4,11 L-3.4,13.5 M2.4,11 L3.4,13.5" strokeWidth="1.25" />
    </g>
  ),

  satellite: () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-4.8,-4.8 L-13.6,-12.8 M4.8,-4.8 L13.6,-12.8 M-4.8,4.8 L-13.6,12.8 M4.8,4.8 L13.6,12.8" strokeWidth="1.35" />
      <circle cx="-13.6" cy="-12.8" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="13.6" cy="-12.8" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="-13.6" cy="12.8" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="13.6" cy="12.8" r="1.15" fill="currentColor" stroke="none" />
      <path d="M-2.8,-6.4 H2.8 L6.4,-2.8 V2.8 L2.8,6.4 H-2.8 L-6.4,2.8 V-2.8 Z" fill="currentColor" fillOpacity="0.24" strokeWidth="1.45" />
      <path d="M-6.4,0 H6.4 M0,-6.4 V6.4 M-4.2,-4.2 L4.2,4.2 M4.2,-4.2 L-4.2,4.2" strokeWidth="0.85" strokeOpacity="0.64" />
    </g>
  ),

  'icebreaker-compass': () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-11.2,-6.5 A13,13 0 1 1 -11.2,6.5" strokeWidth="1.35" strokeOpacity="0.82" />
      <path d="M-14.2,-3.2 L-9.4,-1.5 M-14.2,3.2 L-9.4,1.5" strokeWidth="1.2" strokeOpacity="0.7" />
      <path d="M0,-14.6 V-11.2 M14.6,0 H11.2 M0,11.2 V14.6" strokeWidth="1.25" />
      <path d="M-8.4,0 L2.6,-4.6 L11.4,0 L2.6,4.6 Z" fill="currentColor" fillOpacity="0.26" strokeWidth="1.45" />
      <path d="M-8.4,0 H11.4" strokeWidth="1.05" strokeOpacity="0.72" />
      <circle r="2.2" fill="currentColor" stroke="none" />
    </g>
  ),

  'port-crane': () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-10.5,11.5 L-6,-9.5 H-2 L2.5,11.5 M-8.4,2.5 H0.4" fill="currentColor" fillOpacity="0.1" strokeWidth="1.45" />
      <path d="M-11.5,-5.5 L13.5,-10.2 M-4,-9.5 L11,-9.7" strokeWidth="1.45" />
      <path d="M8.2,-9.2 V0.8" strokeWidth="1.15" />
      <rect x="3.8" y="0.8" width="8.8" height="5.6" rx="0.8" fill="currentColor" fillOpacity="0.22" strokeWidth="1.25" />
      <path d="M-14,11.5 H14" strokeWidth="1.5" />
      <path d="M4,13.8 Q8.5,15 13,13.8" strokeWidth="1" strokeOpacity="0.65" />
    </g>
  ),

  'skyline-tower': () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-12,12 V-1.5 L-7.5,-4.5 V12" fill="currentColor" fillOpacity="0.14" strokeWidth="1.25" />
      <path d="M7.2,12 V-5 L11.8,-2.5 V12" fill="currentColor" fillOpacity="0.14" strokeWidth="1.25" />
      <path d="M0,-14.5 V-8.6" strokeWidth="1.35" />
      <circle cx="0" cy="-6" r="2.6" fill="currentColor" fillOpacity="0.26" strokeWidth="1.35" />
      <path d="M-1.3,-3.4 V0.8 M1.3,-3.4 V0.8" strokeWidth="1.1" />
      <circle cx="0" cy="4.2" r="3.6" fill="currentColor" fillOpacity="0.26" strokeWidth="1.4" />
      <path d="M-2.2,7.2 L-5.2,12 M2.2,7.2 L5.2,12 M0,7.8 V12" strokeWidth="1.3" />
      <path d="M-14,12 H14" strokeWidth="1.5" />
    </g>
  ),

  'mod-people': () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="0" cy="-6.8" r="2.9" fill="currentColor" fillOpacity="0.24" strokeWidth="1.4" />
      <path d="M-5.2,8.5 C-5.2,2.8 -3.2,0.5 0,0.5 C3.2,0.5 5.2,2.8 5.2,8.5" fill="currentColor" fillOpacity="0.14" strokeWidth="1.45" />
      <circle cx="-8.2" cy="-3.5" r="2.2" fill="currentColor" fillOpacity="0.18" strokeWidth="1.25" />
      <path d="M-12.5,8.5 C-12.5,4.2 -10.8,2.2 -8.2,2.2 C-6.6,2.2 -5.4,3.1 -4.7,4.5" strokeWidth="1.3" />
      <circle cx="8.2" cy="-3.5" r="2.2" fill="currentColor" fillOpacity="0.18" strokeWidth="1.25" />
      <path d="M12.5,8.5 C12.5,4.2 10.8,2.2 8.2,2.2 C6.6,2.2 5.4,3.1 4.7,4.5" strokeWidth="1.3" />
      <path d="M-13,11.2 Q0,13.4 13,11.2" strokeWidth="1.15" strokeOpacity="0.68" />
    </g>
  ),

  'mod-prosperity': () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-11,10.5 V4.5 H-5.5 V10.5 M-2.8,10.5 V0.5 H2.8 V10.5 M5.5,10.5 V-3.5 H11 V10.5" fill="currentColor" fillOpacity="0.16" strokeWidth="1.4" />
      <path d="M-11.5,1.2 Q-2,-2.2 9.5,-10.2 M5.2,-10.5 H9.8 V-6" strokeWidth="1.5" />
      <path d="M-13.5,10.5 H13.5" strokeWidth="1.45" />
    </g>
  ),

  'mod-culture': () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M0,10.6 V-0.4 C-3.8,-2.8 -8.5,-2.6 -12.2,-0.4 V9.2 C-8.5,7.2 -3.8,7.4 0,10.6 C3.8,7.4 8.5,7.2 12.2,9.2 V-0.4 C8.5,-2.6 3.8,-2.8 0,-0.4 Z"
        fill="currentColor"
        fillOpacity="0.14"
        strokeWidth="1.45"
      />
      <path
        d="M0,-13.6 L2,-8.2 L7.2,-6.2 L2,-4.2 L0,-1 L-2,-4.2 L-7.2,-6.2 L-2,-8.2 Z"
        fill="currentColor"
        fillOpacity="0.28"
        strokeWidth="1.2"
      />
    </g>
  ),

  'mod-eco': () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-13,7.5 L-6.2,-1.5 L-1.5,4.2 L3.8,-0.5 L13,7.5" fill="currentColor" fillOpacity="0.12" strokeWidth="1.35" />
      <path d="M0,2 C-5,-1.5 -5.8,-8.8 0,-12.8 C5.8,-8.8 5,-1.5 0,2 Z" fill="currentColor" fillOpacity="0.24" strokeWidth="1.45" />
      <path d="M0,-9.2 V2" strokeWidth="1.1" />
      <path d="M-12.5,11 Q-6.2,13.2 0,11 T12.5,11" strokeWidth="1.2" strokeOpacity="0.75" />
    </g>
  ),

  'mod-peace': () => (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="-2" cy="2" r="9.5" strokeWidth="1.15" strokeOpacity="0.58" />
      <path d="M-11.5,2 H7.5 M-2,-7.5 C1.5,-3 1.5,7 -2,11.5" strokeWidth="0.95" strokeOpacity="0.48" />
      <path
        d="M-8.5,3.5 C-4.5,-5.2 2.2,-10.2 12.5,-10.8 C9.2,-4.8 4.8,-1.2 -1.2,-0.2 C4.2,0.4 7.8,2.6 10.5,5.8 C4.2,5.6 -2.5,5.2 -8.5,3.5 Z"
        fill="currentColor"
        fillOpacity="0.24"
        strokeWidth="1.45"
      />
    </g>
  ),
};

export const EMBLEM_NAMES = Object.freeze(Object.keys(EMBLEM_RENDERERS));

export function HeroEmblem({ name, size = 28, tone = 'org', className = '' }) {
  const safeName = Object.prototype.hasOwnProperty.call(EMBLEM_RENDERERS, name) ? name : 'compass-star';
  const scale = Number.isFinite(size) && size > 0 ? size / 32 : 28 / 32;
  const color = TONE_COLOR[tone] || TONE_COLOR.org;
  return (
    <g
      className={`hero-emblem hero-emblem-${safeName} hero-emblem-tone-${tone || 'org'} ${className}`.trim()}
      color={color}
      transform={`scale(${scale.toFixed(4)})`}
      aria-hidden="true"
    >
      {EMBLEM_RENDERERS[safeName]()}
    </g>
  );
}
