import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { geoGraticule10, geoMercator, geoPath } from 'd3-geo';
import { AUTHORED_STORIES } from './stories.js';
import { StoryLayer } from './StoryLayer.jsx';
import { getSceneAtmosphere } from './EraAtmosphere.js';
import { PROCESS_PLACES } from './storyboards/places.js';
import { PRC_PLACES } from './storyboards/prc-places.js';

const ALL_PLACES = { ...PROCESS_PLACES, ...PRC_PLACES };
const EASE = 'cubic-bezier(0.77, 0, 0.175, 1)';
const ARRIVAL_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const GRATICULE_GEO = geoGraticule10();

const readableDate = (e) => {
  const m = e.dateLabel.match(/^(\d{4})[.、](\d{1,2})(?:[.、](\d{1,2}))?$/);
  return m ? `${m[1]}年${m[2]}月${m[3] ? `${m[3]}日` : ''}` : e.dateLabel;
};

function matchMediaSafe(query) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(query);
}

function useReducedMotion() {
  const [reduce, setReduce] = useState(() => Boolean(matchMediaSafe('(prefers-reduced-motion: reduce)')?.matches));
  useEffect(() => {
    const m = matchMediaSafe('(prefers-reduced-motion: reduce)');
    if (!m) return undefined;
    const f = () => setReduce(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return reduce;
}

function useDocumentTheme(explicitTheme) {
  const [docTheme, setDocTheme] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement?.dataset?.theme || 'light' : 'light',
  );
  useEffect(() => {
    if (explicitTheme || typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
      return undefined;
    }
    const root = document.documentElement;
    const sync = () => setDocTheme(root?.dataset?.theme || 'light');
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [explicitTheme]);
  return explicitTheme || docTheme;
}

export const MapScene = memo(function MapScene({
  geography,
  events,
  scene,
  stories = AUTHORED_STORIES,
  volumeId,
  theme,
  playing,
  rate = 1,
  clock,
  sceneStart,
  animationRef,
  storyController,
  phase,
  onPick,
  overview,
  zoom = 1,
  concealFuture = false,
  fit = 'slice',
  extendMap = false,
}) {
  const cameraRef = useRef(null);
  const previousTransform = useRef(null);
  const lastAuthoredSceneRef = useRef(null);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const rateRef = useRef(rate);
  rateRef.current = rate;

  const reduce = useReducedMotion();
  const resolvedTheme = useDocumentTheme(theme);
  const [compact, setCompact] = useState(() =>
    Boolean(matchMediaSafe('(max-width: 760px), (max-height: 500px) and (pointer: coarse)')?.matches),
  );
  useEffect(() => {
    const media = matchMediaSafe('(max-width: 760px), (max-height: 500px) and (pointer: coarse)');
    if (!media) return undefined;
    const update = () => setCompact(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const authored = stories[scene.id];
  const atmosphere = useMemo(
    () => getSceneAtmosphere({ volumeId, scene, authored }),
    [volumeId, scene, authored],
  );

  // Restrained 2.5D spatial tilt ONLY on desktop spatial scenes/Heroes; strictly 0deg on
  // conceptual B-layer scenes, overview, mobile compact view, or prefers-reduced-motion.
  const effectiveTilt = authored && !overview && !compact && !reduce ? atmosphere.tiltDeg : 0;
  const isSpatial25d = effectiveTilt > 0;

  const projection = useMemo(() => {
    const diagram = authored?.kind === 'process' && !['geography', 'rendezvous'].includes(authored.mode);
    const p = geoMercator()
      .center(authored && !overview ? authored.center : [104, 32])
      .scale(authored && !overview ? authored.scale : 730)
      .translate(authored && !overview ? (diagram && authored.anchor ? [950, 653] : [930, 340]) : [810, 365]);
    if (authored?.locations && !overview) {
      const coordinates = authored.locations.map((loc) => ALL_PLACES[loc.place]).filter(Boolean);
      if (coordinates.length) {
        p.fitExtent([[670, 175], [1230, 535]], { type: 'MultiPoint', coordinates });
        if (p.scale() > 40000) {
          p.center([
            coordinates.reduce((sum, c) => sum + c[0], 0) / coordinates.length,
            coordinates.reduce((sum, c) => sum + c[1], 0) / coordinates.length,
          ])
            .translate([950, 355])
            .scale(40000);
        }
      }
    }
    return authored && !overview
      ? p.clipExtent(
          extendMap
            ? [[-1440, -790], [2880, 1580]]
            : isSpatial25d
              ? [[-360, -260], [1800, 1050]]
              : [[0, 0], [1440, 790]],
        )
      : p;
  }, [authored, overview, extendMap, isSpatial25d]);

  const features = useMemo(() => {
    const path = geoPath(projection);
    return geography.features.map((f) => ({
      id: f.properties.adcode,
      name: f.properties.name,
      path: path(f),
      center: f.properties.centroid || f.properties.center,
    }));
  }, [geography, projection]);

  const graticulePath = useMemo(() => geoPath(projection)(GRATICULE_GEO), [projection]);
  const isCurrentProvince = (f) => f.id === scene.province || f.name === scene.province;
  const orderedFeatures = useMemo(() => {
    const rest = [];
    let current = null;
    for (const f of features) {
      if (f.id === scene.province || f.name === scene.province) current = f;
      else rest.push(f);
    }
    return current ? [...rest, current] : rest;
  }, [features, scene.province]);

  const places = useMemo(
    () =>
      Array.from(
        new Map(
          events
            .filter((e) => e.coordinates)
            .map((e) => [e.location, { name: e.location, coords: e.coordinates }]),
        ).values(),
      ),
    [events],
  );
  const focus = scene.coordinates ? projection(scene.coordinates) : [810, 365];

  useEffect(() => {
    const element = cameraRef.current;
    if (!element) return undefined;

    if (authored && !overview) {
      const isNewScene = lastAuthoredSceneRef.current !== scene.id;
      lastAuthoredSceneRef.current = scene.id;
      const rest = `translate(${930 * (1 - zoom)}px,${340 * (1 - zoom)}px) scale(${zoom})`;
      const elapsed = Math.max(0, (clock?.current?.time ?? sceneStart) - sceneStart);

      animationRef.current?.cancel();
      animationRef.current = null;

      // Smooth 0.75s documentary arrival settle glide on scene change while playing,
      // then hold rock-steady for the rest of the scene. Paused or reduced-motion snaps cleanly.
      if (isNewScene && playingRef.current && !reduce && elapsed < 0.72 && typeof element.animate === 'function') {
        const startScale = zoom * 0.965;
        const from = `translate(${(930 * (1 - startScale)).toFixed(2)}px,${(340 * (1 - startScale) + 10).toFixed(2)}px) scale(${startScale.toFixed(4)})`;
        const durSec = Math.max(1, scene.duration || 10);
        const settleOffset = Math.min(0.22, 0.75 / durSec);
        const a = element.animate(
          [
            { transform: from, offset: 0, easing: ARRIVAL_EASE },
            { transform: rest, offset: settleOffset },
            { transform: rest, offset: 1 },
          ],
          { duration: durSec * 1000, fill: 'forwards', easing: 'linear' },
        );
        a.currentTime = elapsed * 1000;
        a.playbackRate = rateRef.current;
        a.play();
        animationRef.current = a;
        element.style.transform = rest;
        return () => {
          previousTransform.current = getComputedStyle(element).transform;
          a.cancel();
          if (animationRef.current === a) animationRef.current = null;
          element.style.transform = '';
        };
      }

      element.style.transform = rest;
      return () => {
        previousTransform.current = getComputedStyle(element).transform;
        element.style.transform = '';
      };
    }

    lastAuthoredSceneRef.current = null;
    const p = scene.coordinates && !overview ? projection(scene.coordinates) : [810, 365];
    const scale = (overview ? 0.69 : scene.coordinates ? 1.14 : 0.94) * zoom;
    const targetX = scene.coordinates && !overview ? 930 : 810;
    const targetY = scene.coordinates && !overview ? 353 : 365;
    const transform = (s) => `translate(${targetX - p[0] * s}px, ${targetY - p[1] * s}px) scale(${s})`;
    const from = playingRef.current && !reduce ? previousTransform.current || getComputedStyle(element).transform : transform(scale);
    animationRef.current?.cancel();
    const a = element.animate(
      [
        { transform: from, offset: 0, easing: EASE },
        { transform: transform(scale), offset: 0.16 },
        { transform: transform(scale), offset: 1 },
      ],
      { duration: scene.duration * 1000, fill: 'forwards', easing: 'linear' },
    );
    a.currentTime = Math.max(0, clock.current.time - sceneStart) * 1000;
    a.playbackRate = rateRef.current;
    if (playingRef.current) a.play();
    else a.pause();
    animationRef.current = a;
    return () => {
      previousTransform.current = getComputedStyle(element).transform;
      a.cancel();
    };
  }, [scene.id, scene.duration, scene.coordinates, sceneStart, geography, overview, zoom, reduce, authored, projection, clock, animationRef]);

  useEffect(() => {
    const a = animationRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, clock.current.time - sceneStart) * 1000;
    a.playbackRate = rate;
    if (playing) a.play();
    else a.pause();
  }, [playing, rate, animationRef, clock, sceneStart]);

  const diagram = authored?.kind === 'process' && !['geography', 'rendezvous'].includes(authored.mode);
  const isCompactAuthored = compact && authored && !overview;
  const clipBounds = authored && !overview && !extendMap
    ? isSpatial25d
      ? { x: -360, y: -260, width: 2160, height: 1310 }
      : { x: 0, y: 0, width: 1440, height: 790 }
    : { x: -1440, y: -790, width: 4320, height: 2370 };
  const stageRect = isCompactAuthored
    ? { x: 380, y: -90, width: 1160, height: 990 }
    : extendMap
      ? { x: -360, y: -200, width: 2160, height: 1190 }
      : compact
        ? { x: -200, y: -240, width: 1840, height: 1270 }
        : { x: 0, y: 0, width: 1440, height: 790 };

  const viewBoxRect = useMemo(
    () => (isCompactAuthored ? { x: 540, y: 70, width: 840, height: 670 } : { x: 0, y: 0, width: 1440, height: 790 }),
    [isCompactAuthored],
  );

  const isNight = resolvedTheme === 'dark' || resolvedTheme === 'night';
  const eraVars = isNight ? atmosphere.nightVars : atmosphere.dayVars;
  const stageStyle = useMemo(
    () => ({
      ...eraVars,
      '--map-tilt': `${effectiveTilt}deg`,
    }),
    [eraVars, effectiveTilt],
  );

  return (
    <div
      className={`map-cinema-stage ${playing ? 'is-playing' : 'is-paused'} ${isSpatial25d ? 'is-spatial-25d' : 'is-flat-stage'} ${overview ? 'is-overview' : ''}`}
      data-era={atmosphere.eraKey}
      data-era-label={atmosphere.label}
      data-tilt-mode={isSpatial25d ? 'spatial' : 'flat'}
      data-tilt-deg={String(effectiveTilt)}
      style={stageStyle}
    >
      <div className="map-era-atmosphere" aria-hidden="true" />
      <div className="map-cinema-tilt">
        <svg
          className={`history-map ${playing ? 'is-playing' : 'is-paused'} ${authored && !overview ? 'has-authored-story' : ''} ${(authored?.kind === 'organization' && phase < 3) || diagram ? 'organization-context' : ''} ${isSpatial25d ? 'is-spatial-25d' : ''}`}
          viewBox={`${viewBoxRect.x} ${viewBoxRect.y} ${viewBoxRect.width} ${viewBoxRect.height}`}
          preserveAspectRatio={`xMidYMid ${compact ? 'meet' : fit}`}
          aria-label="中国历史事件地点定位地图"
          role="group"
        >
          <defs>
            <clipPath id="map-graticule-clip">
              <rect x={clipBounds.x} y={clipBounds.y} width={clipBounds.width} height={clipBounds.height} />
            </clipPath>
            <filter id="map-paper-grain" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="3" seed="11" stitchTiles="stitch" result="noise" />
              <feColorMatrix
                in="noise"
                type="matrix"
                values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0.16 0"
              />
            </filter>
            <filter id="map-glow-force" x="-120%" y="-120%" width="340%" height="340%" colorInterpolationFilters="sRGB">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.6" result="glowInner" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="6.2" result="glowOuter" />
              <feColorMatrix
                in="glowOuter"
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.45 0"
                result="softOuter"
              />
              <feMerge>
                <feMergeNode in="softOuter" />
                <feMergeNode in="glowInner" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="map-glow-org" x="-120%" y="-120%" width="340%" height="340%" colorInterpolationFilters="sRGB">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="glowInner" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="glowOuter" />
              <feColorMatrix
                in="glowOuter"
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.38 0"
                result="softOuter"
              />
              <feMerge>
                <feMergeNode in="softOuter" />
                <feMergeNode in="glowInner" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="map-vignette" cx="56%" cy="48%" r="66%" fx="56%" fy="48%">
              <stop offset="0%" className="map-vignette-stop-inner" stopColor="#060f1c" stopOpacity="0" />
              <stop offset="64%" className="map-vignette-stop-mid" stopColor="#060f1c" stopOpacity="0" />
              <stop offset="100%" className="map-vignette-stop-outer" stopColor="#060f1c" stopOpacity="0.44" />
            </radialGradient>
          </defs>
          <g ref={cameraRef} className="map-camera">
            {graticulePath && (
              <path
                className="map-graticule"
                d={graticulePath}
                clipPath="url(#map-graticule-clip)"
                pointerEvents="none"
                aria-hidden="true"
              />
            )}
            <g className="provinces">
              {orderedFeatures.map((f) => (
                <path key={f.id} d={f.path} className={isCurrentProvince(f) ? 'province current-province' : 'province'}>
                  <title>{f.name}</title>
                </path>
              ))}
            </g>
            <g className="province-names" aria-hidden="true">
              {features
                .filter(
                  (f) =>
                    f.center &&
                    (authored && !overview
                      ? [430000, 360000, 420000]
                      : [650000, 540000, 630000, 510000, 150000, 230000, 370000, 430000, 420000, 360000, 350000, 440000, 530000, 610000, 710000]
                    ).includes(f.id),
                )
                .map((f) => {
                  const [x, y] = projection(f.center);
                  return (
                    <text key={f.id} x={x} y={y} className={isCurrentProvince(f) ? 'selected-province-label' : ''}>
                      {f.name.replace(/省|自治区|壮族|维吾尔|回族/g, '')}
                    </text>
                  );
                })}
            </g>
            {(!authored || overview) &&
              places.map((p) => {
                const [x, y] = projection(p.coords);
                const active = p.name === scene.location;
                const candidates = events.filter((e) => e.location === p.name);
                const present = candidates.filter((e) => e.sort <= scene.sort);
                if (!active && !present.length) return null;
                const nearest = (active ? candidates : present).reduce((a, b) =>
                  Math.abs(a.sort - scene.sort) < Math.abs(b.sort - scene.sort) ? a : b,
                );
                const showLabel =
                  active || ['北京市', '上海市', '武汉市', '广州市', '南京市', '西安市', '重庆市'].includes(p.name);
                const choose = () => onPick(active ? scene.id : nearest.id);
                return (
                  <g
                    key={p.name}
                    transform={`translate(${x},${y})`}
                    className={`map-place ${active ? 'active' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${p.name}：${active ? scene.title : nearest.title}`}
                    onClick={choose}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        choose();
                      }
                    }}
                  >
                    <circle r={active ? 25 : 11} fill="transparent" />
                    {active && (
                      <>
                        <circle className="location-halo" r="26" />
                        <circle className="location-pulse" r="13" />
                      </>
                    )}
                    <circle className="location-dot" r={active ? 5.2 : 2.7} />
                    {showLabel && <text x={active ? 18 : 9} y={active ? 5 : -7}>{p.name.replace(/[市县]$/, '')}</text>}
                    {active && <text className="map-date" x="18" y="23">{readableDate(scene)}</text>}
                  </g>
                );
              })}
            {scene.coordinates && !authored && (
              <g className="location-crosshair" transform={`translate(${focus[0]},${focus[1]})`} aria-hidden="true">
                <path d="M -36 -9 V -17 H -28 M 28 -17 H 36 V -9 M -36 9 V 17 H -28 M 28 17 H 36 V 9" />
              </g>
            )}
            {authored && !overview && (
              <StoryLayer
                story={authored}
                scene={scene}
                projection={projection}
                clock={clock}
                sceneStart={sceneStart}
                controller={storyController}
                phase={phase}
                reduce={reduce}
                concealFuture={concealFuture}
              />
            )}
          </g>
          <rect
            className="map-vignette-overlay"
            x={stageRect.x}
            y={stageRect.y}
            width={stageRect.width}
            height={stageRect.height}
            fill="url(#map-vignette)"
            pointerEvents="none"
            aria-hidden="true"
          />
          <rect
            className="map-grain-overlay"
            x={stageRect.x}
            y={stageRect.y}
            width={stageRect.width}
            height={stageRect.height}
            fill="#808080"
            fillOpacity="0.01"
            filter="url(#map-paper-grain)"
            pointerEvents="none"
            aria-hidden="true"
          />
        </svg>
      </div>
      <div className="map-era-vignette" aria-hidden="true" />
    </div>
  );
});
