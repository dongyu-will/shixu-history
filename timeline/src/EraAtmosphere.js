/**
 * 9-Chapter Era Atmosphere Engine & Spatial Cinema Routing.
 *
 * Maps every node across Volume I (Chapters 1-5) and Volume II (Chapters 6-9) to:
 * - Coordinated Day / Night CSS custom properties (--era-glow, --era-glow-soft,
 *   --era-vignette, --era-accent-tint, --era-horizon)
 * - Restrained 2.5D spatial tilt angle (10deg-16deg ONLY for geographic/spatial
 *   scenes and spatial Heroes; strictly 0deg for all conceptual B-layer apparatuses)
 */

export const SPATIAL_MODES = new Set(['geography', 'fronts', 'rendezvous']);
export const SPATIAL_KINDS = new Set(['autumn', 'uprising']);
export const FLAT_MODES = new Set([
  'debate',
  'cycle',
  'land',
  'seats',
  'strategy',
  'fork',
  'chain',
  'union',
]);

export const ERA_PRESETS = Object.freeze({
  'vol1-0': Object.freeze({
    eraKey: 'vol1-0',
    volumeId: 'modern',
    chapter: 0,
    label: '山河变局',
    range: '1840—1919',
    spatialTiltDeg: 14,
    dayVars: Object.freeze({
      '--era-glow': 'rgba(62, 102, 138, 0.12)',
      '--era-glow-soft': 'rgba(148, 118, 76, 0.08)',
      '--era-vignette': 'rgba(26, 52, 82, 0.11)',
      '--era-accent-tint': '#466c8e',
      '--era-horizon': 'rgba(186, 206, 224, 0.24)',
    }),
    nightVars: Object.freeze({
      '--era-glow': 'rgba(74, 128, 174, 0.18)',
      '--era-glow-soft': 'rgba(176, 138, 86, 0.10)',
      '--era-vignette': 'rgba(5, 13, 24, 0.48)',
      '--era-accent-tint': '#7aa6cc',
      '--era-horizon': 'rgba(72, 116, 158, 0.22)',
    }),
  }),
  'vol1-1': Object.freeze({
    eraKey: 'vol1-1',
    volumeId: 'modern',
    chapter: 1,
    label: '星火初燃',
    range: '1919—1927',
    spatialTiltDeg: 13,
    dayVars: Object.freeze({
      '--era-glow': 'rgba(176, 62, 48, 0.10)',
      '--era-glow-soft': 'rgba(52, 82, 136, 0.09)',
      '--era-vignette': 'rgba(28, 46, 78, 0.095)',
      '--era-accent-tint': '#b44032',
      '--era-horizon': 'rgba(218, 188, 176, 0.20)',
    }),
    nightVars: Object.freeze({
      '--era-glow': 'rgba(226, 104, 82, 0.16)',
      '--era-glow-soft': 'rgba(76, 112, 182, 0.16)',
      '--era-vignette': 'rgba(7, 13, 28, 0.46)',
      '--era-accent-tint': '#f0907b',
      '--era-horizon': 'rgba(146, 94, 114, 0.20)',
    }),
  }),
  'vol1-2': Object.freeze({
    eraKey: 'vol1-2',
    volumeId: 'modern',
    chapter: 2,
    label: '道路探索',
    range: '1927—1937',
    spatialTiltDeg: 14,
    dayVars: Object.freeze({
      '--era-glow': 'rgba(46, 108, 102, 0.11)',
      '--era-glow-soft': 'rgba(169, 50, 40, 0.09)',
      '--era-vignette': 'rgba(22, 54, 58, 0.105)',
      '--era-accent-tint': '#2f6f68',
      '--era-horizon': 'rgba(176, 206, 202, 0.22)',
    }),
    nightVars: Object.freeze({
      '--era-glow': 'rgba(56, 136, 128, 0.18)',
      '--era-glow-soft': 'rgba(224, 96, 78, 0.13)',
      '--era-vignette': 'rgba(5, 16, 22, 0.48)',
      '--era-accent-tint': '#6dbcb2',
      '--era-horizon': 'rgba(62, 126, 122, 0.22)',
    }),
  }),
  'vol1-3': Object.freeze({
    eraKey: 'vol1-3',
    volumeId: 'modern',
    chapter: 3,
    label: '全民族抗战',
    range: '1937—1945',
    spatialTiltDeg: 12,
    dayVars: Object.freeze({
      '--era-glow': 'rgba(154, 114, 62, 0.11)',
      '--era-glow-soft': 'rgba(74, 88, 104, 0.09)',
      '--era-vignette': 'rgba(38, 44, 54, 0.11)',
      '--era-accent-tint': '#966d38',
      '--era-horizon': 'rgba(216, 198, 170, 0.22)',
    }),
    nightVars: Object.freeze({
      '--era-glow': 'rgba(208, 156, 84, 0.16)',
      '--era-glow-soft': 'rgba(92, 110, 132, 0.14)',
      '--era-vignette': 'rgba(9, 13, 21, 0.50)',
      '--era-accent-tint': '#d8ae70',
      '--era-horizon': 'rgba(136, 114, 82, 0.20)',
    }),
  }),
  'vol1-4': Object.freeze({
    eraKey: 'vol1-4',
    volumeId: 'modern',
    chapter: 4,
    label: '走向新中国',
    range: '1945—1949',
    spatialTiltDeg: 13,
    dayVars: Object.freeze({
      '--era-glow': 'rgba(196, 132, 46, 0.13)',
      '--era-glow-soft': 'rgba(176, 58, 42, 0.09)',
      '--era-vignette': 'rgba(46, 40, 28, 0.095)',
      '--era-accent-tint': '#b87822',
      '--era-horizon': 'rgba(238, 212, 168, 0.26)',
    }),
    nightVars: Object.freeze({
      '--era-glow': 'rgba(236, 178, 86, 0.19)',
      '--era-glow-soft': 'rgba(228, 108, 84, 0.14)',
      '--era-vignette': 'rgba(11, 14, 24, 0.45)',
      '--era-accent-tint': '#ecc070',
      '--era-horizon': 'rgba(182, 134, 72, 0.22)',
    }),
  }),
  'vol2-0': Object.freeze({
    eraKey: 'vol2-0',
    volumeId: 'prc',
    chapter: 0,
    label: '立国建制',
    range: '1949—1956',
    spatialTiltDeg: 14,
    dayVars: Object.freeze({
      '--era-glow': 'rgba(169, 50, 40, 0.11)',
      '--era-glow-soft': 'rgba(78, 98, 122, 0.09)',
      '--era-vignette': 'rgba(30, 42, 60, 0.10)',
      '--era-accent-tint': '#a63a30',
      '--era-horizon': 'rgba(208, 194, 190, 0.22)',
    }),
    nightVars: Object.freeze({
      '--era-glow': 'rgba(222, 98, 82, 0.17)',
      '--era-glow-soft': 'rgba(104, 128, 158, 0.15)',
      '--era-vignette': 'rgba(8, 14, 24, 0.47)',
      '--era-accent-tint': '#eb9282',
      '--era-horizon': 'rgba(146, 86, 84, 0.20)',
    }),
  }),
  'vol2-1': Object.freeze({
    eraKey: 'vol2-1',
    volumeId: 'prc',
    chapter: 1,
    label: '艰辛探索',
    range: '1956—1976',
    spatialTiltDeg: 15,
    dayVars: Object.freeze({
      '--era-glow': 'rgba(48, 94, 146, 0.12)',
      '--era-glow-soft': 'rgba(188, 134, 46, 0.10)',
      '--era-vignette': 'rgba(22, 46, 76, 0.105)',
      '--era-accent-tint': '#33659c',
      '--era-horizon': 'rgba(184, 206, 228, 0.24)',
    }),
    nightVars: Object.freeze({
      '--era-glow': 'rgba(74, 138, 206, 0.19)',
      '--era-glow-soft': 'rgba(232, 176, 78, 0.15)',
      '--era-vignette': 'rgba(5, 13, 26, 0.48)',
      '--era-accent-tint': '#7ab4ee',
      '--era-horizon': 'rgba(78, 128, 182, 0.23)',
    }),
  }),
  'vol2-2': Object.freeze({
    eraKey: 'vol2-2',
    volumeId: 'prc',
    chapter: 2,
    label: '改革开放',
    range: '1978—2012',
    spatialTiltDeg: 14,
    dayVars: Object.freeze({
      '--era-glow': 'rgba(28, 114, 168, 0.13)',
      '--era-glow-soft': 'rgba(202, 148, 44, 0.11)',
      '--era-vignette': 'rgba(18, 52, 82, 0.09)',
      '--era-accent-tint': '#1f76ad',
      '--era-horizon': 'rgba(176, 214, 236, 0.26)',
    }),
    nightVars: Object.freeze({
      '--era-glow': 'rgba(54, 158, 218, 0.20)',
      '--era-glow-soft': 'rgba(242, 192, 86, 0.16)',
      '--era-vignette': 'rgba(5, 15, 28, 0.45)',
      '--era-accent-tint': '#62c2f2',
      '--era-horizon': 'rgba(64, 146, 198, 0.24)',
    }),
  }),
  'vol2-3': Object.freeze({
    eraKey: 'vol2-3',
    volumeId: 'prc',
    chapter: 3,
    label: '迈向新时代',
    range: '2012—新时代',
    spatialTiltDeg: 11,
    dayVars: Object.freeze({
      '--era-glow': 'rgba(196, 136, 42, 0.13)',
      '--era-glow-soft': 'rgba(34, 78, 144, 0.10)',
      '--era-vignette': 'rgba(20, 40, 74, 0.095)',
      '--era-accent-tint': '#b47a24',
      '--era-horizon': 'rgba(222, 206, 176, 0.24)',
    }),
    nightVars: Object.freeze({
      '--era-glow': 'rgba(238, 184, 88, 0.19)',
      '--era-glow-soft': 'rgba(68, 124, 212, 0.18)',
      '--era-vignette': 'rgba(6, 14, 29, 0.46)',
      '--era-accent-tint': '#f0c472',
      '--era-horizon': 'rgba(104, 128, 192, 0.24)',
    }),
  }),
});

/**
 * Per-scene tilt overrides.
 * Conceptual non-Hero B-layer scenes are never tilted; only spatial/geographic
 * scenes and epic finale Heroes (e-47, prc-m-19) carry a restrained 10deg-16deg pitch.
 */
const SCENE_OVERRIDES = Object.freeze({
  // Vol I · Chapter 1 (山河变局)
  'e-1': { tiltDeg: 14 },
  'e-7': { tiltDeg: 14 },
  'e-10': { tiltDeg: 14 },
  'e-13': { tiltDeg: 14 },
  'e-15': { tiltDeg: 14 },
  'e-18': { tiltDeg: 14 },

  // Vol I · Chapter 2 (星火初燃)
  'e-20': { tiltDeg: 13 },
  'e-21': { tiltDeg: 13 },
  'e-23': { tiltDeg: 13 },
  'e-26': { tiltDeg: 13 },

  // Vol I · Chapter 3 (道路探索)
  'e-27': { tiltDeg: 14 },
  'e-29': { tiltDeg: 14 },
  'e-35': { tiltDeg: 14 },
  'e-36': { tiltDeg: 0 },
  'e-38': { tiltDeg: 15 },

  // Vol I · Chapter 4 (全民族抗战)
  'e-40': { tiltDeg: 0 },
  'writing-88': { tiltDeg: 12 },

  // Vol I · Chapter 5 (走向新中国)
  'meeting-64': { tiltDeg: 13 },
  'e-42': { tiltDeg: 13 },
  'e-45': { tiltDeg: 13 },
  'meeting-68': { tiltDeg: 13 },
  'e-47': { tiltDeg: 10 },

  // Vol II · Chapter 6 (立国建制)
  'prc-e-1': { tiltDeg: 14 },
  'prc-e-5': { tiltDeg: 0 },

  // Vol II · Chapter 7 (艰辛探索)
  'prc-e-6': { tiltDeg: 15 },

  // Vol II · Chapter 8 (改革开放)
  'prc-m-6': { tiltDeg: 0 },
  'prc-e-9': { tiltDeg: 16 },
  'prc-w-3': { tiltDeg: 14 },
  'prc-e-10': { tiltDeg: 14 },

  // Vol II · Chapter 9 (迈向新时代)
  'prc-m-19': { tiltDeg: 11 },
});

export function getEraKey(volumeId, scene) {
  const isPrc =
    volumeId === 'prc' ||
    volumeId === 'vol2' ||
    scene?.volume === 'prc' ||
    String(scene?.id || '').startsWith('prc-');
  const maxChapter = isPrc ? 3 : 4;
  const rawChapter = Number.isInteger(scene?.chapter) ? scene.chapter : 0;
  const chapter = Math.max(0, Math.min(maxChapter, rawChapter));
  return `${isPrc ? 'vol2' : 'vol1'}-${chapter}`;
}

export function getSceneAtmosphere({ volumeId, scene, authored } = {}) {
  const eraKey = getEraKey(volumeId, scene);
  const preset = ERA_PRESETS[eraKey] || ERA_PRESETS['vol1-0'];
  const sceneId = scene?.id || '';
  const override = SCENE_OVERRIDES[sceneId];

  if (override) {
    return {
      eraKey: preset.eraKey,
      label: preset.label,
      tiltDeg: override.tiltDeg,
      dayVars: preset.dayVars,
      nightVars: preset.nightVars,
      isSpatial: override.tiltDeg > 0,
    };
  }

  const mode = authored?.mode;
  const kind = authored?.kind;
  const isSpatialMode =
    (kind === 'process' && SPATIAL_MODES.has(mode)) || SPATIAL_KINDS.has(kind);

  if (isSpatialMode) {
    return {
      eraKey: preset.eraKey,
      label: preset.label,
      tiltDeg: preset.spatialTiltDeg,
      dayVars: preset.dayVars,
      nightVars: preset.nightVars,
      isSpatial: true,
    };
  }

  return {
    eraKey: preset.eraKey,
    label: preset.label,
    tiltDeg: 0,
    dayVars: preset.dayVars,
    nightVars: preset.nightVars,
    isSpatial: false,
  };
}
