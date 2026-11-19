import { useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Eye, EyeSlash, Scales, Swap } from '@phosphor-icons/react';
import { ClozeText } from './ClozeText.jsx';
import { EvolutionStage } from './EvolutionStage.jsx';
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
  fuzzy: '模糊',
  forgot: '待巩固',
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
}) {
  const eventById = useMemo(() => Object.fromEntries(events.map((e) => [e.id, e])), [events]);
  const [mode, setMode] = useState(initialMode);
  const [scope, setScope] = useState(initialScope);
  const [setId, setSetId] = useState(initialSetId);
  const [pair, setPair] = useState(initialPair);
  const [hideKeys, setHideKeys] = useState(false);
  const [revealed, setRevealed] = useState({});
  const chipRowRef = useRef(null);

  const visibleSets = useMemo(() => {
    if (scope === 'all') return CONFUSION_SETS;
    return CONFUSION_SETS.filter((s) => setScopeOf(s) === scope);
  }, [scope]);

  const activeSet = useMemo(() => {
    const found = visibleSets.find((s) => s.id === setId) || visibleSets[0] || CONFUSION_SETS[0];
    return resolveConfusionSet(found, eventById);
  }, [visibleSets, setId, eventById]);

  const groupedByChapter = useMemo(
    () =>
      chapters.map((ch, idx) => {
        const globalIdx = ch.globalIndex ?? idx;
        const prefix = ch.volume === 'prc' ? '下篇 · ' : '上篇 · ';
        return {
          label: `${prefix}${ch.range} ${ch.title}`,
          items: events.filter((e) => {
            const eventGlobal = (e.volume === 'prc' ? 5 : 0) + e.chapter;
            return eventGlobal === globalIdx;
          }),
        };
      }),
    [chapters, events],
  );

  const toggleBlank = (key) => {
    setRevealed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleMaskMode = () => {
    setHideKeys((prev) => !prev);
    setRevealed({});
  };

  const swapPair = () => {
    setPair(([a, b]) => [b, a]);
    setRevealed({});
  };

  const selectSet = (nextId, el) => {
    setSetId(nextId);
    setRevealed({});
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const leftEvent = eventById[pair[0]] || events[0];
  const rightEvent = eventById[pair[1]] || events[1] || events[0];
  const modeIds = ['preset', 'free'];
  const visibleSetIds = visibleSets.map((s) => s.id);

  return (
    <div className="study-panel compare-panel">
      <div className="study-header">
        <p className="study-kicker">
          <Scales size={15} />
          高频易混同屏对照（上下篇贯通）
        </p>
        <h2 id="dialog-title">把容易张冠李戴的考点，放一起看清差别</h2>
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
                setMode(next);
                setRevealed({});
              })
            }
            onClick={() => {
              setMode('preset');
              setRevealed({});
            }}
          >
            预置高频易混（{CONFUSION_SETS.length}组）
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
                setMode(next);
                setRevealed({});
              })
            }
            onClick={() => {
              setMode('free');
              setRevealed({});
            }}
          >
            自由双节点对比
          </button>
        </div>

        <div className="mask-controls">
          <button
            type="button"
            className={`pill-toggle ${hideKeys ? 'is-active' : ''}`}
            aria-pressed={hideKeys}
            onClick={toggleMaskMode}
          >
            {hideKeys ? <Eye size={15} /> : <EyeSlash size={15} />}
            <span>{hideKeys ? '显示全部差异词' : '隐藏差异词自测'}</span>
          </button>
        </div>
      </div>

      {mode === 'preset' ? (
        <div role="tabpanel" aria-labelledby="compare-tab-preset">
          <div className="scope-filter-row" role="group" aria-label="按卷别筛选易混专题">
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
                    setScope(opt.id);
                    const nextList =
                      opt.id === 'all'
                        ? CONFUSION_SETS
                        : CONFUSION_SETS.filter((s) => setScopeOf(s) === opt.id);
                    if (nextList.length && !nextList.some((s) => s.id === setId)) {
                      setSetId(nextList[0].id);
                    }
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
                  onClick={(e) => selectSet(set.id, e.currentTarget)}
                >
                  {set.title}
                </button>
              );
            })}
          </div>

          <div className="set-intro" role="tabpanel" aria-labelledby={`compare-set-${activeSet.id}`}>
            <h3>{activeSet.title}</h3>
            <p>{activeSet.subtitle}</p>
            {hideKeys && <p className="cloze-tip">点击下方阴影词块逐项核对，检验自己是否真正分清。</p>}
          </div>

          <EvolutionStage setId={activeSet.id} onInspectMap={onInspectMap} />

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
                          compareState: { mode: 'preset', scope, setId: activeSet.id, pair },
                        })
                      }
                    >
                      去地图看动画 <ArrowUpRight size={14} />
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
            <label>
              <span>节点 A</span>
              <select
                aria-label="选择对比节点 A"
                value={leftEvent.id}
                onChange={(e) => {
                  setPair([e.target.value, rightEvent.id]);
                  setRevealed({});
                }}
              >
                {groupedByChapter.map((group) => (
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
            <button type="button" className="icon-button swap-button" aria-label="互换左右节点" onClick={swapPair}>
              <Swap size={18} />
            </button>
            <label>
              <span>节点 B</span>
              <select
                aria-label="选择对比节点 B"
                value={rightEvent.id}
                onChange={(e) => {
                  setPair([leftEvent.id, e.target.value]);
                  setRevealed({});
                }}
              >
                {groupedByChapter.map((group) => (
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

          <div className="compare-grid free-grid">
            {[leftEvent, rightEvent].map((ev, slot) => {
              const beats = stories[ev.id]?.beats || [];
              const isPrc = volumeIdForEvent(ev.id) === 'prc';
              return (
                <article key={`${slot}-${ev.id}`} className="compare-card free-card">
                  <div className="compare-card-head">
                    <span className="compare-cue">
                      {ev.year}年 · {KIND_LABELS[ev.kind]}
                    </span>
                    <span className="compare-badges">
                      <em className={`vol-badge ${isPrc ? 'is-prc' : ''}`}>{isPrc ? '下篇' : '上篇'}</em>
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
                          compareState: { mode: 'free', scope, setId: activeSet.id, pair },
                        })
                      }
                    >
                      去地图看动画 <ArrowUpRight size={14} />
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
