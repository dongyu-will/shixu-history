import { useEffect, useRef } from 'react';

/**
 * Lightweight Canvas 2D Era Atmosphere Engine.
 * Renders restrained, poetic era-specific atmospheric motes/light-shafts synced to the
 * 9 chapters in EraAtmosphere. Strictly respects playing state (freezes cleanly on pause),
 * prefers-reduced-motion (renders zero motion), document visibility, and browser
 * content-visibility lifecycle (contentvisibilityautostatechange + IntersectionObserver fallback).
 */

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

export const ERA_CANVAS_MOTIFS = Object.freeze({
  'vol1-0': { type: 'mist', count: 24, speed: 0.24 }, // 山河变局: 海雾与斜雨微痕
  'vol1-1': { type: 'embers', count: 28, speed: 0.42 }, // 星火初燃: 升腾朱砂微火
  'vol1-2': { type: 'wind', count: 22, speed: 0.36 }, // 道路探索: 山脊气流与星点
  'vol1-3': { type: 'film', count: 26, speed: 0.28 }, // 全民族抗战: 档案胶片尘光
  'vol1-4': { type: 'dawn', count: 30, speed: 0.4 }, // 走向新中国: 晨曦金芒与飘尘
  'vol2-0': { type: 'blueprint', count: 22, speed: 0.26 }, // 立国建制: 蓝图节点与暖星
  'vol2-1': { type: 'orbit', count: 24, speed: 0.34 }, // 艰辛探索: 星轨脉冲与电波环
  'vol2-2': { type: 'tide', count: 26, speed: 0.44 }, // 改革开放: 沿海光浪与流线
  'vol2-3': { type: 'constellation', count: 24, speed: 0.26 }, // 迈向新时代: 金蓝星网微光
});

function paletteFor(eraKey, isNight) {
  const palettes = {
    'vol1-0': isNight ? ['122,166,204', '196,162,110'] : ['56,92,126', '132,102,62'],
    'vol1-1': isNight ? ['244,132,108', '240,196,118'] : ['176,56,44', '184,122,42'],
    'vol1-2': isNight ? ['110,192,182', '238,124,104'] : ['42,106,100', '166,54,44'],
    'vol1-3': isNight ? ['220,178,112', '154,174,198'] : ['144,106,56', '78,94,114'],
    'vol1-4': isNight ? ['244,198,108', '246,134,108'] : ['188,128,36', '174,56,44'],
    'vol2-0': isNight ? ['236,138,118', '142,174,210'] : ['169,50,40', '64,92,126'],
    'vol2-1': isNight ? ['126,184,242', '240,196,108'] : ['46,96,154', '168,122,38'],
    'vol2-2': isNight ? ['98,198,242', '244,198,102'] : ['26,116,168', '184,132,36'],
    'vol2-3': isNight ? ['242,198,116', '118,168,236'] : ['174,120,34', '36,84,148'],
  };
  return palettes[eraKey] || palettes['vol1-0'];
}

function buildParticles(eraKey) {
  const motif = ERA_CANVAS_MOTIFS[eraKey] || ERA_CANVAS_MOTIFS['vol1-0'];
  const hash = Array.from(String(eraKey)).reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7);
  const rand = seededRandom(hash + 1949);
  return Array.from({ length: motif.count }, (_, idx) => ({
    x: rand(),
    y: rand(),
    vx: (rand() - 0.5) * 0.025,
    vy: (rand() - 0.5) * 0.025,
    size: 1.1 + rand() * 2.4,
    phase: rand() * Math.PI * 2,
    alpha: 0.22 + rand() * 0.48,
    alt: idx % 3 === 0 ? 1 : 0,
    len: 18 + rand() * 44,
  }));
}

function renderEraFrame(ctx, width, height, particles, eraKey, isNight, timeSec) {
  ctx.clearRect(0, 0, width, height);
  if (width < 40 || height < 40) return;

  const motif = ERA_CANVAS_MOTIFS[eraKey] || ERA_CANVAS_MOTIFS['vol1-0'];
  const [primary, secondary] = paletteFor(eraKey, isNight);
  const alphaBoost = isNight ? 0.92 : 0.74;

  // Keep left editorial column ultra-clean on desktop by gently weighting right-stage glow
  const rightBiasX = width > 820 ? 0.28 : 0;

  if (motif.type === 'embers') {
    for (const p of particles) {
      const y = ((p.y - timeSec * (0.028 + p.size * 0.008)) % 1 + 1) % 1;
      const sway = Math.sin(timeSec * 0.9 + p.phase) * 0.018;
      const x = rightBiasX + (((p.x + sway) % 1 + 1) % 1) * (1 - rightBiasX);
      const px = x * width;
      const py = y * height;
      const glow = 0.55 + 0.45 * Math.sin(timeSec * 2.1 + p.phase);
      const color = p.alt ? secondary : primary;
      const r = p.size * (1.2 + glow * 0.5);

      const grad = ctx.createRadialGradient(px, py, 0, px, py, r * 3.8);
      grad.addColorStop(0, `rgba(${color},${(p.alpha * glow * alphaBoost).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, r * 3.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(${color},${Math.min(0.9, p.alpha * 1.15 * alphaBoost).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(px, py, r * 0.58, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (motif.type === 'mist' || motif.type === 'wind') {
    ctx.lineCap = 'round';
    for (const p of particles) {
      const speedX = motif.type === 'wind' ? 0.036 : 0.018;
      const speedY = motif.type === 'mist' ? 0.022 : -0.008;
      const x = rightBiasX + (((p.x + timeSec * speedX) % 1 + 1) % 1) * (1 - rightBiasX);
      const y = ((p.y + timeSec * speedY + Math.sin(timeSec * 0.6 + p.phase) * 0.01) % 1 + 1) % 1;
      const px = x * width;
      const py = y * height;
      const color = p.alt ? secondary : primary;
      ctx.strokeStyle = `rgba(${color},${(p.alpha * 0.36 * alphaBoost).toFixed(3)})`;
      ctx.lineWidth = motif.type === 'mist' ? 1 : 1.15;
      ctx.beginPath();
      const dx = motif.type === 'mist' ? -p.len * 0.35 : p.len;
      const dy = motif.type === 'mist' ? p.len * 0.65 : -p.len * 0.16;
      ctx.moveTo(px, py);
      ctx.lineTo(px + dx, py + dy);
      ctx.stroke();
    }
    return;
  }

  if (motif.type === 'film') {
    // Understated archival documentary dust flecks + soft diagonal light shaft
    const shaftGrad = ctx.createLinearGradient(width * 0.35, 0, width * 0.92, height * 0.85);
    shaftGrad.addColorStop(0, `rgba(${primary},0)`);
    shaftGrad.addColorStop(0.5, `rgba(${primary},${(isNight ? 0.045 : 0.035).toFixed(3)})`);
    shaftGrad.addColorStop(1, `rgba(${primary},0)`);
    ctx.fillStyle = shaftGrad;
    ctx.fillRect(width * 0.3, 0, width * 0.7, height);

    for (const p of particles) {
      const x = rightBiasX + (((p.x + timeSec * 0.006 * (p.alt ? -1 : 1)) % 1 + 1) % 1) * (1 - rightBiasX);
      const y = ((p.y + timeSec * 0.01) % 1 + 1) % 1;
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(timeSec * 1.2 + p.phase));
      const color = p.alt ? secondary : primary;
      ctx.fillStyle = `rgba(${color},${(p.alpha * 0.5 * twinkle * alphaBoost).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x * width, y * height, p.size * 0.68, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (motif.type === 'dawn') {
    // Rising celebratory golden-vermilion dust motes
    const cx = width * (width > 820 ? 0.68 : 0.5);
    const cy = height * 0.82;
    const aura = ctx.createRadialGradient(cx, cy, 12, cx, cy, Math.max(width, height) * 0.56);
    aura.addColorStop(0, `rgba(${primary},${(isNight ? 0.08 : 0.065).toFixed(3)})`);
    aura.addColorStop(1, `rgba(${primary},0)`);
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, width, height);

    for (const p of particles) {
      const y = ((p.y - timeSec * (0.02 + p.size * 0.005)) % 1 + 1) % 1;
      const x = rightBiasX + (((p.x + Math.sin(timeSec * 0.7 + p.phase) * 0.015) % 1 + 1) % 1) * (1 - rightBiasX);
      const shimmer = 0.5 + 0.5 * Math.sin(timeSec * 1.9 + p.phase);
      const color = p.alt ? secondary : primary;
      ctx.fillStyle = `rgba(${color},${(p.alpha * 0.68 * shimmer * alphaBoost).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x * width, y * height, p.size * 0.82, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (motif.type === 'orbit') {
    // Two-Bombs-One-Satellite orbital radio pulse & slow orbital sparks
    const cx = width * (width > 820 ? 0.69 : 0.5);
    const cy = height * 0.48;
    for (let k = 0; k < 2; k += 1) {
      const wave = (timeSec * 0.16 + k * 0.5) % 1;
      const r = 46 + wave * Math.min(width, height) * 0.42;
      ctx.strokeStyle = `rgba(${primary},${((1 - wave) * 0.22 * alphaBoost).toFixed(3)})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const p of particles) {
      const angle = p.phase + timeSec * (0.14 + p.size * 0.03) * (p.alt ? -1 : 1);
      const rx = (0.14 + p.x * 0.3) * width * (width > 820 ? 0.72 : 0.92);
      const ry = (0.1 + p.y * 0.28) * height;
      const px = cx + Math.cos(angle) * rx;
      const py = cy + Math.sin(angle) * ry;
      const color = p.alt ? secondary : primary;
      ctx.fillStyle = `rgba(${color},${(p.alpha * 0.64 * alphaBoost).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(px, py, p.size * 0.68, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (motif.type === 'tide') {
    // Flowing Reform-and-Opening coastal ribbon streaks
    ctx.lineCap = 'round';
    for (const p of particles) {
      const x = rightBiasX + (((p.x + timeSec * (0.032 + p.size * 0.006)) % 1 + 1) % 1) * (1 - rightBiasX);
      const baseY = p.y * height;
      const px = x * width;
      const color = p.alt ? secondary : primary;
      ctx.strokeStyle = `rgba(${color},${(p.alpha * 0.36 * alphaBoost).toFixed(3)})`;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(px - p.len * 0.6, baseY + Math.sin(timeSec * 1.4 + p.phase) * 5);
      ctx.quadraticCurveTo(
        px,
        baseY - Math.sin(timeSec * 1.4 + p.phase) * 6,
        px + p.len * 0.6,
        baseY + Math.cos(timeSec * 1.4 + p.phase) * 4,
      );
      ctx.stroke();
    }
    return;
  }

  // blueprint & constellation: subtle drifting geometric nodes + soft filament links
  const pts = particles.map((p) => {
    const x = rightBiasX + (((p.x + timeSec * p.vx) % 1 + 1) % 1) * (1 - rightBiasX);
    const y = ((p.y + timeSec * p.vy) % 1 + 1) % 1;
    return { x: x * width, y: y * height, p };
  });

  if (motif.type === 'constellation') {
    ctx.lineWidth = 0.8;
    for (let i = 0; i < pts.length; i += 1) {
      for (let j = i + 1; j < pts.length; j += 1) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < 126) {
          const opacity = (1 - d / 126) * 0.16 * alphaBoost;
          ctx.strokeStyle = `rgba(${primary},${opacity.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.stroke();
        }
      }
    }
  }

  for (const pt of pts) {
    const pulse = 0.55 + 0.45 * Math.sin(timeSec * 1.6 + pt.p.phase);
    const color = pt.p.alt ? secondary : primary;
    ctx.fillStyle = `rgba(${color},${(pt.p.alpha * 0.58 * pulse * alphaBoost).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.p.size * 0.72, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function EraCanvas({ eraKey = 'vol1-0', theme = 'light', playing = false, reduce = false, active = true }) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const timeRef = useRef(0);
  const visibleRef = useRef(true);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas || typeof window === 'undefined') return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    if (reduce || !active) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return undefined;
    }

    const isNight = theme === 'dark' || theme === 'night';
    const particles = buildParticles(eraKey);
    let width = 0;
    let height = 0;
    let rafId = 0;
    let lastTs = 0;

    const syncSize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderEraFrame(ctx, width, height, particles, eraKey, isNight, timeRef.current);
    };

    syncSize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncSize) : null;
    ro?.observe(host);

    const stopLoop = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      lastTs = 0;
    };

    const startLoop = () => {
      if (rafId || !playing || !visibleRef.current || document.hidden) return;
      const step = (ts) => {
        if (!playing || !visibleRef.current || document.hidden) {
          stopLoop();
          return;
        }
        if (lastTs) {
          timeRef.current += Math.min(0.08, (ts - lastTs) / 1000);
        }
        lastTs = ts;
        renderEraFrame(ctx, width, height, particles, eraKey, isNight, timeRef.current);
        rafId = requestAnimationFrame(step);
      };
      rafId = requestAnimationFrame(step);
    };

    // Pause background rendering when skipped by CSS content-visibility (with IntersectionObserver fallback)
    const supportsContentVisibility = 'contentVisibility' in document.documentElement.style;
    const onCvState = (event) => {
      visibleRef.current = !event.skipped;
      if (event.skipped) stopLoop();
      else startLoop();
    };
    let io = null;
    if (supportsContentVisibility) {
      host.addEventListener('contentvisibilityautostatechange', onCvState);
    } else if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          const onScreen = entries.some((entry) => entry.isIntersecting);
          visibleRef.current = onScreen;
          if (!onScreen) stopLoop();
          else startLoop();
        },
        { rootMargin: '160px' },
      );
      io.observe(host);
    }

    const onDocVis = () => {
      if (document.hidden) stopLoop();
      else startLoop();
    };
    document.addEventListener('visibilitychange', onDocVis);

    if (playing) startLoop();

    return () => {
      stopLoop();
      ro?.disconnect();
      io?.disconnect();
      if (supportsContentVisibility) {
        host.removeEventListener('contentvisibilityautostatechange', onCvState);
      }
      document.removeEventListener('visibilitychange', onDocVis);
    };
  }, [eraKey, theme, playing, reduce, active]);

  return (
    <div ref={hostRef} className="era-canvas-host" aria-hidden="true">
      <canvas ref={canvasRef} className="era-canvas-layer" />
    </div>
  );
}
