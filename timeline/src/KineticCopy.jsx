import { useMemo } from 'react';
import { buildClozeSegments } from './cloze.js';

/**
 * Editorial kinetic narrative copy: preserves 100% verbatim text while sweeping a
 * restrained archival ink-brush highlight across core exam terms ("帽子词" & propositions)
 * in cadence with each beat transition.
 */
export function KineticCopy({ text, beatKey, playing = false }) {
  const segments = useMemo(() => buildClozeSegments(text), [text]);

  if (!segments.length) return null;

  let termOrder = 0;
  return (
    <p
      key={beatKey}
      className={`scene-summary kinetic-copy ${playing ? 'is-playing' : 'is-settled'}`}
    >
      {segments.map((seg, idx) => {
        if (!seg.blank) {
          return <span key={idx}>{seg.text}</span>;
        }
        const order = termOrder;
        termOrder += 1;
        return (
          <mark
            key={seg.id || idx}
            className="kinetic-term"
            style={{ '--term-order': order }}
          >
            {seg.text}
          </mark>
        );
      })}
    </p>
  );
}
