import { useEffect, useRef, useState } from 'react';

function directionFor(from, to) {
  const prevNum = Number(from);
  const nextNum = Number(to);
  if (Number.isFinite(prevNum) && Number.isFinite(nextNum)) {
    return nextNum < prevNum ? 'down' : 'up';
  }
  return to < from ? 'down' : 'up';
}

export function YearRoll({ year, className = '', reduce = false }) {
  const current = year == null ? '' : String(year);
  const prevYearRef = useRef(current);
  const [roll, setRoll] = useState({ from: null, to: current, dir: 'up', seq: 0 });

  useEffect(() => {
    const prev = prevYearRef.current;
    if (prev === current) return undefined;
    prevYearRef.current = current;
    setRoll((state) => ({
      from: reduce ? null : prev,
      to: current,
      dir: directionFor(prev, current),
      seq: state.seq + 1,
    }));
    if (reduce) return undefined;
    const timer = window.setTimeout(() => {
      setRoll((state) => (state.from ? { ...state, from: null } : state));
    }, 360);
    return () => window.clearTimeout(timer);
  }, [current, reduce]);

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
