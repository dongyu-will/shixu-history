import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowCounterClockwise,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ClosedCaptioning,
  Compass,
  Moon,
  Pause,
  Play,
  SpeakerHigh,
  SpeakerSlash,
  Sun,
  Waveform,
  X,
} from '@phosphor-icons/react';
import { MapScene } from './MapScene.jsx';
import {
  cueForBeat,
  playCue,
  playGate,
  readSfxPreference,
  setSfxEnabled,
  writeSfxPreference,
} from './foley.js';
import {
  ANSWERS,
  CHAPTERS,
  DECISIONS,
  DECISION_AT,
  NARRATION,
  PROBLEMS,
  QUIZ_BANK,
  boundedTime,
  lessonEvents,
  lessonFrame,
  scoreReconstruction,
} from './lesson.js';
import { sitePath } from './site-path.js';
import { AUTHORED_STORIES, playbackTime } from './stories.js';
import { useTheme } from './theme.js';
import './lesson.css';

const stamp = (t) =>
  `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

const VALID_RATES = new Set([0.5, 1, 1.5, 2]);

function readPrefRate() {
  try {
    const parsed = Number(localStorage.getItem('shixu-rate'));
    return VALID_RATES.has(parsed) ? parsed : 1;
  } catch {
    return 1;
  }
}

function readPrefBool(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    if (val === null) return fallback;
    return val !== '0' && val !== 'false';
  } catch {
    return fallback;
  }
}

function writePref(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore restricted storage contexts.
  }
}

export function CausalLesson({ data, geography }) {
  const events = useMemo(() => lessonEvents(data.events), [data.events]);
  const returnHref = useMemo(() => {
    if (typeof window === 'undefined') return './?event=e-29';
    const params = new URLSearchParams(window.location.search);
    const vol = params.get('fromVol');
    const ev = params.get('fromEvent') || 'e-29';
    return vol
      ? `./?vol=${encodeURIComponent(vol)}&event=${encodeURIComponent(ev)}`
      : `./?event=${encodeURIComponent(ev)}`;
  }, []);
  const clock = useRef({ time: 0 });
  const controller = useRef(null);
  const camera = useRef(null);
  const audio = useRef(null);
  const range = useRef(null);
  const elapsed = useRef(null);
  const dialog = useRef(null);
  const dialogBackdropPress = useRef(false);

  const [frame, setFrame] = useState(() => lessonFrame(events, 0));
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(readPrefRate);
  const [voice, setVoice] = useState(() => readPrefBool('shixu-voice', true));
  const [captions, setCaptions] = useState(() => readPrefBool('shixu-captions', true));
  const [sfx, setSfx] = useState(() => readSfxPreference());
  const [theme, toggleTheme] = useTheme();
  const [decision, setDecision] = useState(null);
  const [choice, setChoice] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [gate, setGate] = useState(false);
  const [practice, setPractice] = useState(false);
  const [order, setOrder] = useState([]);
  const [matches, setMatches] = useState({});
  const [result, setResult] = useState(null);
  const [firstResult, setFirstResult] = useState(null);
  const [review, setReview] = useState(null);
  const [reading, setReading] = useState(false);
  const [assisted, setAssisted] = useState(false);
  const [audioError, setAudioError] = useState(false);

  const resolved = useRef(false);
  const replayEnd = useRef(null);
  const frameKey = useRef('0:0:0');
  const lastFoleyKeyRef = useRef(`${events[0].id}:0`);
  const lastFoleyAtRef = useRef(0);
  const manualSeekUntilRef = useRef(0);
  const prevGateRef = useRef(false);

  const scene = events[frame.index];
  const chapter = CHAPTERS[frame.index];
  const story = AUTHORED_STORIES[scene.id];
  const beat = story.beats[frame.phase];

  const paint = useCallback(() => {
    const t = clock.current.time;
    const next = lessonFrame(events, t);
    const key = `${next.index}:${next.phase}:${next.cue}`;
    const active = events[next.index];
    const advancing =
      playing &&
      (!voice ||
        audioError ||
        (audio.current &&
          !audio.current.paused &&
          !audio.current.seeking &&
          audio.current.readyState >= 3));

    if (controller.current?.id === active.id) {
      controller.current.seek(next.native, {
        playing: advancing,
        rate: (rate * AUTHORED_STORIES[active.id].duration) / active.duration,
      });
    }

    const label = `${stamp(t)}，${events[next.index].title}`;
    if (range.current) {
      const value = t.toFixed(2);
      if (Number(range.current.value) !== Number(value)) range.current.value = value;
      if (range.current.getAttribute('aria-valuetext') !== label) {
        range.current.setAttribute('aria-valuetext', label);
      }
    }
    if (elapsed.current && elapsed.current.textContent !== stamp(t)) {
      elapsed.current.textContent = stamp(t);
    }
    if (frameKey.current !== key) {
      frameKey.current = key;
      setFrame(next);
    }
  }, [events, playing, voice, audioError, rate]);

  const seek = useCallback(
    (requested, pause = true) => {
      const t = boundedTime(requested, resolved.current);
      clock.current.time = t;
      if (audio.current && Number.isFinite(audio.current.duration)) {
        audio.current.currentTime = t;
      }
      paint();
      if (pause) setPlaying(false);
      if (!resolved.current && t >= DECISION_AT) {
        setPlaying(false);
        setGate(true);
      }
      if (t >= 90) {
        setPlaying(false);
        setPractice(true);
      }
    },
    [paint],
  );

  const navigate = useCallback(
    (time, pause = true) => {
      replayEnd.current = null;
      setReview(null);
      seek(time, pause);
    },
    [seek],
  );

  useEffect(() => {
    paint();
  }, [frame.index, paint]);

  useEffect(() => {
    if (gate || practice) {
      document.getElementById(gate ? 'decision-title' : 'reconstruction-title')?.focus();
    }
  }, [gate, practice]);

  useEffect(() => {
    setSfxEnabled(sfx);
  }, [sfx]);

  useEffect(() => {
    const opened = gate && !prevGateRef.current;
    prevGateRef.current = gate;
    if (opened && sfx) {
      playGate({ enabled: sfx });
    }
  }, [gate, sfx]);

  useEffect(() => {
    const key = `${scene.id}:${frame.phase}`;
    if (!playing) {
      lastFoleyKeyRef.current = key;
      return;
    }
    if (key === lastFoleyKeyRef.current) return;
    lastFoleyKeyRef.current = key;
    const now = performance.now();
    if (!sfx || now < manualSeekUntilRef.current || now - lastFoleyAtRef.current < 220) return;
    lastFoleyAtRef.current = now;
    playCue(cueForBeat(story, frame.phase), { enabled: sfx });
  }, [playing, scene.id, frame.phase, story, sfx]);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    a.playbackRate = rate;
    a.preservesPitch = true;
    if (playing && voice) {
      a.currentTime = clock.current.time;
      a.play().catch((error) => {
        if (error.name !== 'AbortError') {
          setVoice(false);
          setAudioError(true);
        }
      });
    } else {
      a.pause();
    }
    return () => a.pause();
  }, [playing, voice, rate]);

  useEffect(() => {
    if (!playing) return;
    let last;
    let raf;
    const tick = (now) => {
      if (last !== undefined) {
        const a = audio.current;
        const audioMaster = voice && !audioError && a;
        // Hold the clock while the media element is seeking or not ready,
        // preventing stale timestamps from snapping replay/seeks back.
        const proposed = audioMaster
          ? a.readyState >= 2 && !a.seeking
            ? a.currentTime
            : clock.current.time
          : clock.current.time + Math.min(0.25, (now - last) / 1000) * rate;
        const end = replayEnd.current;
        clock.current.time = boundedTime(
          end === null ? proposed : Math.min(end, proposed),
          resolved.current,
        );
        paint();
        if (!resolved.current && clock.current.time >= DECISION_AT) {
          setGate(true);
          setPlaying(false);
          return;
        }
        if ((end !== null && clock.current.time >= end) || clock.current.time >= 90) {
          setPlaying(false);
          setPractice(true);
          setReview(null);
          replayEnd.current = null;
          return;
        }
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, rate, voice, audioError, paint]);

  useEffect(() => {
    const hide = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);

  const toggle = useCallback(() => {
    if (reading || practice || gate) return;
    if (clock.current.time >= 90) {
      seek(0);
      setPractice(false);
    }
    setPlaying((p) => !p);
  }, [reading, practice, gate, seek]);

  useEffect(() => {
    const key = (e) => {
      if (e.target.closest('button,input,select,a,dialog') || practice || gate || reading) return;
      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigate(clock.current.time + 5, false);
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigate(clock.current.time - 5, false);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [toggle, navigate, practice, gate, reading]);

  useEffect(() => {
    if (reading && !dialog.current.open) dialog.current.showModal();
    if (!reading && dialog.current.open) dialog.current.close();
  }, [reading]);

  const toggleVoice = () => {
    setVoice((v) => {
      const next = !v;
      writePref('shixu-voice', next ? '1' : '0');
      if (next) {
        setAudioError(false);
        if (audio.current?.error) audio.current.load();
      }
      return next;
    });
  };

  const toggleCaptions = () => {
    setCaptions((v) => {
      const next = !v;
      writePref('shixu-captions', next ? '1' : '0');
      return next;
    });
  };

  const updateRate = (nextRate) => {
    setRate(nextRate);
    writePref('shixu-rate', String(nextRate));
  };

  const toggleSfx = useCallback(() => {
    setSfx((prev) => {
      const next = writeSfxPreference(!prev);
      setSfxEnabled(next);
      return next;
    });
  }, []);

  const openReading = () => {
    setPlaying(false);
    setReading(true);
    if (practice || gate) setAssisted(true);
  };
  const answer = () => {
    setFeedback(choice);
    setDecision((previous) => previous ?? choice);
    if (sfx) playGate({ enabled: sfx });
  };
  const continueStory = () => {
    resolved.current = true;
    setGate(false);
    setFeedback(null);
    seek(DECISION_AT, false);
    setPlaying(true);
  };
  const skip = () => {
    setDecision('skipped');
    setFeedback('skipped');
  };
  const replay = (i) => {
    setAssisted(true);
    setPractice(false);
    setReview(i);
    replayEnd.current = CHAPTERS[i].start + CHAPTERS[i].duration;
    seek(CHAPTERS[i].start, false);
    setPlaying(true);
  };
  const check = () => {
    const scored = scoreReconstruction(order, matches);
    setResult(scored);
    setFirstResult((prev) => prev ?? scored);
  };
  const restart = () => {
    setPractice(false);
    setReview(null);
    setOrder([]);
    setMatches({});
    setResult(null);
    replayEnd.current = null;
    seek(0, false);
    setPlaying(true);
  };

  const blurMouseTarget = (e) => {
    if (e.pointerType === 'mouse' && e.target instanceof Element) {
      e.target.closest('button')?.blur();
    }
  };

  const missingOrderCount = Math.max(0, 3 - order.length);
  const missingMatchCount = Math.max(0, 3 - Object.values(matches).filter(Boolean).length);
  const missingTotalCount = missingOrderCount + missingMatchCount;

  return (
    <main className={`experience causal-lesson ${practice ? 'is-reconstructing' : ''}`}>
      <audio
        ref={audio}
        src={sitePath('/audio/road-90.m4a?delivery=static-v2')}
        preload="auto"
        onLoadedMetadata={() => {
          const a = audio.current;
          if (a && Number.isFinite(a.duration)) a.currentTime = clock.current.time;
        }}
        onError={() => {
          setVoice(false);
          setAudioError(true);
        }}
      />

      <header className="masthead">
        <a className="brand" href={returnHref}>
          <Compass weight="light" size={24} />
          <span>史序</span>
          <i />
          <span className="brand-sub">道路与建军 · 90秒精讲</span>
        </a>
        <div className="header-actions">
          <a href={returnHref}>
            <ArrowLeft size={15} />
            完整时间轴
          </a>
          <button onClick={openReading}>
            <BookOpen size={17} />
            完整内容
          </button>
          <button
            className="icon-button theme-toggle"
            aria-label={theme === 'dark' ? '切换到日间模式' : '切换到夜间模式'}
            title={theme === 'dark' ? '切换到日间模式' : '切换到夜间模式'}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
      </header>

      <section className="stage lesson-stage" aria-label="道路与建军地图叙事">
        <div
          className="lesson-map"
          aria-hidden={practice || gate || undefined}
          inert={practice || gate || undefined}
        >
          <MapScene
            geography={geography}
            events={events}
            scene={scene}
            playing={playing}
            rate={rate}
            clock={clock}
            sceneStart={chapter.start}
            animationRef={camera}
            storyController={controller}
            phase={frame.phase}
            onPick={() => {}}
            overview={false}
            zoom={1}
            fit="meet"
            extendMap
            concealFuture={!resolved.current}
          />
        </div>

        {!practice && (
          <article className="story lesson-story">
            <p className="lesson-kicker">
              {String(frame.index + 1).padStart(2, '0')} / 03 <span>{chapter.lens}</span>
            </p>
            <p className="lesson-question">{chapter.question}</p>
            <div className="year-line">
              <span className="year">{scene.year}</span>
              <span className="year-unit">年</span>
            </div>
            <h1>{scene.title}</h1>
            <p className="lesson-date">{/\d/.test(beat.date || '') ? beat.date : chapter.date}</p>
            <h2 className="beat-title">{beat.title}</h2>
            <p className="scene-summary">{beat.text}</p>
            {!gate && (
              <nav className="beat-navigation" aria-label="本段阶段">
                {story.beats
                  .filter((b) => resolved.current || chapter.start + playbackTime(scene, b.at) < DECISION_AT)
                  .map((b, i) => (
                    <button
                      key={b.at}
                      aria-current={i === frame.phase ? 'step' : undefined}
                      onClick={() => navigate(chapter.start + playbackTime(scene, b.at) + 0.05)}
                    >
                      {b.short}
                    </button>
                  ))}
              </nav>
            )}
          </article>
        )}

        {!gate && !practice && captions && (
          <div className="lesson-subtitles" aria-label="配音字幕">
            <span>{frame.index === 2 ? '1927 → 1929 · 时间跨越' : '道路与建军'}</span>
            <p>{NARRATION[frame.cue][2]}</p>
          </div>
        )}

        {review !== null && !practice && (
          <button
            className="review-return"
            onClick={() => {
              setPlaying(false);
              setPractice(true);
              setReview(null);
              replayEnd.current = null;
            }}
          >
            返回章末复原 <ArrowRight size={16} />
          </button>
        )}

        {gate && (
          <section className="decision-scene" aria-labelledby="decision-title">
            <p className="lesson-kicker">
              决策时刻 <span>00:20 · 已暂停</span>
            </p>
            <h2 id="decision-title" tabIndex={-1}>
              文家市会合之后，
              <br />
              实际的调整是什么？
            </h2>
            <p>攻打长沙受挫，余部会合。先作判断，再看后续过程。</p>
            {!feedback ? (
              <>
                <fieldset>
                  <legend className="sr-only">选择接下来的实际调整</legend>
                  {DECISIONS.map((d, i) => (
                    <label key={d.id} className={choice === d.id ? 'is-picked' : ''}>
                      <input
                        type="radio"
                        name="decision"
                        value={d.id}
                        checked={choice === d.id}
                        onChange={() => setChoice(d.id)}
                      />
                      <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                      <span>{d.text}</span>
                    </label>
                  ))}
                </fieldset>
                <div className="decision-actions">
                  <button className="lesson-primary" disabled={!choice} onClick={answer}>
                    确认判断 <ArrowRight size={17} />
                  </button>
                  <button onClick={skip}>先看史实</button>
                </div>
              </>
            ) : (
              <div className="decision-feedback" role="status">
                <h3>
                  {feedback === 'rural'
                    ? '判断正确'
                    : feedback === 'skipped'
                      ? '看实际发生的选择'
                      : '这里需要调整判断'}
                </h3>
                <p>
                  实际选择是放弃进攻长沙，转向农村山区。改变的是行动方向；三湾改编随后着重解决队伍内部的组织与领导问题。
                </p>
                <button className="lesson-primary" onClick={continueStory}>
                  继续看转兵过程 <Play size={16} weight="fill" />
                </button>
              </div>
            )}
          </section>
        )}

        {practice && (
          <section className="reconstruction" aria-labelledby="reconstruction-title">
            <div className="reconstruction-intro">
              <p className="lesson-kicker">
                章末复原 <span>90秒讲解已结束</span>
              </p>
              <h1 id="reconstruction-title" tabIndex={-1}>
                把这段历史，
                <br />
                自己连起来。
              </h1>
              <p>先恢复顺序，再辨别三件事各自解决的问题。无需计时。</p>
              {decision && (
                <p className="attempt-note">
                  决策首次判断：
                  {decision === 'rural' ? '正确' : decision === 'skipped' ? '已跳过' : '经解释纠正'}
                </p>
              )}
              <button onClick={openReading}>
                查阅完整内容 <BookOpen size={17} />
              </button>
            </div>

            <div className="reconstruction-tasks">
              <h2>
                <span>01</span> 恢复先后顺序
              </h2>
              <div className="order-slots">
                {[0, 1, 2].map((i) => (
                  <button
                    key={i}
                    disabled={!order[i]}
                    aria-label={`顺序${i + 1}${order[i] ? `：${events.find((e) => e.id === order[i]).title}，点击移除` : '：未填写'}`}
                    className={result ? (result.ordered[i] ? 'answer-correct' : 'answer-wrong') : ''}
                    onClick={() => {
                      setOrder((o) => o.filter((_, j) => j !== i));
                      setResult(null);
                    }}
                  >
                    <small>{i + 1}</small>
                    <span>{order[i] ? events.find((e) => e.id === order[i]).title : '待选事件'}</span>
                    {order[i] && <span className="slot-remove" aria-hidden="true">×</span>}
                  </button>
                ))}
              </div>
              {order.length < 3 ? (
                <div className="event-bank">
                  {QUIZ_BANK.map((id) => (
                    <button
                      key={id}
                      disabled={order.includes(id)}
                      onClick={() => {
                        setOrder((o) => [...o, id]);
                        setResult(null);
                      }}
                    >
                      {events.find((e) => e.id === id).title}
                      <span>＋</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="bank-complete-hint">已选满 3 项，点击上方槽位可调整顺序</p>
              )}

              <h2>
                <span>02</span> 它着重解决什么问题？
              </h2>
              <div className="problem-matches">
                {QUIZ_BANK.map((id, idx) => {
                  const usedByOthers = new Set(
                    Object.entries(matches)
                      .filter(([otherId, val]) => otherId !== id && val)
                      .map(([, val]) => val),
                  );
                  const availableProblems = PROBLEMS.filter((p) => matches[id] === p.id || !usedByOthers.has(p.id));
                  return (
                    <label
                      key={id}
                      className={result ? (result.matched[idx] ? 'answer-correct' : 'answer-wrong') : ''}
                    >
                      <span>{events.find((e) => e.id === id).title}</span>
                      <select
                        aria-label={`${events.find((e) => e.id === id).title}解决的问题`}
                        value={matches[id] || ''}
                        onChange={(e) => {
                          const picked = e.target.value;
                          setMatches((prev) => {
                            const next = { ...prev, [id]: picked };
                            if (picked) {
                              const unfilled = QUIZ_BANK.filter((qId) => !next[qId]);
                              const chosenSet = new Set(Object.values(next).filter(Boolean));
                              const unused = PROBLEMS.filter((p) => !chosenSet.has(p.id));
                              if (unfilled.length === 1 && unused.length === 1) {
                                next[unfilled[0]] = unused[0].id;
                              }
                            }
                            return next;
                          });
                          setResult(null);
                        }}
                      >
                        <option value="">请选择</option>
                        {availableProblems.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.text}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                })}
              </div>

              <div className="lesson-check-row">
                <button
                  className="lesson-primary"
                  disabled={missingTotalCount > 0}
                  onClick={check}
                >
                  检查复原 <ArrowRight size={17} />
                </button>
                {missingTotalCount > 0 && (
                  <span className="check-hint">还差 {missingTotalCount} 项待填</span>
                )}
              </div>

              {result && (
                <div className="reconstruction-feedback" role="status">
                  <h3>
                    本次复原 {result.total} / 6{' '}
                    <small>
                      首次提交 {firstResult.total} / 6{assisted ? ' · 已使用查阅或回看' : ''}
                    </small>
                  </h3>
                  <p>秋收起义（1927.9） → 三湾改编（1927.9） → 古田会议（1929.12）</p>
                  <ul>
                    {CHAPTERS.map((c, i) => (
                      <li key={c.id}>
                        <span>
                          {result.ordered[i] && result.matched[i] ? '✓' : '待巩固'} · {events[i].title}：
                          {PROBLEMS.find((p) => p.id === ANSWERS[c.id]).text}。
                        </span>
                        <button onClick={() => replay(i)}>回看这一段</button>
                      </li>
                    ))}
                  </ul>
                  <p className="attempt-note">这是即时复原结果；隔一段时间再试，才能检验是否记住。</p>
                </div>
              )}

              <div className="reconstruction-bottom">
                <button onClick={restart}>
                  <ArrowCounterClockwise size={16} />
                  重播90秒
                </button>
                <a href="./?panel=exam&chapter=2">
                  刷本专题真题 <ArrowRight size={16} />
                </a>
                <a href={returnHref}>
                  进入完整时间轴 <ArrowRight size={16} />
                </a>
              </div>
            </div>
          </section>
        )}
      </section>

      <footer className="player lesson-player">
        <div className="playback-row">
          <div className="transport">
            <button
              className="play-button"
              disabled={gate || practice}
              aria-label={playing ? '暂停播放' : '开始播放'}
              onClick={toggle}
            >
              {playing ? <Pause size={21} weight="fill" /> : <Play size={21} weight="fill" />}
            </button>
          </div>
          <div className="playback-time">
            <span ref={elapsed}>00:00</span>
            <span>/</span>
            <span>01:30</span>
          </div>
          <span className="lesson-play-state">
            {gate
              ? '请先完成上方判断'
              : practice
                ? '章末复原'
                : playing
                  ? '正在播放'
                  : '点击播放 · 含配音'}
          </span>
          <div className="transport-secondary" onPointerUp={blurMouseTarget}>
            <button
              type="button"
              aria-label={voice ? '关闭配音' : '开启配音'}
              aria-pressed={voice}
              onClick={toggleVoice}
            >
              {voice ? <SpeakerHigh size={19} /> : <SpeakerSlash size={19} />}
              <span>{voice ? '配音' : '静音'}</span>
            </button>
            <button
              type="button"
              className={`narration-toggle ${captions ? 'is-active' : ''}`}
              aria-label={captions ? '隐藏字幕' : '显示字幕'}
              aria-pressed={captions}
              onClick={toggleCaptions}
            >
              <ClosedCaptioning size={18} />
              <span>字幕</span>
            </button>
            <button
              type="button"
              className={`narration-toggle sfx-toggle ${sfx ? 'is-active' : ''}`}
              aria-label={sfx ? '关闭音效' : '开启音效'}
              aria-pressed={sfx}
              title={sfx ? '关闭音效' : '开启音效'}
              onClick={toggleSfx}
            >
              <Waveform size={18} />
              <span>音效</span>
            </button>
            <label className="speed-label">
              <span>倍速</span>
              <select
                aria-label="播放倍速"
                value={rate}
                onChange={(e) => updateRate(Number(e.target.value))}
              >
                <option value="0.5">0.5×</option>
                <option value="1">1×</option>
                <option value="1.5">1.5×</option>
                <option value="2">2×</option>
              </select>
            </label>
          </div>
        </div>
        <input
          ref={range}
          className="lesson-range"
          type="range"
          min="0"
          max="90"
          step="0.05"
          defaultValue="0"
          disabled={practice || gate}
          aria-label="精讲播放进度"
          onChange={(e) => {
            manualSeekUntilRef.current = performance.now() + 300;
            navigate(Number(e.target.value));
          }}
        />
        <nav className="lesson-chapters" aria-label="精讲章节">
          {CHAPTERS.map((c, i) => {
            const locked = i > 0 && !resolved.current;
            return (
              <button
                key={c.id}
                disabled={gate || practice || locked}
                aria-current={i === frame.index ? 'step' : undefined}
                onClick={() => navigate(c.start)}
              >
                <span>{i === 0 ? '00:00' : i === 1 ? '00:36' : '01:06'}</span>
                {locked ? '决策后解锁' : events[i].title}
              </button>
            );
          })}
          <button
            disabled={gate || !resolved.current}
            aria-current={practice ? 'step' : undefined}
            onClick={() => {
              navigate(90);
              setPractice(true);
            }}
          >
            01:30 · 章末复原
          </button>
        </nav>
        {audioError && <p role="status" className="audio-notice">配音暂时无法播放，已自动保留字幕。</p>}
      </footer>

      <dialog
        ref={dialog}
        closedby="any"
        className="reading-dialog lesson-reading"
        aria-labelledby="lesson-reading-title"
        onClose={() => setReading(false)}
        onPointerDown={(e) => {
          dialogBackdropPress.current = e.target === dialog.current;
        }}
        onPointerUp={(e) => {
          if (dialogBackdropPress.current && e.target === dialog.current) setReading(false);
          dialogBackdropPress.current = false;
        }}
      >
        <div className="dialog-content">
          <div className="dialog-top">
            <button className="icon-button" onClick={() => setReading(false)} aria-label="关闭完整内容">
              <X size={21} />
            </button>
          </div>
          <h2 id="lesson-reading-title">道路与建军 · 完整内容</h2>
          <p>精讲仅浓缩讲述节奏，以下保留全部分段讲解与资料原文。</p>
          {events.map((e, eventIdx) => {
            const lockedSpoiler = !resolved.current && eventIdx > 0;
            return (
              <section key={e.id} className="lesson-source">
                <h3>
                  {lockedSpoiler ? `第 ${eventIdx + 1} 段史实（决策后解锁）` : e.title}{' '}
                  <small>{CHAPTERS.find((c) => c.id === e.id).date}</small>
                </h3>
                <details open={resolved.current && e.id === scene.id}>
                  <summary>
                    分段讲解{!resolved.current ? '（含 00:20 决策后史实，点击展开）' : ''}
                  </summary>
                  {AUTHORED_STORIES[e.id].beats.map((b) => (
                    <div key={b.at}>
                      <h4>{b.title}</h4>
                      <p>{b.text}</p>
                    </div>
                  ))}
                </details>
                <details>
                  <summary>资料原文</summary>
                  {e.original.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </details>
              </section>
            );
          })}
        </div>
      </dialog>
    </main>
  );
}
