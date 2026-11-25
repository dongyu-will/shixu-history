import { useEffect, useState } from 'react';
import { ArrowUpRight, Pause, Play, ShieldCheck, SkipBack, SkipForward } from '@phosphor-icons/react';

export const LAND_EVOLUTION_STEPS = Object.freeze([
  {
    id: 'land-70',
    year: '1853',
    name: '《天朝田亩制度》',
    layers: 1,
    mode: 'blueprint',
    baseTitle: '绝对平均方案 · 按人口平分土地',
    baseSub: '“凡天下田，天下人同耕” · 虚线蓝图',
    stamp: '未实施',
    changed: '提出彻底否定封建地权的平均蓝图',
    kept: '绝对平均空想，未能付诸实施',
    badge: null,
  },
  {
    id: 'land-71',
    year: '1905',
    name: '同盟会 · 平均地权',
    layers: 2,
    mode: 'value',
    baseTitle: '原有地价 · 仍归原主',
    baseSub: '未正面触及封建土地所有制',
    midTitle: '革命后新增地价 · 归国家所有',
    midSub: '核定地价，涨价归公',
    stamp: '涨价归公',
    changed: '引入“核定地价、涨价归公”的财政思路',
    kept: '未正面废除封建地主土地所有制',
    badge: '只收增值',
  },
  {
    id: 'land-74',
    year: '1928',
    name: '《井冈山土地法》',
    layers: 1,
    mode: 'confiscate-all',
    baseTitle: '没收一切土地 · 归苏维埃政府所有',
    baseSub: '党史第一部土地法 · 打击面过宽',
    stamp: '没收一切',
    changed: '以革命政权首次立法没收土地归公',
    kept: '缺憾：伤及中农，未给农民所有权',
    badge: '伤及中农（警示）',
    badgeTone: 'warn',
  },
  {
    id: 'land-75',
    year: '1929',
    name: '《兴国土地法》',
    layers: 2,
    mode: 'use-right',
    baseTitle: '所有权 · 仍归苏维埃政府',
    baseSub: '仅没收一切公共土地及地主阶级土地',
    midTitle: '使用权 · 分配给农民耕种',
    midSub: '农民获得使用权，尚未获得所有权',
    stamp: '保护中农',
    changed: '将“没收一切”改为只没收公田与地主土地',
    kept: '原则性纠偏：保护中农；农民仅获使用权',
    badge: '保护中农',
    badgeTone: 'shield',
  },
  {
    id: 'land-76',
    year: '1931',
    name: '土地革命路线',
    layers: 1,
    mode: 'peasant-private',
    baseTitle: '所有权明确归 · 农民个人私有',
    baseSub: '依靠贫雇农、联合中农、限制富农、消灭地主',
    stamp: '农民私有',
    changed: '农民从“仅获使用权”转为拥有个人所有权',
    kept: '坚定依靠贫雇农、保护中小工商业者',
    badge: '联合中农 · 限制富农',
    badgeTone: 'shield',
  },
  {
    id: 'land-77',
    year: '抗战',
    name: '减租减息政策',
    layers: 2,
    mode: 'rent',
    baseTitle: '地主土地所有权 · 未普遍改变',
    baseSub: '暂停没收，服从全民族抗战大局',
    midTitle: '地主减租减息 ⇄ 农民交租交息',
    midSub: '双向调节租息负担，团结开明地主',
    stamp: '双减双交',
    changed: '暂缓土改，转为双向减租交租的统一战线政策',
    kept: '土地权属未普遍变更，团结一切抗日力量',
    badge: '团结抗日',
    badgeTone: 'shield',
  },
  {
    id: 'land-78',
    year: '1946',
    name: '《五四指示》',
    layers: 1,
    mode: 'peasant-transfer',
    baseTitle: '由减租减息转向 · 耕者有其田',
    baseSub: '以清算购买为主，逐步实现农民得地',
    stamp: '转向土改',
    changed: '解放战争前夜政策转向“耕者有其田”',
    kept: '一般不动富农土地，继续保护中农利益',
    badge: '一般不动富农',
    badgeTone: 'shield',
  },
  {
    id: 'land-79',
    year: '1947',
    name: '《中国土地法大纲》',
    layers: 1,
    mode: 'equal-farm',
    baseTitle: '彻底废除封建剥削 · 农会接收平分',
    baseSub: '耕者有其田，乡村一切地主土地均分到户',
    stamp: '彻底废除',
    changed: '明确立法废除封建及半封建剥削土地制度',
    kept: '激发亿万翻身农民踊跃支前的磅礴伟力',
    badge: '耕者有其田',
    badgeTone: 'force',
  },
  {
    id: 'prc-l-1',
    year: '1950',
    name: '《中华人民共和国土地改革法》',
    layers: 1,
    mode: 'preserve-rich',
    baseTitle: '农民土地所有制 · 颁证确权',
    baseSub: '新解放区土改完成，彻底摧毁封建根基',
    stamp: '保存富农',
    changed: '由征收富农多余土地改为保存富农经济',
    kept: '实行农民土地所有制，为国家工业化开辟道路',
    badge: '保存富农经济',
    badgeTone: 'shield',
  },
  {
    id: 'prc-l-2',
    year: '1956',
    name: '农业社会主义改造',
    layers: 1,
    mode: 'collective',
    baseTitle: '生产资料 · 农民集体公有',
    baseSub: '自愿互利：互助组 → 初级社 → 高级社合为一体',
    stamp: '集体公有',
    changed: '分散个体私产逐步聚拢为社会主义集体所有',
    kept: '循序渐进过渡，确立农村公有制根基',
    badge: '三步合体',
    badgeTone: 'org',
  },
  {
    id: 'prc-l-3',
    year: '1978',
    name: '家庭联产承包责任制',
    layers: 2,
    mode: 'two-rights',
    baseTitle: '底层锁定 · 集体土地所有权',
    baseSub: '公有制根基保持不变',
    midTitle: '上层剥离 · 家庭承包经营权',
    midSub: '包产到户、包干到户，释放农户自主活力',
    stamp: '两权分离',
    changed: '打破集体统一经营，剥离出家庭承包经营权',
    kept: '底线不变：土地仍归农村集体所有',
    badge: '小岗村18枚红手印',
    badgeTone: 'force',
  },
  {
    id: 'prc-l-4',
    year: '2017',
    name: '农村土地“三权分置”',
    layers: 3,
    mode: 'three-rights',
    baseTitle: '01 底层 · 集体所有权',
    baseSub: '落实归集体 · 守牢公有制底线',
    midTitle: '02 中层 · 农户承包权',
    midSub: '稳定延包三十年 · 保障农户长久权益',
    topTitle: '03 顶层 · 土地经营权',
    topSub: '放活流转经营 · 适配现代农业规模化',
    stamp: '三权分置',
    changed: '从承包经营权中再剥离出独立可流转经营权',
    kept: '两权稳固：集体所有权 + 农户承包权不动摇',
    badge: '三层并置并行',
    badgeTone: 'force',
  },
]);

const STRATEGIC_STEPS = Object.freeze([
  {
    id: 'writing-88',
    step: 1,
    label: '第一阶段 · 起点一致',
    anti: { name: '战略防御', note: '1937.7—1938.10 · 敌强我弱，空间换时间' },
    lib: { name: '战略防御', note: '1946.6—1947.6 · 粉碎全面进攻与重点进攻' },
    alert: '两场战争第一阶段均称「战略防御」——真正分水岭从第二阶段开始！',
  },
  {
    id: 'writing-88',
    step: 2,
    label: '第二阶段 · 高频陷阱分叉',
    anti: { name: '战略相持（最关键）', note: '敌后游击战成为主战场，扭转敌我力量对比' },
    lib: { name: '战略进攻（挺进中原）', note: '1947.6 刘邓大军千里跃进大别山，转入外线进攻' },
    alert: '易混锁定：抗日战争是「战略相持」，解放战争没有相持，直接转入「战略进攻」！',
  },
  {
    id: 'e-45',
    step: 3,
    label: '第三阶段 · 终局命名各异',
    anti: { name: '战略反攻', note: '1945年局部反攻转全面反攻，赢得抗战胜利' },
    lib: { name: '战略决战', note: '辽沈、淮海、平津三大战役，决定中国命运' },
    alert: '易混锁定：抗日战争收官为「战略反攻」，解放战争决胜为「战略决战」！',
  },
]);

const RESOLUTION_STEPS = Object.freeze([
  {
    id: 'meeting-61',
    year: '1945',
    ordinal: '第一个历史决议',
    meeting: '党的六届七中全会',
    title: '《关于若干历史问题的决议》',
    focus: '总结建党以来正反经验，批判历次“左”右倾错误',
    outcome: '统一全党思想，为中共七大确立毛泽东思想指导地位奠定基础',
  },
  {
    id: 'prc-m-8',
    year: '1981',
    ordinal: '第二个历史决议',
    meeting: '党的十一届六中全会',
    title: '《关于建国以来党的若干历史问题的决议》',
    focus: '彻底否定“文化大革命”，科学评价毛泽东与毛泽东思想活的灵魂',
    outcome: '标志党在指导思想上的拨乱反正胜利完成',
  },
  {
    id: 'prc-m-18',
    year: '2021',
    ordinal: '第三个历史决议',
    meeting: '党的十九届六中全会',
    title: '《关于党的百年奋斗重大成就和历史经验的决议》',
    focus: '着重总结新时代成就变革，阐明“两个确立”决定性意义',
    outcome: '概括五大历史意义与“十个坚持”百年宝贵经验',
  },
]);

export const EVOLUTION_SET_IDS = Object.freeze(['land-evolution', 'strategic-stages', 'three-resolutions']);

function useStepController({ total, controlledStep, onStepChange, defaultStep = 0, intervalMs = 2400 }) {
  const [localStep, setLocalStep] = useState(defaultStep);
  const [autoPlay, setAutoPlay] = useState(false);

  const rawStep = typeof controlledStep === 'number' ? controlledStep : localStep;
  const stepIdx = Math.max(0, Math.min(total - 1, rawStep));

  const updateStep = (updater) => {
    const next = typeof updater === 'function' ? updater(stepIdx) : updater;
    const clamped = Math.max(0, Math.min(total - 1, next));
    if (typeof controlledStep !== 'number') {
      setLocalStep(clamped);
    }
    onStepChange?.(clamped);
  };

  useEffect(() => {
    if (!autoPlay) return undefined;
    const timer = window.setInterval(() => {
      if (stepIdx >= total - 1) {
        setAutoPlay(false);
        return;
      }
      const next = stepIdx + 1;
      if (typeof controlledStep !== 'number') {
        setLocalStep(next);
      }
      onStepChange?.(next);
      if (next >= total - 1) {
        setAutoPlay(false);
      }
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [autoPlay, stepIdx, total, intervalMs, controlledStep, onStepChange]);

  const togglePlay = () => {
    if (!autoPlay && stepIdx >= total - 1) {
      updateStep(0);
      setAutoPlay(true);
    } else {
      setAutoPlay((v) => !v);
    }
  };

  const goTo = (idx) => {
    setAutoPlay(false);
    updateStep(idx);
  };

  return { stepIdx, autoPlay, setAutoPlay, togglePlay, goTo };
}

function EvoHeader({
  kicker,
  title,
  stepIdx,
  total,
  autoPlay,
  onPrev,
  onTogglePlay,
  onNext,
  playLabel,
  onInspect,
}) {
  const pct = total > 1 ? ((stepIdx + 1) / total) * 100 : 100;
  return (
    <>
      <div className="evo-topbar">
        <div className="evo-title-group">
          <span className="evo-kicker">{kicker}</span>
          <h4>{title}</h4>
        </div>
        <div className="evo-controls">
          <span className="evo-step-count" aria-live="polite">
            第 {stepIdx + 1} / {total} 步
          </span>
          <button
            type="button"
            className="evo-icon-btn"
            aria-label="上一步"
            disabled={stepIdx === 0}
            onClick={onPrev}
          >
            <SkipBack size={14} weight="fill" />
          </button>
          <button
            type="button"
            className="evo-play-btn"
            aria-label={autoPlay ? `暂停${playLabel}` : `播放${playLabel}`}
            onClick={onTogglePlay}
          >
            {autoPlay ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" />}
            <span>{autoPlay ? '暂停' : stepIdx >= total - 1 ? `重播 ${total} 步` : '自动演示'}</span>
          </button>
          <button
            type="button"
            className="evo-icon-btn"
            aria-label="下一步"
            disabled={stepIdx === total - 1}
            onClick={onNext}
          >
            <SkipForward size={14} weight="fill" />
          </button>
          {onInspect && (
            <button type="button" className="evo-jump-btn" onClick={onInspect}>
              <span>播放此幕</span>
              <ArrowUpRight size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="evo-progress-track" aria-hidden="true">
        <div className="evo-progress-fill" style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
    </>
  );
}

function LandEvolutionPlayer({ stepIdx: controlledStep, onStepChange, onInspectMap }) {
  const total = LAND_EVOLUTION_STEPS.length;
  const { stepIdx, autoPlay, togglePlay, goTo } = useStepController({
    total,
    controlledStep,
    onStepChange,
    intervalMs: 2400,
  });

  const step = LAND_EVOLUTION_STEPS[stepIdx];

  return (
    <section
      className="evo-stage evo-land"
      data-layers={step.layers}
      data-mode={step.mode}
      aria-label="土地政策12步演化对照"
    >
      <EvoHeader
        kicker="土地制度演进 · 1853—2017"
        title={
          <>
            <strong>{step.year}</strong> · {step.name}
          </>
        }
        stepIdx={stepIdx}
        total={total}
        autoPlay={autoPlay}
        playLabel="土地政策演示"
        onPrev={() => goTo(stepIdx - 1)}
        onTogglePlay={togglePlay}
        onNext={() => goTo(stepIdx + 1)}
        onInspect={
          onInspectMap
            ? () =>
                onInspectMap(step.id, {
                  panel: 'compare',
                  label: '返回土地演化对照',
                  compareState: { mode: 'preset', scope: 'cross', setId: 'land-evolution' },
                })
            : null
        }
      />

      {/* Persistent Architectural Morphing Strata Canvas */}
      <div className="evo-morph-canvas">
        {/* Layer 3 (Top): Land Operation Right (only peels out in 2017 Three-Rights) */}
        <div className={`evo-plate evo-plate-top ${step.layers >= 3 ? 'is-visible' : ''}`}>
          <div className="evo-plate-head">
            <strong>{step.topTitle || '03 顶层 · 土地经营权'}</strong>
            <small>{step.topSub || '放活流转经营'}</small>
          </div>
          <div className="evo-parcel-strip" aria-hidden="true">
            {[0, 1, 2, 3].map((k) => (
              <span key={k} className="evo-parcel-chip is-flowing" />
            ))}
          </div>
        </div>

        {/* Layer 2 (Middle): Use Right / Value Increment / Rent Flow / Household Contract */}
        <div className={`evo-plate evo-plate-mid ${step.layers >= 2 ? 'is-visible' : ''}`}>
          <div className="evo-plate-head">
            <strong>{step.midTitle || '使用 / 经营权层'}</strong>
            <small>{step.midSub || ''}</small>
          </div>
          {step.mode === 'rent' ? (
            <div className="evo-rent-track" aria-hidden="true">
              <span>地主减租减息 →</span>
              <span>← 农民交租交息</span>
            </div>
          ) : (
            <div className="evo-parcel-strip" aria-hidden="true">
              {[0, 1, 2, 3].map((k) => (
                <span key={k} className="evo-parcel-chip is-mid" />
              ))}
            </div>
          )}
        </div>

        {/* Layer 1 (Base): Grounded Ownership Plate — always present, morphs tone/grid */}
        <div className="evo-plate evo-plate-base">
          <div className="evo-plate-head">
            <strong>{step.baseTitle}</strong>
            <small>{step.baseSub}</small>
          </div>
          <div className={`evo-parcel-grid mode-${step.mode}`} aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((k) => (
              <span key={k} className="evo-parcel-tile" />
            ))}
          </div>
        </div>

        {/* Side Stamp & Protected Wing Callout */}
        <div className="evo-side-meta">
          <div className="evo-stamp-seal">{step.stamp}</div>
          {step.badge && (
            <div className={`evo-wing-badge tone-${step.badgeTone || 'org'}`}>
              <ShieldCheck size={14} />
              <span>{step.badge}</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive 12-Step Year Rail */}
      <div className="evo-rail" role="tablist" aria-label="土地政策12步年份轨道">
        {LAND_EVOLUTION_STEPS.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={idx === stepIdx}
            className={`evo-rail-dot ${idx === stepIdx ? 'is-current' : idx < stepIdx ? 'is-past' : ''}`}
            onClick={() => goTo(idx)}
            title={`${item.year} · ${item.name}`}
          >
            <i />
            <span>{item.year}</span>
          </button>
        ))}
      </div>

      {/* Delta Strip: What changed vs What stayed */}
      <div className="evo-delta-row">
        <div className="evo-delta-item is-changed">
          <span>本步变化</span>
          <p>{step.changed}</p>
        </div>
        <div className="evo-delta-item is-kept">
          <span>底线 / 辨析</span>
          <p>{step.kept}</p>
        </div>
      </div>
    </section>
  );
}

function StrategicStagesPlayer({ stepIdx: controlledStep, onStepChange, onInspectMap }) {
  const total = STRATEGIC_STEPS.length;
  const { stepIdx, autoPlay, togglePlay, goTo } = useStepController({
    total,
    controlledStep,
    onStepChange,
    defaultStep: 0,
    intervalMs: 2400,
  });

  const current = STRATEGIC_STEPS[stepIdx];

  return (
    <section className="evo-stage evo-strategic" aria-label="抗战与解放战争三阶段对照">
      <EvoHeader
        kicker="两场战争三阶段对照"
        title={current.label}
        stepIdx={stepIdx}
        total={total}
        autoPlay={autoPlay}
        playLabel="三阶段对照演示"
        onPrev={() => goTo(stepIdx - 1)}
        onTogglePlay={togglePlay}
        onNext={() => goTo(stepIdx + 1)}
        onInspect={
          onInspectMap
            ? () =>
                onInspectMap(current.id, {
                  panel: 'compare',
                  label: '返回三阶段对照',
                  compareState: { mode: 'preset', scope: 'cross', setId: 'strategic-stages' },
                })
            : null
        }
      />

      <div className="evo-dual-tracks">
        <div className="evo-track-row">
          <span className="evo-track-name">抗日战争（1938《论持久战》）</span>
          <div className="evo-track-cells">
            {STRATEGIC_STEPS.map((s, idx) => (
              <button
                key={s.step}
                type="button"
                className={`evo-track-cell ${idx === stepIdx ? 'is-active' : idx < stepIdx ? 'is-passed' : ''}`}
                onClick={() => goTo(idx)}
              >
                <strong>{s.anti.name}</strong>
                <small>{s.anti.note}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="evo-track-row is-liberation">
          <span className="evo-track-name">人民解放战争（1946—1949）</span>
          <div className="evo-track-cells">
            {STRATEGIC_STEPS.map((s, idx) => (
              <button
                key={s.step}
                type="button"
                className={`evo-track-cell ${idx === stepIdx ? 'is-active' : idx < stepIdx ? 'is-passed' : ''}`}
                onClick={() => goTo(idx)}
              >
                <strong>{s.lib.name}</strong>
                <small>{s.lib.note}</small>
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="evo-alert-strip">{current.alert}</p>
    </section>
  );
}

function ResolutionsCorridorPlayer({ stepIdx: controlledStep, onStepChange, onInspectMap }) {
  const total = RESOLUTION_STEPS.length;
  const { stepIdx, autoPlay, togglePlay, goTo } = useStepController({
    total,
    controlledStep,
    onStepChange,
    intervalMs: 2800,
  });

  const current = RESOLUTION_STEPS[stepIdx];

  return (
    <section className="evo-stage evo-resolutions" aria-label="党的三个历史决议百年对照">
      <EvoHeader
        kicker="党的三个历史决议 · 1945—2021"
        title={`${current.year} · ${current.ordinal}`}
        stepIdx={stepIdx}
        total={total}
        autoPlay={autoPlay}
        playLabel="三个历史决议演示"
        onPrev={() => goTo(stepIdx - 1)}
        onTogglePlay={togglePlay}
        onNext={() => goTo(stepIdx + 1)}
        onInspect={
          onInspectMap
            ? () =>
                onInspectMap(current.id, {
                  panel: 'compare',
                  label: '返回三个历史决议',
                  compareState: { mode: 'preset', scope: 'cross', setId: 'three-resolutions' },
                })
            : null
        }
      />

      <div className="evo-corridor">
        {RESOLUTION_STEPS.map((item, idx) => {
          const offset = idx - stepIdx;
          return (
            <button
              key={item.id}
              type="button"
              className={`evo-tablet ${offset === 0 ? 'is-front' : offset < 0 ? 'is-behind-left' : 'is-behind-right'}`}
              style={{ '--depth-offset': offset }}
              onClick={() => goTo(idx)}
            >
              <span className="evo-tablet-year">{item.year}</span>
              <span className="evo-tablet-ord">{item.ordinal} · {item.meeting}</span>
              <strong>{item.title}</strong>
              <p>{item.focus}</p>
              <em>{item.outcome}</em>
            </button>
          );
        })}
      </div>

      <div className="evo-corridor-footer">
        {RESOLUTION_STEPS.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            className={`evo-year-chip ${idx === stepIdx ? 'is-active' : ''}`}
            onClick={() => goTo(idx)}
          >
            {item.year} · {item.ordinal}
          </button>
        ))}
      </div>
    </section>
  );
}

export function EvolutionStage({ setId, stepIdx, onStepChange, onInspectMap }) {
  if (setId === 'land-evolution') {
    return (
      <LandEvolutionPlayer
        stepIdx={stepIdx}
        onStepChange={onStepChange}
        onInspectMap={onInspectMap}
      />
    );
  }
  if (setId === 'strategic-stages') {
    return (
      <StrategicStagesPlayer
        stepIdx={stepIdx}
        onStepChange={onStepChange}
        onInspectMap={onInspectMap}
      />
    );
  }
  if (setId === 'three-resolutions') {
    return (
      <ResolutionsCorridorPlayer
        stepIdx={stepIdx}
        onStepChange={onStepChange}
        onInspectMap={onInspectMap}
      />
    );
  }
  return null;
}
