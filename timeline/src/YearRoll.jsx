import { useEffect, useState } from 'react';

let lastCommittedYear = null;

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function directionFor(from, to) {
  const prevNum = Number(from);
  const nextNum = Number(to);
  if (Number.isFinite(prevNum) && Number.isFinite(nextNum)) {
    return nextNum < prevNum ? 'down' : 'up';
  }
  return to < from ? 'down' : 'up';
}

function buildInitialRoll(current) {
  const prev = lastCommittedYear;
  if (!prev || prev === current || prefersReducedMotion()) {
    return { from: null, to: current, dir: 'up', seq: 0 };
  }
  return {
    from: prev,
    to: current,
    dir: directionFor(prev, current),
    seq: 1,
  };
}

export function YearRoll({ year, className = '' }) {
  const current = year == null ? '' : String(year);
  const [roll, setRoll] = useState(() => buildInitialRoll(current));

  if (roll.to !== current) {
    const prev = roll.to;
    const reduce = prefersReducedMotion();
    setRoll({
      from: reduce ? null : prev,
      to: current,
      dir: directionFor(prev, current),
      seq: roll.seq + 1,
    });
  }

  useEffect(() => {
    lastCommittedYear = current;
    if (!roll.from) return undefined;
    const timer = window.setTimeout(() => {
      setRoll((state) => (state.from ? { ...state, from: null } : state));
    }, 360);
    return () => window.clearTimeout(timer);
  }, [current, roll.from, roll.seq]);

  const toChars = Array.from(roll.to);
  const fromChars = roll.from ? Array.from(roll.from) : null;
  const paddedFrom =
    fromChars && fromChars.length < toChars.length
      ? [...Array(toChars.length - fromChars.length).fill(''), ...fromChars]
      : fromChars
        ? fromChars.slice(-toChars.length)
        : null;

  let changedCount = 0;

  return (
    <span
      className={`year year-roll${className ? ` ${className}` : ''}`}
      data-dir={roll.dir}
      data-rolling={roll.from ? 'true' : 'false'}
    >
      {toChars.map((char, index) => {
        const prevChar = paddedFrom ? paddedFrom[index] : null;
        const rolling = Boolean(roll.from && prevChar !== null && prevChar !== char);
        const step = rolling ? changedCount++ : 0;

        return (
          <span
            key={index}
            className={`year-roll-digit${rolling ? ' is-rolling' : ''}`}
            style={rolling ? { '--digit-step': step } : undefined}
          >
            {rolling && (
              <span key={`out-${roll.seq}`} className="year-roll-out" aria-hidden="true">
                {prevChar}
              </span>
            )}
            <span key={rolling ? `in-${roll.seq}` : 'steady'} className="year-roll-in">
              {char}
            </span>
          </span>
        );
      })}
    </span>
  );
}
