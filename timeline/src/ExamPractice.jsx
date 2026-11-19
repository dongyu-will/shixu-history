import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ClockCounterClockwise,
  DownloadSimple,
  Exam,
  Eye,
  EyeSlash,
  Trash,
  UploadSimple,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import {
  REVIEW_DAYS,
  dueQuestionIds,
  firstAttemptFor,
  latestAttemptFor,
  nextDueTimestamp,
} from './study-store.js';
import { volumeIdForEvent } from './volumes.js';

function formatDueRelative(timestamp, now = Date.now()) {
  if (!timestamp) return '';
  const diffHours = Math.round((timestamp - now) / (60 * 60 * 1000));
  if (diffHours <= 1) return '约 1 小时内';
  if (diffHours < 24) return `约 ${diffHours} 小时后`;
  const days = Math.ceil(diffHours / 24);
  return `${days} 天后`;
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

export function ExamPractice({
  questions,
  analysisQuestions = [],
  loading,
  error,
  chapters,
  events,
  studyState,
  onRecordAttempt,
  onInspectMap,
  onExportBackup,
  onImportBackup,
  onResetStudy,
  initialView = null,
  initialVolume = 'all',
  initialChapter = 'all',
  initialQuestionId = null,
  initialAnalysisId = null,
  submittedByQuestion: controlledSubmitted = null,
  onSubmittedChange = null,
}) {
  const eventById = useMemo(() => Object.fromEntries(events.map((e) => [e.id, e])), [events]);
  const dueIds = useMemo(() => dueQuestionIds(studyState, questions), [studyState, questions]);
  const [view, setView] = useState(() => initialView || (dueIds.length > 0 ? 'due' : 'chapters'));
  const [volFilter, setVolFilter] = useState(initialVolume);
  const [chapter, setChapter] = useState(initialChapter);
  const [activeId, setActiveId] = useState(initialQuestionId);
  const [analysisId, setAnalysisId] = useState(
    () => initialAnalysisId || analysisQuestions[analysisQuestions.length - 1]?.id || null,
  );
  const [skeletonMasked, setSkeletonMasked] = useState(true);
  const [skeletonRevealed, setSkeletonRevealed] = useState({});
  const [selected, setSelected] = useState([]);
  const [localSubmitted, setLocalSubmitted] = useState({});
  const submittedByQuestion = controlledSubmitted ?? localSubmitted;
  const setSubmittedByQuestion = onSubmittedChange ?? setLocalSubmitted;
  const [assistedIds, setAssistedIds] = useState({});
  const [backupMessage, setBackupMessage] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef(null);

  const visibleChapters = useMemo(() => {
    return chapters
      .map((ch, idx) => ({ ...ch, globalIndex: ch.globalIndex ?? idx }))
      .filter((ch) => volFilter === 'all' || (ch.volume || (ch.globalIndex >= 5 ? 'prc' : 'modern')) === volFilter);
  }, [chapters, volFilter]);

  const scopedQuestions = useMemo(() => {
    if (volFilter === 'all') return questions;
    return questions.filter((q) => (q.volume || (q.chapter >= 5 ? 'prc' : 'modern')) === volFilter);
  }, [questions, volFilter]);

  const visibleQuestions = useMemo(() => {
    if (view === 'due') {
      const dueSet = new Set(dueIds);
      return questions.filter((q) => dueSet.has(q.id));
    }
    if (chapter === 'all') return scopedQuestions;
    return scopedQuestions.filter((q) => q.chapter === Number(chapter));
  }, [view, chapter, dueIds, questions, scopedQuestions]);

  const currentIndex = useMemo(() => {
    if (!visibleQuestions.length) return -1;
    const idx = visibleQuestions.findIndex((q) => q.id === activeId);
    return idx >= 0 ? idx : 0;
  }, [visibleQuestions, activeId]);

  const question = currentIndex >= 0 ? visibleQuestions[currentIndex] : null;
  const submitted = question ? submittedByQuestion[question.id] || null : null;
  const firstAttempt = question ? firstAttemptFor(studyState, question.id) : null;
  const schedule = question ? studyState.schedules[question.id] : null;

  const activeAnalysis = useMemo(() => {
    if (!analysisQuestions.length) return null;
    return analysisQuestions.find((a) => a.id === analysisId) || analysisQuestions[analysisQuestions.length - 1];
  }, [analysisQuestions, analysisId]);

  const stats = useMemo(() => {
    const practiced = new Set();
    let firstCorrect = 0;
    for (const q of questions) {
      const first = firstAttemptFor(studyState, q.id);
      if (first) {
        practiced.add(q.id);
        if (first.correct) firstCorrect += 1;
      }
    }
    return {
      practiced: practiced.size,
      total: questions.length,
      modernCount: questions.filter((q) => (q.volume || (q.chapter >= 5 ? 'prc' : 'modern')) === 'modern').length,
      prcCount: questions.filter((q) => (q.volume || (q.chapter >= 5 ? 'prc' : 'modern')) === 'prc').length,
      firstRate: practiced.size ? Math.round((firstCorrect / practiced.size) * 100) : null,
    };
  }, [studyState, questions]);

  const selectQuestion = (id) => {
    setActiveId(id);
    setSelected([]);
  };

  const toggleOption = (letter) => {
    if (!question || submitted) return;
    if (question.type === 'single') {
      setSelected([letter]);
    } else {
      setSelected((prev) =>
        prev.includes(letter) ? prev.filter((item) => item !== letter) : [...prev, letter].sort(),
      );
    }
  };

  const handleSubmit = () => {
    if (!question || !selected.length) return;
    const answer = [...selected].sort().join('');
    const kind = view === 'due' ? 'review' : 'practice';
    const assisted = Boolean(assistedIds[question.id]);
    const recorded = onRecordAttempt(question, answer, { kind, assisted });
    setSubmittedByQuestion((prev) => ({
      ...prev,
      [question.id]: {
        answer,
        correct: answer === question.answer,
        recorded,
      },
    }));
  };

  const handleRetry = () => {
    if (!question) return;
    setSubmittedByQuestion((prev) => {
      const next = { ...prev };
      delete next[question.id];
      return next;
    });
    setSelected([]);
  };

  const jumpToMap = (targetEventId, customLabel = '返回真题复测') => {
    if (view !== 'analysis' && question && !submitted) {
      setAssistedIds((prev) => ({ ...prev, [question.id]: true }));
    }
    onInspectMap(targetEventId, {
      panel: 'exam',
      label: customLabel,
      examState: {
        view,
        volume: volFilter,
        chapter,
        questionId: question?.id || null,
        analysisId: activeAnalysis?.id || null,
      },
    });
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const summary = onImportBackup(text);
      setBackupMessage(
        `已恢复备份：新增 ${summary.addedAttempts} 条作答，更新 ${summary.updatedMastery} 条掌握度。`,
      );
    } catch (err) {
      setBackupMessage(err.message || '导入失败，请确认选择的是史序 JSON 备份文件。');
    }
  };

  const nextDue = useMemo(() => nextDueTimestamp(studyState, questions), [studyState, questions]);
  const primaryViews = analysisQuestions.length ? ['due', 'chapters', 'analysis'] : ['due', 'chapters'];
  const chapterIds = ['all', ...visibleChapters.map((c) => String(c.globalIndex))];
  const analysisOrdered = useMemo(() => [...analysisQuestions].reverse(), [analysisQuestions]);
  const analysisIds = analysisOrdered.map((a) => a.id);

  return (
    <div className="study-panel exam-panel">
      <div className="study-header">
        <p className="study-kicker">
          <Exam size={15} />
          2017—2026 考研政治史纲真题复测（全卷贯通）
        </p>
        <h2 id="dialog-title">先作答提取，答错直接跨卷回地图看那一幕</h2>
        <div className="study-summary-row">
          <span>
            已练 <strong>{stats.practiced}</strong> / {stats.total} 题
          </span>
          {stats.firstRate !== null && (
            <span>
              首次正确率 <strong>{stats.firstRate}%</strong>
            </span>
          )}
          <span>
            今日待巩固 <strong>{dueIds.length}</strong> 题
          </span>
        </div>
      </div>

      <div className="detail-tabs study-tabs" role="tablist" aria-label="真题视图">
        <button
          id="exam-tab-due"
          type="button"
          role="tab"
          aria-selected={view === 'due'}
          tabIndex={view === 'due' ? 0 : -1}
          className={view === 'due' ? 'active' : ''}
          onKeyDown={(e) =>
            handleTablistKeyDown(e, primaryViews, view, (next) => {
              setView(next);
              setSelected([]);
            })
          }
          onClick={() => {
            setView('due');
            setSelected([]);
          }}
        >
          今日待巩固（{dueIds.length}）
        </button>
        <button
          id="exam-tab-chapters"
          type="button"
          role="tab"
          aria-selected={view === 'chapters'}
          tabIndex={view === 'chapters' ? 0 : -1}
          className={view === 'chapters' ? 'active' : ''}
          onKeyDown={(e) =>
            handleTablistKeyDown(e, primaryViews, view, (next) => {
              setView(next);
              setSelected([]);
            })
          }
          onClick={() => {
            setView('chapters');
            setSelected([]);
          }}
        >
          选择题库（{questions.length}）
        </button>
        {analysisQuestions.length > 0 && (
          <button
            id="exam-tab-analysis"
            type="button"
            role="tab"
            aria-selected={view === 'analysis'}
            tabIndex={view === 'analysis' ? 0 : -1}
            className={view === 'analysis' ? 'active' : ''}
            onKeyDown={(e) =>
              handleTablistKeyDown(e, primaryViews, view, (next) => {
                setView(next);
                setSelected([]);
              })
            }
            onClick={() => {
              setView('analysis');
              setSelected([]);
            }}
          >
            第36题骨架（{analysisQuestions.length}）
          </button>
        )}
      </div>

      {loading && <p className="study-empty">正在载入真题库…</p>}
      {error && <p className="study-empty">{error}</p>}

      {!loading && !error && view === 'analysis' && activeAnalysis && (
        <div className="analysis-panel" role="tabpanel" aria-labelledby="exam-tab-analysis">
          <div className="set-chips set-chips-scroll" role="tablist" aria-label="选择第36题年份">
            {analysisOrdered.map((item) => {
              const isSelected = item.id === activeAnalysis.id;
              return (
                <button
                  key={item.id}
                  id={`analysis-tab-${item.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  className={isSelected ? 'active' : ''}
                  onKeyDown={(e) =>
                    handleTablistKeyDown(e, analysisIds, activeAnalysis.id, (next) => {
                      setAnalysisId(next);
                      setSkeletonRevealed({});
                    })
                  }
                  onClick={(e) => {
                    setAnalysisId(item.id);
                    setSkeletonRevealed({});
                    e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                  }}
                >
                  {item.year}年 · {item.title.slice(0, 8)}
                </button>
              );
            })}
          </div>

          <article className="question-card analysis-card" role="tabpanel" aria-labelledby={`analysis-tab-${activeAnalysis.id}`}>
            <div className="question-nav">
              <span className="question-meta">
                <strong>{activeAnalysis.year}年 · 第36题分析题</strong>
                <span className="scope-tag">跨篇史论骨架 · 自测不打分</span>
              </span>
              <button
                type="button"
                className={`pill-toggle ${skeletonMasked ? 'is-active' : ''}`}
                aria-pressed={skeletonMasked}
                onClick={() => {
                  setSkeletonMasked((v) => !v);
                  setSkeletonRevealed({});
                }}
              >
                {skeletonMasked ? <Eye size={15} /> : <EyeSlash size={15} />}
                <span>{skeletonMasked ? '展开全部骨架要点' : '隐藏骨架要点自测'}</span>
              </button>
            </div>

            <h3 className="analysis-title">{activeAnalysis.title}</h3>
            <ol className="analysis-prompts">
              {activeAnalysis.prompts.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ol>

            <section className="analysis-section">
              <h4>一、跨篇因果链（点击任一节点直接看地图动画）</h4>
              <ol className="analysis-chain">
                {activeAnalysis.chain.map((node, i) => {
                  const targetEvent = eventById[node.eventId];
                  const isPrc = volumeIdForEvent(node.eventId) === 'prc';
                  return (
                    <li key={`${node.eventId}-${i}`} className="analysis-chain-item">
                      <div className="analysis-chain-head">
                        <span className="analysis-step-badge">{node.step}</span>
                        <em className={`vol-badge ${isPrc ? 'is-prc' : ''}`}>{isPrc ? '下篇' : '上篇'}</em>
                        <strong>{node.label}</strong>
                        {targetEvent && (
                          <button
                            type="button"
                            className="text-button replay-link"
                            onClick={() => jumpToMap(node.eventId, '返回第36题骨架')}
                          >
                            看「{targetEvent.title}」 <ArrowUpRight size={14} />
                          </button>
                        )}
                      </div>
                      <p>{node.summary}</p>
                    </li>
                  );
                })}
              </ol>
            </section>

            <section className="analysis-section">
              <h4>二、论证答题骨架（先口头复述，再点击展开核对）</h4>
              <div className="analysis-skeleton-grid">
                {activeAnalysis.skeleton.map((block, idx) => {
                  const key = `${activeAnalysis.id}-${idx}`;
                  const isOpen = !skeletonMasked || Boolean(skeletonRevealed[key]);
                  return (
                    <div key={key} className={`skeleton-block ${isOpen ? 'is-open' : 'is-masked'}`}>
                      <button
                        type="button"
                        className="skeleton-toggle"
                        aria-expanded={isOpen}
                        onClick={() =>
                          setSkeletonRevealed((prev) => ({ ...prev, [key]: !prev[key] }))
                        }
                      >
                        <strong>{block.heading}</strong>
                        <span>{isOpen ? '已展开' : '点击核对要点'}</span>
                      </button>
                      {isOpen ? (
                        <ul>
                          {block.points.map((pt, j) => (
                            <li key={j}>{pt}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="skeleton-placeholder">先试着自己说出该层论证的 {block.points.length} 个核心要点…</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {activeAnalysis.caution && (
              <p className="scope-note analysis-caution">
                <WarningCircle size={15} />
                <span>{activeAnalysis.caution}</span>
              </p>
            )}
          </article>
        </div>
      )}

      {!loading && !error && view !== 'analysis' && (
        <div role="tabpanel" aria-labelledby={view === 'due' ? 'exam-tab-due' : 'exam-tab-chapters'}>
          {view === 'chapters' && (
            <>
              <div className="scope-filter-row" role="group" aria-label="按历史分卷筛选真题">
                {[
                  { id: 'all', label: `全卷（${questions.length}）` },
                  { id: 'modern', label: `上篇 · 1840—1949（${stats.modernCount}）` },
                  { id: 'prc', label: `下篇 · 1949—新时代（${stats.prcCount}）` },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`scope-pill ${volFilter === opt.id ? 'is-active' : ''}`}
                    aria-pressed={volFilter === opt.id}
                    onClick={() => {
                      setVolFilter(opt.id);
                      setChapter('all');
                      setActiveId(null);
                      setSelected([]);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="set-chips set-chips-scroll" role="tablist" aria-label="按历史时期筛选真题">
                <button
                  type="button"
                  role="tab"
                  aria-selected={chapter === 'all'}
                  tabIndex={chapter === 'all' ? 0 : -1}
                  className={chapter === 'all' ? 'active' : ''}
                  onKeyDown={(e) =>
                    handleTablistKeyDown(e, chapterIds, String(chapter), (next) => {
                      setChapter(next);
                      setActiveId(null);
                      setSelected([]);
                    })
                  }
                  onClick={(e) => {
                    setChapter('all');
                    setActiveId(null);
                    setSelected([]);
                    e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                  }}
                >
                  全部（{scopedQuestions.length}）
                </button>
                {visibleChapters.map((ch) => {
                  const gIdx = ch.globalIndex;
                  const count = scopedQuestions.filter((q) => q.chapter === gIdx).length;
                  const isSelected = String(chapter) === String(gIdx);
                  return (
                    <button
                      key={`${ch.volume || 'modern'}-${ch.title}`}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      tabIndex={isSelected ? 0 : -1}
                      className={isSelected ? 'active' : ''}
                      onKeyDown={(e) =>
                        handleTablistKeyDown(e, chapterIds, String(chapter), (next) => {
                          setChapter(next);
                          setActiveId(null);
                          setSelected([]);
                        })
                      }
                      onClick={(e) => {
                        setChapter(String(gIdx));
                        setActiveId(null);
                        setSelected([]);
                        e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                      }}
                    >
                      {ch.title}（{count}）
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {!question && (
            <div className="study-empty">
              <ClockCounterClockwise size={28} weight="light" />
              <h3>{view === 'due' ? '当前没有到期的复测题目' : '当前筛选下没有题目'}</h3>
              <p>
                {nextDue
                  ? `下次到期复测在 ${formatDueRelative(nextDue)}。间隔 1 / 3 / 7 天无提示答对，更能检验长期保持。`
                  : '完成首次作答后，系统会自动按 1 / 3 / 7 天安排隔日复测。'}
              </p>
              {view === 'due' && (
                <button
                  type="button"
                  className="reveal-button"
                  onClick={() => {
                    setView('chapters');
                    setSelected([]);
                  }}
                >
                  进入 9 章全卷题库 <ArrowRight size={16} />
                </button>
              )}
            </div>
          )}

          {question && (
            <article className="question-card">
              <div className="question-nav">
                <span className="question-meta">
                  <strong>
                    {question.year}年 · 第{question.number}题
                  </strong>
                  <em className={`vol-badge ${question.volume === 'prc' ? 'is-prc' : ''}`}>
                    {question.volume === 'prc' ? '下篇' : '上篇'}
                  </em>
                  <span>{question.type === 'single' ? '单选题' : '多选题'}</span>
                  <span>{question.topic}</span>
                  {question.crossSubject && <em className="scope-tag">跨科延伸</em>}
                  {question.coverage === 'partial' && <em className="scope-tag">含拓展要点</em>}
                </span>
                <div className="question-pager">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="上一题"
                    disabled={currentIndex <= 0}
                    onClick={() => selectQuestion(visibleQuestions[currentIndex - 1].id)}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <span>
                    {currentIndex + 1} / {visibleQuestions.length}
                  </span>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="下一题"
                    disabled={currentIndex >= visibleQuestions.length - 1}
                    onClick={() => selectQuestion(visibleQuestions[currentIndex + 1].id)}
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              <div className="question-dots" aria-label="题号速跳">
                {visibleQuestions.map((item, idx) => {
                  const latest = latestAttemptFor(studyState, item.id);
                  const stateClass = latest ? (latest.correct ? 'is-pass' : 'is-miss') : '';
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`question-dot ${item.id === question.id ? 'is-current' : ''} ${stateClass}`}
                      aria-current={item.id === question.id ? 'step' : undefined}
                      aria-label={`第 ${idx + 1} 题：${item.year}年第${item.number}题 ${item.topic}`}
                      onClick={() => selectQuestion(item.id)}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <p className="question-stem">{question.stem}</p>

              <fieldset className="question-options">
                <legend className="sr-only">
                  {question.type === 'single' ? '选择唯一正确选项' : '选择所有正确选项'}
                </legend>
                {question.options.map(([letter, text]) => {
                  const checked = submitted ? submitted.answer.includes(letter) : selected.includes(letter);
                  const isRight = question.answer.includes(letter);
                  let optionState = '';
                  if (submitted) {
                    if (isRight) optionState = 'is-correct';
                    else if (checked) optionState = 'is-wrong';
                  }
                  return (
                    <label key={letter} className={`question-option ${checked ? 'is-picked' : ''} ${optionState}`}>
                      <input
                        type={question.type === 'single' ? 'radio' : 'checkbox'}
                        name={`q-${question.id}`}
                        value={letter}
                        checked={checked}
                        disabled={Boolean(submitted)}
                        onChange={() => toggleOption(letter)}
                      />
                      <span className="option-badge">{letter}</span>
                      <span className="option-text">{text}</span>
                    </label>
                  );
                })}
              </fieldset>

              {!submitted ? (
                <div className="question-actions">
                  <button
                    type="button"
                    className="reveal-button"
                    disabled={selected.length === 0}
                    onClick={handleSubmit}
                  >
                    提交答案 <Check size={16} />
                  </button>
                  <span className="question-hint">
                    {question.type === 'multiple' ? '多选题需全部选对才计正确' : '请先独立回忆再提交'}
                  </span>
                </div>
              ) : (
                <div className="question-feedback" role="status">
                  <div className={`verdict-banner ${submitted.correct ? 'is-correct' : 'is-wrong'}`}>
                    <strong>
                      {submitted.correct ? (
                        <>
                          <Check size={16} /> 回答正确
                        </>
                      ) : (
                        <>
                          <X size={16} /> 选了 {submitted.answer}，参考答案：{question.answer}
                        </>
                      )}
                    </strong>
                    <span>
                      {firstAttempt ? `首次：${firstAttempt.correct ? '对' : '错'}` : ''}
                      {schedule ? ` · 复测间隔 ${REVIEW_DAYS[schedule.step]} 天` : ''}
                    </span>
                  </div>

                  <p className="question-explanation">{question.explanation}</p>
                  {question.scopeNote && <p className="scope-note">{question.scopeNote}</p>}

                  <ul className="option-notes">
                    {question.options.map(([letter]) => {
                      const targetId = question.optionReplay?.[letter];
                      const targetEvent = targetId ? eventById[targetId] : null;
                      const isAnswer = question.answer.includes(letter);
                      const isTargetPrc = targetEvent ? volumeIdForEvent(targetEvent.id) === 'prc' : false;
                      return (
                        <li key={letter} className={isAnswer ? 'is-answer' : ''}>
                          <div>
                            <strong>{letter} 项：</strong>
                            <span>{question.notes?.[letter]}</span>
                          </div>
                          {targetEvent && (
                            <button
                              type="button"
                              className="text-button replay-link"
                              onClick={() => jumpToMap(targetEvent.id)}
                            >
                              {isTargetPrc ? '[下篇] ' : '[上篇] '}看「{targetEvent.title}」
                              <ArrowUpRight size={14} />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  <div className="question-footer-actions">
                    {eventById[question.replay] && (
                      <button
                        type="button"
                        className="jump-button inline-jump"
                        onClick={() => jumpToMap(question.replay)}
                      >
                        去地图看本题「{eventById[question.replay].title}」
                        <ArrowUpRight size={16} />
                      </button>
                    )}
                    <div className="question-next-row">
                      <button type="button" className="text-button" onClick={handleRetry}>
                        重做此题
                      </button>
                      {currentIndex < visibleQuestions.length - 1 && (
                        <button
                          type="button"
                          className="reveal-button"
                          onClick={() => selectQuestion(visibleQuestions[currentIndex + 1].id)}
                        >
                          下一题 <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </article>
          )}
        </div>
      )}

      <details className="study-backup">
        <summary>学习记录管理（本地存储 · 支持换设备导入导出）</summary>
        <div className="backup-body">
          <p>
            当前保存在本机浏览器：共 {studyState.attempts.length} 次真题作答、
            {Object.keys(studyState.mastery).length} 条节点掌握度标记。
          </p>
          <div className="backup-actions">
            <button
              type="button"
              onClick={() => {
                onExportBackup();
                setBackupMessage('已导出 JSON 备份文件，可在其他设备导入恢复。');
              }}
            >
              <DownloadSimple size={15} />
              导出 JSON 备份
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              <UploadSimple size={15} />
              导入备份合并
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={handleFileChange}
            />
            {!confirmReset ? (
              <button
                type="button"
                className="danger-button"
                onClick={() => setConfirmReset(true)}
              >
                <Trash size={15} />
                清空本地记录
              </button>
            ) : (
              <span className="reset-confirm">
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => {
                    onResetStudy();
                    setSubmittedByQuestion({});
                    setSelected([]);
                    setConfirmReset(false);
                    setBackupMessage('已清空本地学习记录。');
                  }}
                >
                  确认清空
                </button>
                <button type="button" onClick={() => setConfirmReset(false)}>
                  取消
                </button>
              </span>
            )}
          </div>
          {backupMessage && (
            <p className="backup-status" role="status">
              {backupMessage}
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
