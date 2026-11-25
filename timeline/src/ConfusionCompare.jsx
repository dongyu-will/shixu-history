import { useMemo, useRef, useState } from 'react';
import { Eye, EyeSlash, MagnifyingGlass, Scales, Swap } from '@phosphor-icons/react';
import { ClozeText } from './ClozeText.jsx';
import { EvolutionStage } from './EvolutionStage.jsx';
import { buildClozeSegments } from './cloze.js';
import { CONFUSION_SETS, resolveConfusionSet } from './confusion-sets.js';
import { AUTHORED_STORIES } from './stories.js';
import { volumeIdForEvent } from './volumes.js';

const KIND_LABELS = {
  event: '历史事件',
  meeting: '重要会议',
  writing: '代表著作',
  land: '土地政策',
};

const MASTERY_LABELS = {
  known: '已掌握',
  fuzzy: '有点模糊',
  forgot: '未掌握',
};

const SCOPE_OPTIONS = [
  { id: 'all', label: '全部专题' },
  { id: 'cross', label: '跨篇纵贯' },
  { id: 'modern', label: '上篇 · 近代史' },
  { id: 'prc', label: '下篇 · 新中国史' },
];

function setScopeOf(set) {
  return set.scope || 'modern';
}

function handleTablistKeyDown(event, ids, currentId, onSelect) {
  const idx = ids.indexOf(currentId);
  if (idx < 0) return;
  let nextIdx = -1;
  if (event.key === 'ArrowRight') nextIdx = (idx + 1) % ids.length;
  else if (event.key === 'ArrowLeft') nextIdx = (idx - 1 + ids.length) % ids.length;
  else if (event.key === 'Home') nextIdx = 0;
  else if (event.key === 'End') nextIdx = ids.length - 1;
  if (nextIdx >= 0) {
    event.preventDefault();
    onSelect(ids[nextIdx]);
    const container = event.currentTarget.parentElement;
    const buttons = container?.querySelectorAll('[role="tab"]');
    const target = buttons?.[nextIdx];
    target?.focus();
    target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

export function ConfusionCompare({
  events,
  chapters,
  stories = AUTHORED_STORIES,
  masteryMap,
  onInspectMap,
  initialMode = 'preset',
  initialScope = 'all',
  initialSetId = CONFUSION_SETS[0].id,
  initialPair = ['land-74', 'land-75'],
  compareState = null,
  onCompareStateChange = null,
}) {
  const eventById = useMemo(() => Object.fromEntries(events.map((e) => [e.id, e])), [events]);
  const [localState, setLocalState] = useState(() => ({
    mode: initialMode,
    scope: initialScope,
    setId: initialSetId,
    pair: initialPair,
    evoSteps: {},
  }));
  const state = compareState ?? localState;
  const updateState = (updater) => {
    const apply = (prev) => (typeof updater === 'function' ? updater(prev) : { ...prev, ...updater });
    if (onCompareStateChange) onCompareStateChange(apply);
    else setLocalState(apply);
  };
  const { mode, scope, setId, pair, evoSteps = {} } = state;

  const [hideKeys, setHideKeys] = useState(false);
  const [revealed, setRevealed] = useState({});
  const [filterLeft, setFilterLeft] = useState('');
  const [filterRight, setFilterRight] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const chipRowRef = useRef(null);

  const visibleSets = useMemo(() => {
    if (scope === 'all') return CONFUSION_SETS;
    return CONFUSION_SETS.filter((s) => setScopeOf(s) === scope);
  }, [scope]);

  const activeSet = useMemo(() => {
    const found = visibleSets.find((s) => s.id === setId) || visibleSets[0] || CONFUSION_SETS[0];
    return resolveConfusionSet(found, eventById);
  }, [visibleSets, setId, eventById]);

  const filterGrouped = (term) => {
    const q = term.trim().toLowerCase();
    return chapters
      .map((ch, idx) => {
        const globalIdx = ch.globalIndex ?? idx;
        const prefix = ch.volume === 'prc' ? '下篇 · ' : '上篇 · ';
        const items = events.filter((e) => {
          const eventGlobal = (e.volume === 'prc' ? 5 : 0) + e.chapter;
          if (eventGlobal !== globalIdx) return false;
          if (!q) return true;
          return `${e.year} ${e.title} ${e.headline} ${e.location}`.toLowerCase().includes(q);
        });
        return { label: `${prefix}${ch.range} ${ch.title}`, items };
      })
      .filter((g) => g.items.length > 0);
  };

  const groupedLeft = useMemo(() => filterGrouped(filterLeft), [chapters, events, filterLeft]);
  const groupedRight = useMemo(() => filterGrouped(filterRight), [chapters, events, filterRight]);

  const leftEvent = eventById[pair[0]] || events[0];
  const rightEvent = eventById[pair[1]] || events[1] || events[0];

  // Detect when user has manually revealed every masked blank in the active view.
  const allBlankKeys = useMemo(() => {
    const keys = [];
    if (mode === 'preset') {
      for (const item of activeSet.items) {
        const segs = buildClozeSegments(item.diff, item.keyTerms);
        segs.forEach((s) => {
          if (s.blank) keys.push(`set-${activeSet.id}-${item.id}-${s.id}`);
        });
      }
    } else {
      [leftEvent, rightEvent].forEach((ev, slot) => {
        buildClozeSegments(ev.headline).forEach((s) => {
          if (s.blank) keys.push(`free-h-${slot}-${ev.id}-${s.id}`);
        });
        buildClozeSegments(ev.summary).forEach((s) => {
          if (s.blank) keys.push(`free-s-${slot}-${ev.id}-${s.id}`);
        });
      });
    }
    return keys;
  }, [mode, activeSet, leftEvent, rightEvent]);

  const allRevealed = hideKeys && allBlankKeys.length > 0 && allBlankKeys.every((k) => revealed[k]);

  const toggleBlank = (key) => {
    setRevealed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleMaskMode = () => {
    if (allRevealed) {
      setHideKeys(true);
      setRevealed({});
      return;
    }
    setHideKeys((prev) => !prev);
    setRevealed({});
  };

  const swapPair = () => {
    updateState((prev) => ({ ...prev, pair: [prev.pair[1], prev.pair[0]] }));
    setRevealed({});
  };

  const selectSet = (nextId, el) => {
    updateState({ setId: nextId });
    setRevealed({});
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const modeIds = ['preset', 'free'];
  const visibleSetIds = visibleSets.map((s) => s.id);

  return (
    <div className="study-panel compare-panel">
      <div className="study-header">
        <p className="study-kicker">
          <Scales size={15} />
          易混对照
        </p>
        <h2 id="dialog-title">高频易混史事同屏对照，点卡片可直达画面</h2>
      </div>

      <div className="study-toolbar">
        <div className="detail-tabs study-tabs" role="tablist" aria-label="对照模式">
          <button
            id="compare-tab-preset"
            type="button"
            role="tab"
            aria-selected={mode === 'preset'}
            tabIndex={mode === 'preset' ? 0 : -1}
            className={mode === 'preset' ? 'active' : ''}
            onKeyDown={(e) =>
              handleTablistKeyDown(e, modeIds, mode, (next) => {
                updateState({ mode: next });
                setRevealed({});
              })
            }
            onClick={() => {
              updateState({ mode: 'preset' });
              setRevealed({});
            }}
          >
            专题对照（{CONFUSION_SETS.length}组）
          </button>
          <button
            id="compare-tab-free"
            type="button"
            role="tab"
            aria-selected={mode === 'free'}
            tabIndex={mode === 'free' ? 0 : -1}
            className={mode === 'free' ? 'active' : ''}
            onKeyDown={(e) =>
              handleTablistKeyDown(e, modeIds, mode, (next) => {
                updateState({ mode: next });
                setRevealed({});
              })
            }
            onClick={() => {
              updateState({ mode: 'free' });
              setRevealed({});
            }}
          >
            自由对照
          </button>
        </div>

        <div className="mask-controls">
          <button
            type="button"
            className={`pill-toggle ${hideKeys && !allRevealed ? 'is-active' : ''}`}
            aria-pressed={hideKeys && !allRevealed}
            onClick={toggleMaskMode}
          >
            {hideKeys && !allRevealed ? <Eye size={15} /> : <EyeSlash size={15} />}
            <span>{hideKeys && !allRevealed ? '显示全部关键词' : '隐藏关键词自测'}</span>
          </button>
        </div>
      </div>

      {mode === 'preset' ? (
        <div role="tabpanel" aria-labelledby="compare-tab-preset">
          <div className="mobile-filter-bar">
            <span className="mobile-filter-summary">
              {SCOPE_OPTIONS.find((o) => o.id === scope)?.label} · {activeSet.title}
            </span>
            <button
              type="button"
              className="mobile-filter-toggle"
              aria-expanded={mobileFiltersOpen}
              onClick={() => setMobileFiltersOpen((v) => !v)}
            >
              {mobileFiltersOpen ? '收起专题 ▴' : '切换专题 ▾'}
            </button>
          </div>
          <div className={`collapsible-study-filters ${mobileFiltersOpen ? 'is-open' : ''}`}>
            <div className="scope-filter-row" role="group" aria-label="按篇幅筛选易混专题">
              {SCOPE_OPTIONS.map((opt) => {
                const count =
                  opt.id === 'all'
                    ? CONFUSION_SETS.length
                    : CONFUSION_SETS.filter((s) => setScopeOf(s) === opt.id).length;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`scope-pill ${scope === opt.id ? 'is-active' : ''}`}
                    aria-pressed={scope === opt.id}
                    onClick={() => {
                      const nextList =
                        opt.id === 'all'
                          ? CONFUSION_SETS
                          : CONFUSION_SETS.filter((s) => setScopeOf(s) === opt.id);
                      const nextSetId =
                        nextList.length && !nextList.some((s) => s.id === setId) ? nextList[0].id : setId;
                      updateState({ scope: opt.id, setId: nextSetId });
                      setRevealed({});
                    }}
                  >
                    {opt.label}（{count}）
                  </button>
                );
              })}
            </div>

            <div
              ref={chipRowRef}
              className="set-chips set-chips-scroll"
              role="tablist"
              aria-label="选择易混专题"
            >
              {visibleSets.map((set) => {
                const selected = set.id === activeSet.id;
                return (
                  <button
                    key={set.id}
                    id={`compare-set-${set.id}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    tabIndex={selected ? 0 : -1}
                    className={selected ? 'active' : ''}
                    onKeyDown={(e) =>
                      handleTablistKeyDown(e, visibleSetIds, activeSet.id, (next) => selectSet(next))
                    }
                    onClick={(e) => {
                      selectSet(set.id, e.currentTarget);
                      setMobileFiltersOpen(false);
                    }}
                  >
                    {set.title}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="set-intro" role="tabpanel" aria-labelledby={`compare-set-${activeSet.id}`}>
            <h3>{activeSet.title}</h3>
            <p>{activeSet.subtitle}</p>
            {hideKeys && !allRevealed && (
              <p className="cloze-tip">点击下方遮挡块逐项核对，检验自己是否真正分清。</p>
            )}
          </div>

          <EvolutionStage
            setId={activeSet.id}
            stepIdx={evoSteps[activeSet.id]}
            onStepChange={(nextStep) =>
              updateState((prev) => ({
                ...prev,
                evoSteps: { ...(prev.evoSteps || {}), [activeSet.id]: nextStep },
              }))
            }
            onInspectMap={(targetId, ctx) =>
              onInspectMap(targetId, {
                ...ctx,
                compareState: { ...state, mode: 'preset', setId: activeSet.id },
              })
            }
          />

          <div className="compare-grid">
            {activeSet.items.map((item) => {
              const mastery = masteryMap[item.id]?.level;
              const isPrc = volumeIdForEvent(item.id) === 'prc';
              return (
                <article key={item.id} className="compare-card">
                  <div className="compare-card-head">
                    <span className="compare-cue">{item.cue}</span>
                    <span className="compare-badges">
                      <em className={`vol-badge ${isPrc ? 'is-prc' : ''}`}>{isPrc ? '下篇' : '上篇'}</em>
                      {mastery && (
                        <span className={`mastery-pill mastery-${mastery}`}>{MASTERY_LABELS[mastery]}</span>
                      )}
                    </span>
                  </div>
                  <h4>{item.event.title}</h4>
                  <p className="compare-diff">
                    <ClozeText
                      text={item.diff}
                      explicitTerms={item.keyTerms}
                      masked={hideKeys}
                      revealed={revealed}
                      onToggle={toggleBlank}
                      prefix={`set-${activeSet.id}-${item.id}`}
                    />
                  </p>
                  <div className="compare-card-foot">
                    <span className="compare-kind">{KIND_LABELS[item.event.kind]}</span>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        onInspectMap(item.id, {
                          panel: 'compare',
                          label: '返回易混对照',
                          compareState: { ...state, mode: 'preset', setId: activeSet.id },
                        })
                      }
                    >
                      播放此幕
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="free-compare" role="tabpanel" aria-labelledby="compare-tab-free">
          <div className="free-pickers">
            <div className="free-picker-col">
              <div className="free-picker-search">
                <MagnifyingGlass size={14} />
                <input
                  type="search"
                  aria-label="筛选史事 A"
                  placeholder="输入年份或名称筛选史事 A…"
                  value={filterLeft}
                  onChange={(e) => setFilterLeft(e.target.value)}
                />
              </div>
              <label>
                <span>史事 A</span>
                <select
                  aria-label="选择对比史事 A"
                  value={leftEvent.id}
                  onChange={(e) => {
                    const nextA = e.target.value;
                    const nextB = nextA === rightEvent.id ? leftEvent.id : rightEvent.id;
                    updateState({ pair: [nextA, nextB] });
                    setRevealed({});
                  }}
                >
                  {groupedLeft.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.items.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.year} · {ev.title}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
            </div>
            <button type="button" className="icon-button swap-button" aria-label="互换左右史事" onClick={swapPair}>
              <Swap size={18} />
            </button>
            <div className="free-picker-col">
              <div className="free-picker-search">
                <MagnifyingGlass size={14} />
                <input
                  type="search"
                  aria-label="筛选史事 B"
                  placeholder="输入年份或名称筛选史事 B…"
                  value={filterRight}
                  onChange={(e) => setFilterRight(e.target.value)}
                />
              </div>
              <label>
                <span>史事 B</span>
                <select
                  aria-label="选择对比史事 B"
                  value={rightEvent.id}
                  onChange={(e) => {
                    const nextB = e.target.value;
                    const nextA = nextB === leftEvent.id ? rightEvent.id : leftEvent.id;
                    updateState({ pair: [nextA, nextB] });
                    setRevealed({});
                  }}
                >
                  {groupedRight.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.items.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.year} · {ev.title}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {hideKeys && !allRevealed && (
            <p className="cloze-tip">点击下方遮挡块逐项核对，检验自己是否真正分清。</p>
          )}

          <div className="compare-grid free-grid">
            {[leftEvent, rightEvent].map((ev, slot) => {
              const beats = stories[ev.id]?.beats || [];
              const isPrc = volumeIdForEvent(ev.id) === 'prc';
              const mastery = masteryMap[ev.id]?.level;
              return (
                <article key={`${slot}-${ev.id}`} className="compare-card free-card">
                  <div className="compare-card-head">
                    <span className="compare-cue">
                      {ev.year}年 · {KIND_LABELS[ev.kind]}
                    </span>
                    <span className="compare-badges">
                      <em className={`vol-badge ${isPrc ? 'is-prc' : ''}`}>{isPrc ? '下篇' : '上篇'}</em>
                      {mastery && (
                        <span className={`mastery-pill mastery-${mastery}`}>{MASTERY_LABELS[mastery]}</span>
                      )}
                      <span className="compare-location">{ev.location}</span>
                    </span>
                  </div>
                  <h4>{ev.title}</h4>
                  <p className="compare-headline">
                    <ClozeText
                      text={ev.headline}
                      masked={hideKeys}
                      revealed={revealed}
                      onToggle={toggleBlank}
                      prefix={`free-h-${slot}-${ev.id}`}
                    />
                  </p>
                  <p className="compare-diff">
                    <ClozeText
                      text={ev.summary}
                      masked={hideKeys}
                      revealed={revealed}
                      onToggle={toggleBlank}
                      prefix={`free-s-${slot}-${ev.id}`}
                    />
                  </p>
                  {beats.length > 0 && (
                    <ol className="compare-beats">
                      {beats.map((b) => (
                        <li key={b.at}>
                          <strong>{b.short}</strong>：{b.title}
                        </li>
                      ))}
                    </ol>
                  )}
                  <div className="compare-card-foot">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        onInspectMap(ev.id, {
                          panel: 'compare',
                          label: '返回易混对照',
                          compareState: { ...state, mode: 'free', setId: activeSet.id },
                        })
                      }
                    >
                      播放此幕
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
