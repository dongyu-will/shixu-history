import { useMemo } from 'react';
import { buildClozeSegments } from './cloze.js';

/**
 * Interactive cloze text for exam hat-term recall (帽子词挖空自测).
 */
export function ClozeText({
  text,
  explicitTerms = null,
  masked = true,
  revealed = {},
  onToggle,
  prefix = 'cloze',
}) {
  const segments = useMemo(() => buildClozeSegments(text, explicitTerms), [text, explicitTerms]);

  return (
    <>
      {segments.map((seg, i) => {
        if (!seg.blank) return <span key={i}>{seg.text}</span>;
        const key = `${prefix}-${seg.id}`;
        if (!masked) {
          return (
            <mark key={key} className="cloze-highlight">
              {seg.text}
            </mark>
          );
        }
        const shown = Boolean(revealed[key]);
        return (
          <button
            key={key}
            type="button"
            className={`cloze-blank ${shown ? 'is-revealed' : 'is-hidden'}`}
            aria-pressed={shown}
            aria-label={shown ? `隐藏关键词：${seg.text}` : '点击显示隐藏的关键词'}
            onClick={() => onToggle?.(key)}
          >
            <span>{seg.text}</span>
          </button>
        );
      })}
    </>
  );
}
