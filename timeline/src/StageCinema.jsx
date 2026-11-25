import { useEffect, useRef } from 'react';
import { storyTimeFor } from './volumes.js';

const clamp = (v, low, high) => Math.max(low, Math.min(high, v));
const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export const PILOT_STAGES = Object.freeze({
  'writing-88': Object.freeze({
    id: 'writing-88',
    volumeId: 'modern',
    kind: 'manuscript',
    title: '《论持久战》',
    shortLabel: '文献手稿',
    badge: '文献典籍 · 延安油印手稿',
    anchorLabel: '延安 · 1938.5 · 战略预见',
  }),
  'e-36': Object.freeze({
    id: 'e-36',
    volumeId: 'modern',
    kind: 'dossier',
    title: '遵义会议',
    shortLabel: '历史档案',
    badge: '历史档案 · 路线纠偏与罗盘定舵',
    anchorLabel: '贵州遵义 · 1935.1 · 中央政治局扩大会议',
  }),
  'e-47': Object.freeze({
    id: 'e-47',
    volumeId: 'modern',
    kind: 'woodcut',
    title: '新中国成立',
    shortLabel: '套色木刻',
    badge: '开国大典 · 套色木刻',
    anchorLabel: '北京天安门 · 1949.10.1 · 开国大典',
  }),
  'prc-m-6': Object.freeze({
    id: 'prc-m-6',
    volumeId: 'prc',
    kind: 'broadsheet',
    title: '中共十一届三中全会',
    shortLabel: '号外公报',
    badge: '历史公报 · 路线交锋与重心转移',
    anchorLabel: '北京 · 1978.12 · 十一届三中全会公报',
  }),
});

export const PILOT_STAGE_LIST = Object.freeze(Object.values(PILOT_STAGES));

export function getPilotStage(sceneId) {
  return PILOT_STAGES[sceneId] || null;
}

export function computeBeatProgress(story, localSeconds, reduce = false, playing = true) {
  const duration = Math.max(1, story?.duration || 21);
  const beats = Array.isArray(story?.beats) && story.beats.length ? story.beats : [{ at: 0 }];
  const t = clamp(Number.isFinite(localSeconds) ? localSeconds : 0, 0, duration);
  const overall = clamp(t / duration, 0, 1);

  const activeIdx = Math.max(0, beats.findLastIndex((beat) => beat.at <= t + 1e-6));

  const b = beats.map((beat, i) => {
    const start = beat.at;
    const end = beats[i + 1]?.at ?? duration;
    if (t < start) return 0;
    if (reduce) return 1;
    const raw = clamp((t - start) / Math.max(0.2, end - start), 0, 1);
    if (!playing && i === activeIdx) return Math.max(0.96, raw);
    return raw;
  });

  return { t, overall, b };
}

/* ========================================================================== */
/* 1. writing-88 《论持久战》 — Archival Manuscript Folio & Three-Stage Fold   */
/* ========================================================================== */

function ManuscriptStage({ phase }) {
  const contradictions = [
    { enemy: '敌强（军力）', us: '我弱（起步）' },
    { enemy: '退步（非正义）', us: '进步（反侵略）' },
    { enemy: '小国（经不起耗）', us: '大国（地广人众）' },
    { enemy: '寡助（失道）', us: '多助（国际同情）' },
  ];

  return (
    <div className="cinema-sheet cinema-manuscript" data-phase={phase}>
      {/* Sewn thread binding along left spine */}
      <div className="manuscript-spine" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <header className="manuscript-header">
        <span className="manuscript-running">延安抗日战争研究会 · 讲演稿</span>
        <span className="manuscript-date">一九三八年五月</span>
      </header>

      {/* Beat 0: Refuting Fatalism & Quick-Victory + Four Contradictions Ledger */}
      <section className="ms-refute-band" aria-label="批驳错误论调与中日特点">
        <div className="ms-fallacies">
          <div className="ms-fallacy-card ms-fallacy-0">
            <span className="ms-fallacy-tag">错误论调一</span>
            <strong>「亡国论」</strong>
            <small>唯武器论 · 民族失败主义</small>
            <svg className="ms-strike-svg" viewBox="0 0 180 68" aria-hidden="true">
              <path className="ms-strike-path ms-strike-a" d="M 16 14 L 164 54" pathLength="1" />
              <path className="ms-strike-path ms-strike-b" d="M 164 14 L 16 54" pathLength="1" />
            </svg>
          </div>
          <div className="ms-fallacy-card ms-fallacy-1">
            <span className="ms-fallacy-tag">错误论调二</span>
            <strong>「速胜论」</strong>
            <small>轻敌盲动 · 寄望速决</small>
            <svg className="ms-strike-svg" viewBox="0 0 180 68" aria-hidden="true">
              <path className="ms-strike-path ms-strike-a" d="M 16 14 L 164 54" pathLength="1" />
              <path className="ms-strike-path ms-strike-b" d="M 164 14 L 16 54" pathLength="1" />
            </svg>
          </div>
        </div>

        <div className="ms-ledger" aria-label="中日双方四个基本特点">
          <div className="ms-ledger-head">
            <span>中日矛盾四重对照</span>
            <em>∴ 既非亡国，亦非速胜，而是持久战</em>
          </div>
          <div className="ms-ledger-grid">
            {contradictions.map((row, idx) => (
              <div key={row.enemy} className="ms-ledger-row" style={{ '--row-idx': idx }}>
                <span className="ms-col-enemy">{row.enemy}</span>
                <i className="ms-col-sep" aria-hidden="true">↔</i>
                <span className="ms-col-us">{row.us}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Beat 1: Three-Stage Accordion Fold + Ruled Manuscript Strength Curve */}
      <section className="ms-stages-band" aria-label="抗日战争三个阶段战略预见">
        <div className="ms-trifold">
          <div className="ms-fold-panel ms-fold-0">
            <span className="ms-fold-num">阶段一</span>
            <strong>战略防御</strong>
            <small>敌之战略进攻 · 我之战略防御</small>
          </div>
          <div className="ms-fold-panel ms-fold-1 is-pivotal">
            <span className="ms-fold-num">阶段二 · 最关键</span>
            <strong>战略相持</strong>
            <small>敌后游击战 · 扭转力量对比</small>
            <svg className="ms-circle-svg" viewBox="0 0 210 88" aria-hidden="true">
              <path
                className="ms-vermilion-ring"
                d="M 104 6 C 166 4, 204 20, 202 45 C 200 72, 158 84, 102 82 C 44 80, 7 68, 9 43 C 11 19, 54 7, 118 9"
                pathLength="1"
              />
            </svg>
          </div>
          <div className="ms-fold-panel ms-fold-2">
            <span className="ms-fold-num">阶段三</span>
            <strong>战略反攻</strong>
            <small>我之战略反攻 · 敌之战略退却</small>
          </div>
        </div>

        <div className="ms-curve-box">
          <svg className="ms-curve-svg" viewBox="0 0 620 112" aria-label="持久战敌我力量消长趋势示意">
            {/* Ruled manuscript gridlines */}
            <line x1="16" y1="26" x2="604" y2="26" className="ms-grid-line" />
            <line x1="16" y1="56" x2="604" y2="56" className="ms-grid-line" />
            <line x1="16" y1="86" x2="604" y2="86" className="ms-grid-line" />
            <line x1="208" y1="10" x2="208" y2="100" className="ms-stage-div" />
            <line x1="414" y1="10" x2="414" y2="100" className="ms-stage-div" />

            {/* Highlighted pivotal stalemate band */}
            <rect x="208" y="10" width="206" height="90" className="ms-stalemate-wash" />

            {/* Enemy decaying force curve */}
            <path
              className="ms-curve-enemy"
              d="M 24 22 C 130 25, 220 40, 316 58 C 418 76, 510 86, 596 92"
              pathLength="1"
            />
            {/* People's rising resistance curve */}
            <path
              className="ms-curve-people"
              d="M 24 90 C 135 84, 232 70, 316 58 C 414 44, 506 28, 596 18"
              pathLength="1"
            />

            {/* Inflection crossover point inside 战略相持 */}
            <g className="ms-crossover" transform="translate(316, 58)">
              <circle r="11" className="ms-crossover-halo" />
              <circle r="4.2" className="ms-crossover-dot" />
              <text x="0" y="-15" textAnchor="middle" className="ms-crossover-label">力量对比转折</text>
            </g>

            <text x="32" y="18" className="ms-curve-tag-enemy">敌方战力由强转弱</text>
            <text x="588" y="34" textAnchor="end" className="ms-curve-tag-people">人民战争由弱转强</text>
          </svg>
        </div>
      </section>

      {/* Beat 2: Colophon — 兵民是胜利之本 + Engraved Vermilion Chop */}
      <footer className="ms-colophon">
        <div className="ms-motto-wrap">
          <span className="ms-motto-kicker">核心论断</span>
          <strong className="ms-motto-text">兵民是胜利之本</strong>
          <svg className="ms-brush-svg" viewBox="0 0 320 12" aria-hidden="true">
            <path className="ms-brush-line" d="M 4 7 Q 158 2 316 8" pathLength="1" />
          </svg>
        </div>
        <div className="cinema-chop ms-chop" aria-label="战略预见印章">
          <span>持久战</span>
          <em>战略预见</em>
        </div>
      </footer>
    </div>
  );
}

/* ========================================================================== */
/* 2. e-36 遵义会议 — Z-Axis Archival Dossier & Course-Correction Compass     */
/* ========================================================================== */

function DossierStage({ phase }) {
  return (
    <div className="cinema-sheet cinema-dossier" data-phase={phase}>
      <header className="dossier-header">
        <div className="dossier-stamp-id">档号 · 1935-01-ZY</div>
        <span className="dossier-meta">贵州遵义 · 中共中央政治局扩大会议</span>
      </header>

      {/* Beat 0: Urgent Crisis Dossier & Scope Distinction */}
      <section className="ds-crisis-bar">
        <div className="ds-agenda-pills">
          <div className="ds-pill ds-pill-primary">
            <i>01</i>
            <span>集中解决<strong>军事指挥</strong>问题</span>
          </div>
          <div className="ds-pill ds-pill-primary">
            <i>02</i>
            <span>集中解决<strong>党的组织</strong>问题</span>
          </div>
        </div>
        <div className="ds-scope-note">
          <span>考纲辨析</span>
          <em>战事紧迫 · 当时尚未系统讨论政治路线（留待瓦窑堡会议解决）</em>
        </div>
      </section>

      {/* Beat 1: Z-Depth Course-Correction Apparatus (Old Left Line vs Precision Bearing Dial vs New Core) */}
      <section className="ds-correction-deck" aria-label="路线纠偏与领导核心确立">
        <div className="ds-card ds-card-rejected">
          <span className="ds-card-eyebrow">纠偏对象</span>
          <strong>错误军事领导</strong>
          <p>“左”倾教条主义指挥，导致第五次反“围剿”与长征初期严重受挫</p>
          <svg className="ds-slash-svg" viewBox="0 0 220 130" aria-hidden="true">
            <path className="ds-slash-line" d="M 16 74 L 198 22" pathLength="1" />
          </svg>
          <span className="ds-reject-tag">予以纠正</span>
        </div>

        <div className="ds-compass-core" aria-label="航向校准罗盘">
          <svg className="ds-compass-svg" viewBox="0 -10 156 168">
            <circle cx="78" cy="78" r="64" className="ds-ring-outer" />
            <circle cx="78" cy="78" r="48" className="ds-ring-inner" />
            {/* Calibrated upper arc from -45deg to +45deg */}
            <path d="M 32 52 A 54 54 0 0 1 124 52" className="ds-arc-scale" />
            <line x1="78" y1="16" x2="78" y2="28" className="ds-tick-north" />
            <line x1="39" y1="36" x2="46" y2="44" className="ds-tick-err" />
            <line x1="117" y1="36" x2="110" y2="44" className="ds-tick-minor" />
            <text x="78" y="4" textAnchor="middle" className="ds-compass-n">正轨</text>
            <text x="20" y="34" textAnchor="middle" className="ds-compass-err">偏航</text>
            {/* Swinging compass needle: rotates from -44deg to 0deg driven by --b1 */}
            <g className="ds-needle-group">
              <polygon points="78,28 84,78 78,86 72,78" className="ds-needle-north" />
              <polygon points="78,124 83,78 78,72 73,78" className="ds-needle-south" />
              <circle cx="78" cy="78" r="5.5" className="ds-needle-pin" />
            </g>
          </svg>
          <span className="ds-compass-caption">校准航向</span>
        </div>

        <div className="ds-card ds-card-adopted">
          <span className="ds-card-eyebrow">确立新核心</span>
          <strong>从中国实际出发</strong>
          <p>增选毛泽东为中央政治局常委，形成新的中央领导集体，挽救危局</p>
          <span className="ds-adopt-tag">事实确立领导地位</span>
        </div>
      </section>

      {/* Beat 2: Z-Axis Cascading Historical Significance Plinths */}
      <footer className="ds-turning-footer">
        <div className="ds-saves-row">
          <span className="ds-save-chip" style={{ '--chip-i': 0 }}>挽救了党</span>
          <span className="ds-save-chip" style={{ '--chip-i': 1 }}>挽救了红军</span>
          <span className="ds-save-chip" style={{ '--chip-i': 2 }}>挽救了中国革命</span>
        </div>
        <div className="ds-finale-row">
          <div className="ds-finale-copy">
            <strong>生死攸关的转折点</strong>
            <small>开始独立自主地运用马克思主义原理解决中国革命实际问题</small>
          </div>
          <div className="cinema-chop ds-chop">
            <span>独立自主</span>
            <em>1935·遵义</em>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ========================================================================== */
/* 3. e-47 新中国成立 — Modern Woodcut Print & 5-Layer 2.5D Parallax Cinema    */
/* ========================================================================== */

function WoodcutStage({ phase }) {
  const rays = Array.from({ length: 15 }, (_, i) => {
    const angle = -165 + (i * 150) / 14;
    const rad = (angle * Math.PI) / 180;
    const x2 = 420 + Math.cos(rad) * 460;
    const y2 = 278 + Math.sin(rad) * 420;
    return { i, x2: x2.toFixed(1), y2: y2.toFixed(1), major: i % 2 === 0 };
  });

  const skyGouges = [34, 52, 72, 94, 118, 144, 172];
  const lanternXs = [292, 326, 360, 394, 446, 480, 514, 548];

  return (
    <div className="cinema-sheet cinema-woodcut" data-phase={phase}>
      <div className="wc-frame">
        {/* Layer 0: Dawn Sky, Carved Woodcut Sky Gouges & Radiating Sunbeams */}
        <div className="wc-layer wc-layer-sky" aria-hidden="true">
          <svg viewBox="0 0 840 460" preserveAspectRatio="xMidYMid slice">
            <defs>
              <radialGradient id="wc-dawn-glow" cx="50%" cy="62%" r="64%">
                <stop offset="0%" className="wc-glow-core" />
                <stop offset="48%" className="wc-glow-mid" />
                <stop offset="100%" className="wc-glow-edge" />
              </radialGradient>
            </defs>
            <rect width="840" height="460" className="wc-sky-base" />
            <rect width="840" height="460" fill="url(#wc-dawn-glow)" className="wc-sky-dawn" />

            {/* Carved parallel woodcut sky gouge lines */}
            <g className="wc-gouges">
              {skyGouges.map((y, idx) => (
                <path
                  key={y}
                  d={`M ${20 + idx * 14} ${y} Q 420 ${y - 10} ${820 - idx * 14} ${y}`}
                  strokeDasharray={idx % 2 ? '32 10 14 8' : '48 12 22 10'}
                />
              ))}
            </g>

            {/* 15 Radiating woodcut dawn sunbeams */}
            <g className="wc-sunbeams">
              {rays.map((r) => (
                <line
                  key={r.i}
                  x1="420"
                  y1="278"
                  x2={r.x2}
                  y2={r.y2}
                  className={r.major ? 'wc-ray-major' : 'wc-ray-minor'}
                  pathLength="1"
                />
              ))}
            </g>

            {/* Rising dawn sun disk behind rostrum */}
            <circle cx="420" cy="278" r="108" className="wc-sun-disk" />
            <circle cx="420" cy="278" r="134" className="wc-sun-ring" />
          </svg>
        </div>

        {/* Layer 1: Woodcut Cloud Scrolls & Distant City Horizon */}
        <div className="wc-layer wc-layer-clouds" aria-hidden="true">
          <svg viewBox="0 0 840 460" preserveAspectRatio="xMidYMid slice">
            <path
              className="wc-cloud-band"
              d="M -20 226 Q 90 202 184 220 Q 250 232 308 214 L 308 240 L -20 240 Z"
            />
            <path
              className="wc-cloud-band"
              d="M 540 208 Q 624 190 718 212 Q 785 224 865 206 L 865 234 L 540 234 Z"
            />
            <path
              className="wc-horizon-ridge"
              d="M 0 330 L 95 312 L 178 322 L 245 304 L 310 318 L 530 318 L 605 304 L 690 320 L 768 308 L 840 326 L 840 460 L 0 460 Z"
            />
          </svg>
        </div>

        {/* Layer 2: Monumental Tiananmen Rostrum Architectural Woodcut + Huabiao + Palace Lanterns */}
        <div className="wc-layer wc-layer-rostrum" aria-hidden="true">
          <svg viewBox="0 0 840 460" preserveAspectRatio="xMidYMid meet">
            {/* Celebratory woodcut starburst fireworks blooming in Beat 1 */}
            <g className="wc-firework wc-fw-left" transform="translate(178, 128)">
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                <line
                  key={deg}
                  x1="0"
                  y1="-10"
                  x2="0"
                  y2={deg % 60 === 0 ? '-38' : '-24'}
                  transform={`rotate(${deg})`}
                />
              ))}
            </g>
            <g className="wc-firework wc-fw-right" transform="translate(668, 118)">
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                <line
                  key={deg}
                  x1="0"
                  y1="-10"
                  x2="0"
                  y2={deg % 60 === 0 ? '-42' : '-26'}
                  transform={`rotate(${deg})`}
                />
              ))}
            </g>

            {/* Left & Right Huabiao ceremonial marble columns */}
            <g className="wc-huabiao">
              <path d="M 188 358 V 258 M 176 270 H 200 M 182 258 Q 188 248 194 258 M 179 358 H 197" />
              <path d="M 652 358 V 258 M 640 270 H 664 M 646 258 Q 652 248 658 258 M 643 358 H 661" />
            </g>

            {/* Rostrum Architectural Silhouette */}
            <g className="wc-rostrum-arch">
              {/* Upper roof — 重檐歇山顶 */}
              <path
                className="wc-roof"
                d="M 278 214 Q 318 206 346 184 H 494 Q 522 206 562 214 Q 514 218 494 220 H 346 Q 326 218 278 214 Z"
              />
              {/* Roof ridge & finials */}
              <path className="wc-ridge-highlight" d="M 344 184 H 496 M 342 184 L 336 177 M 498 184 L 504 177" />
              {/* Upper clerestory hall */}
              <rect x="314" y="220" width="212" height="22" className="wc-hall-body" />
              {/* Lower eave */}
              <path
                className="wc-roof"
                d="M 238 258 Q 288 250 310 238 H 530 Q 552 250 602 258 Q 558 263 534 265 H 306 Q 282 263 238 258 Z"
              />
              {/* Main colonnade & hall */}
              <rect x="268" y="265" width="304" height="36" className="wc-hall-body" />
              {/* Colonnade pillars (woodcut negative-space vertical ribs) */}
              {[286, 314, 342, 370, 470, 498, 526, 554].map((px) => (
                <line key={px} x1={px} y1="266" x2={px} y2="300" className="wc-pillar" />
              ))}
              {/* Central National Emblem medallion */}
              <circle cx="420" cy="282" r="11" className="wc-emblem-disc" />
              <path
                className="wc-emblem-star"
                d="M 420 274 L 422.1 279.6 L 428 279.6 L 423.2 283 L 425 288.6 L 420 285.2 L 415 288.6 L 416.8 283 L 412 279.6 L 417.9 279.6 Z"
              />
              {/* White marble balustrade */}
              <rect x="242" y="301" width="356" height="8" className="wc-balustrade" />
              {/* Grand crimson wall & 5 arched gates */}
              <path
                className="wc-wall"
                d="M 226 309 H 614 V 382 H 558 V 348 A 14 14 0 0 0 530 348 V 382 H 498 V 344 A 15 15 0 0 0 468 344 V 382 H 442 V 338 A 22 22 0 0 0 398 338 V 382 H 372 V 344 A 15 15 0 0 0 342 344 V 382 H 310 V 348 A 14 14 0 0 0 282 348 V 382 H 226 Z"
              />
              {/* Carved horizontal woodcut masonry grooves */}
              <path className="wc-wall-grooves" d="M 232 322 H 608 M 232 336 H 390 M 450 336 H 608" />
            </g>

            {/* 8 Palace Lanterns illuminating in Beat 1 */}
            <g className="wc-lanterns">
              {lanternXs.map((lx, idx) => (
                <g key={lx} transform={`translate(${lx}, 270)`} style={{ '--lantern-i': idx }}>
                  <ellipse cx="0" cy="5" rx="5.2" ry="6.2" className="wc-lantern-body" />
                  <line x1="0" y1="11.5" x2="0" y2="17" className="wc-lantern-tassel" />
                </g>
              ))}
            </g>
          </svg>
        </div>

        {/* Layer 3: Foreground Woodcut Flag-Sea & Crowd Wave Silhouette */}
        <div className="wc-layer wc-layer-foreground" aria-hidden="true">
          <svg viewBox="0 0 840 460" preserveAspectRatio="xMidYMax slice">
            {/* Stylised fluttering ceremonial banners left & right */}
            <g className="wc-banners">
              <path d="M 62 430 L 76 348 C 102 342 126 356 154 348 L 146 378 C 118 386 96 374 72 380" />
              <path d="M 122 438 L 134 366 C 156 361 178 372 200 366 L 194 392 C 172 398 152 388 130 394" />
              <path d="M 778 430 L 764 348 C 738 342 714 356 686 348 L 694 378 C 722 386 744 374 768 380" />
              <path d="M 718 438 L 706 366 C 684 361 662 372 640 366 L 646 392 C 668 398 688 388 710 394" />
            </g>
            {/* Foreground ceremonial square wave silhouette */}
            <path
              className="wc-crowd-silhouette"
              d="M 0 398 Q 92 384 196 394 T 420 392 T 646 394 T 840 388 L 840 460 L 0 460 Z"
            />
          </svg>
        </div>

        {/* Layer 4: Editorial Documentary Overlay Plane */}
        <div className="wc-layer wc-layer-editorial">
          {/* Beat 0: Pre-dawn CPPCC Common Program Plaque */}
          <div className="wc-plaque-prep">
            <span>1949年9月 · 建国筹备</span>
            <strong>第一届人民政协 · 通过《共同纲领》</strong>
          </div>

          {/* Beat 1+: Monumental Founding Headline */}
          <div className="wc-founding-title">
            <span className="wc-date-monument">1949 · 10 · 1</span>
            <strong>中华人民共和国成立</strong>
          </div>

          {/* Beat 2: Bottom Epigraphs + Cinnabar Woodcut Chop */}
          <div className="wc-finale-bar">
            <div className="wc-epigraph">
              <span>民族独立 · 人民解放</span>
              <small>开辟中国历史新纪元</small>
            </div>
            <div className="cinema-chop wc-chop">
              <span>开国大典</span>
              <em>1949</em>
            </div>
            <div className="wc-epigraph wc-epigraph-right">
              <span>走向国家建设</span>
              <small>为新制度创造根本条件</small>
            </div>
          </div>
        </div>
      </div>

      <footer className="wc-edition-strip">
        <span>套色木刻 · 1949 开国大典</span>
        <span>北京 · 天安门</span>
      </footer>
    </div>
  );
}

/* ========================================================================== */
/* 4. prc-m-6 十一届三中全会 — 1978 Historical Broadsheet & Split Clash        */
/* ========================================================================== */

function BroadsheetStage({ phase }) {
  const routes = [
    { num: '01', name: '思想路线', detail: '解放思想 · 实事求是' },
    { num: '02', name: '政治路线', detail: '停止阶级斗争为纲 · 经济建设' },
    { num: '03', name: '组织路线', detail: '恢复民主集中制 · 新领导集体' },
  ];

  const insights = ['国家命运', '实践检验', '时代潮流', '人民心声'];

  return (
    <div className="cinema-sheet cinema-broadsheet" data-phase={phase}>
      <header className="bs-masthead">
        <span className="bs-edition">公报特刊 · 1978</span>
        <strong className="bs-paper-name">历史转折号外</strong>
        <span className="bs-issue">1978.12.18—22 · 北京</span>
      </header>

      {/* Beat 0: Split-Column Ideological Icebreaking Clash */}
      <section className="bs-clash-grid" aria-label="破除旧束缚与思想解放双栏对照">
        <div className="bs-col bs-col-old">
          <span className="bs-col-kicker">彻底否定 · 历史纠偏</span>
          <div className="bs-old-slab">
            <strong>「两个凡是」</strong>
            <svg className="bs-redline-svg" viewBox="0 0 200 32" aria-hidden="true">
              <path className="bs-redline-path" d="M 8 18 L 192 14" pathLength="1" />
            </svg>
          </div>
          <div className="bs-old-slab">
            <strong>「以阶级斗争为纲」</strong>
            <svg className="bs-redline-svg" viewBox="0 0 200 32" aria-hidden="true">
              <path className="bs-redline-path bs-redline-2" d="M 8 18 L 192 14" pathLength="1" />
            </svg>
          </div>
        </div>

        <div className="bs-col bs-col-new">
          <span className="bs-col-kicker">主题报告 · 思想破冰</span>
          <strong className="bs-new-headline">《解放思想，实事求是，团结一致向前看》</strong>
          <p className="bs-new-quote">实践是检验真理的唯一标准 · 冲破长期“左”倾束缚</p>
        </div>
      </section>

      {/* Beat 1: Three Re-established Lines */}
      <section className="bs-routes-row" aria-label="重新确立三条正确路线">
        {routes.map((item, idx) => (
          <div key={item.num} className="bs-route-slip" style={{ '--slip-i': idx }}>
            <span className="bs-slip-num">{item.num}</span>
            <strong>{item.name}</strong>
            <small>{item.detail}</small>
          </div>
        ))}
      </section>

      {/* Beat 2: Center-of-Gravity Shift Track + Four Insights */}
      <section className="bs-shift-band" aria-label="全党工作重点转移">
        <div className="bs-shift-header">
          <span className="bs-shift-from">旧轨 · 阶级斗争</span>
          <span className="bs-shift-label">工作重点战略转移</span>
          <span className="bs-shift-to">新轨 · 经济建设与改革开放</span>
        </div>
        <div className="bs-shift-track" aria-hidden="true">
          <div className="bs-shift-fill" />
          <div className="bs-shift-thumb" />
        </div>
        <div className="bs-insights-row">
          {insights.map((word, idx) => (
            <span key={word} className="bs-insight-pill" style={{ '--ins-i': idx }}>
              {word}
            </span>
          ))}
        </div>
      </section>

      {/* Beat 3: Commemorative Broadsheet Banner + Chop */}
      <footer className="bs-finale-banner">
        <div className="bs-finale-text">
          <strong>建国以来具有深远意义的伟大转折</strong>
          <small>开启我国改革开放和社会主义现代化建设新时期</small>
        </div>
        <div className="cinema-chop bs-chop">
          <span>伟大转折</span>
          <em>1978·新时期</em>
        </div>
      </footer>
    </div>
  );
}

/* ========================================================================== */
/* Unified Single-Clock Host                                                  */
/* ========================================================================== */

export function StageCinema({
  scene,
  story,
  phase = 0,
  playing = false,
  reduce = false,
  controller,
  clock,
  sceneStart = 0,
}) {
  const rootRef = useRef(null);
  const pilot = getPilotStage(scene?.id);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !pilot || !story) return undefined;

    const applyTime = (localSeconds, isPlaying = playing) => {
      const { overall, b } = computeBeatProgress(story, localSeconds, reduce, isPlaying);
      el.style.setProperty('--p', overall.toFixed(4));
      el.style.setProperty('--b0', (b[0] ?? 0).toFixed(4));
      el.style.setProperty('--b1', (b[1] ?? 0).toFixed(4));
      el.style.setProperty('--b2', (b[2] ?? 0).toFixed(4));
      el.style.setProperty('--b3', (b[3] ?? 0).toFixed(4));
      // Smooth eased progress variables for crisp physical SVG/transform interpolation
      el.style.setProperty('--b0-ease', smoothstep(0, 0.72, b[0] ?? 0).toFixed(4));
      el.style.setProperty('--b1-ease', smoothstep(0, 0.76, b[1] ?? 0).toFixed(4));
      el.style.setProperty('--b2-ease', smoothstep(0, 0.72, b[2] ?? 0).toFixed(4));
      el.style.setProperty('--b3-ease', smoothstep(0, 0.68, b[3] ?? 0).toFixed(4));
    };

    const active = {
      id: scene.id,
      seek(localSeconds, opts = {}) {
        applyTime(localSeconds, opts.playing ?? playing);
      },
    };
    if (controller) controller.current = active;

    const initialPlayback = Math.max(0, (clock?.current?.time ?? sceneStart) - sceneStart);
    applyTime(storyTimeFor(story, scene, initialPlayback), playing);

    return () => {
      if (controller && controller.current === active) controller.current = null;
    };
  }, [scene, story, pilot, reduce, playing, controller, clock, sceneStart]);

  if (!pilot) return null;

  // Deterministic SSR/initial CSS custom properties without 1-frame flash
  const initialStyle = (() => {
    if (clock && story) {
      const localSec = storyTimeFor(story, scene, Math.max(0, (clock.current?.time ?? sceneStart) - sceneStart));
      const { overall, b } = computeBeatProgress(story, localSec, reduce, playing);
      return {
        '--p': overall.toFixed(4),
        '--b0': (b[0] ?? 0).toFixed(4),
        '--b1': (b[1] ?? 0).toFixed(4),
        '--b2': (b[2] ?? 0).toFixed(4),
        '--b3': (b[3] ?? 0).toFixed(4),
        '--b0-ease': smoothstep(0, 0.72, b[0] ?? 0).toFixed(4),
        '--b1-ease': smoothstep(0, 0.76, b[1] ?? 0).toFixed(4),
        '--b2-ease': smoothstep(0, 0.72, b[2] ?? 0).toFixed(4),
        '--b3-ease': smoothstep(0, 0.68, b[3] ?? 0).toFixed(4),
      };
    }
    return {
      '--p': (phase / Math.max(1, (story?.beats?.length || 3) - 1)).toFixed(3),
      '--b0': phase >= 0 ? '1' : '0',
      '--b1': phase >= 1 ? '1' : '0',
      '--b2': phase >= 2 ? '1' : '0',
      '--b3': phase >= 3 ? '1' : '0',
      '--b0-ease': phase >= 0 ? '1' : '0',
      '--b1-ease': phase >= 1 ? '1' : '0',
      '--b2-ease': phase >= 2 ? '1' : '0',
      '--b3-ease': phase >= 3 ? '1' : '0',
    };
  })();

  return (
    <div
      ref={rootRef}
      className={`stage-cinema stage-cinema-${pilot.kind} ${playing ? 'is-playing' : 'is-paused'}`}
      data-stage-kind={pilot.kind}
      data-scene-id={scene.id}
      data-phase={phase}
      style={initialStyle}
      role="region"
      aria-label={`${scene.title} · ${pilot.badge}`}
    >
      <div className="stage-cinema-chrome">
        <span className="stage-cinema-badge">{pilot.badge}</span>
        <span className="stage-cinema-anchor">{pilot.anchorLabel}</span>
      </div>

      <div className="stage-cinema-body">
        {pilot.kind === 'manuscript' && <ManuscriptStage phase={phase} />}
        {pilot.kind === 'dossier' && <DossierStage phase={phase} />}
        {pilot.kind === 'woodcut' && <WoodcutStage phase={phase} />}
        {pilot.kind === 'broadsheet' && <BroadsheetStage phase={phase} />}
      </div>
    </div>
  );
}
