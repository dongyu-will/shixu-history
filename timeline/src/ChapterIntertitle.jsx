import { useEffect, useRef, useState } from 'react';
import { ERA_PRESETS } from './EraAtmosphere.js';

const ERA_MOTTOS = Object.freeze({
  'vol1-0': '山河变局，救亡图存',
  'vol1-1': '觉悟新潮，星火初燃',
  'vol1-2': '独立自主，开辟新路',
  'vol1-3': '全民族抗战，持久必胜',
  'vol1-4': '天地翻覆，走向新中国',
  'vol2-0': '立国建制，奠定基石',
  'vol2-1': '自力更生，艰辛探索',
  'vol2-2': '思想破冰，潮起东方',
  'vol2-3': '历史跃升，迈向新时代',
});

const CHAPTER_NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

/**
 * Non-blocking 1.7s documentary chapter intertitle card shown when playback crosses
 * into a new historical chapter. Never pauses audio or blocks pointer interaction.
 */
export function ChapterIntertitle({
  eraKey,
  volumeId,
  chapterIndex,
  chapterTitle,
  playing,
  overview,
  reduce = false,
  suppress = false,
}) {
  const prevKeyRef = useRef(`${volumeId}:${chapterIndex}`);
  const [card, setCard] = useState(null);

  useEffect(() => {
    const nextKey = `${volumeId}:${chapterIndex}`;
    const changed = prevKeyRef.current !== nextKey;
    prevKeyRef.current = nextKey;

    if (!changed || !playing || overview || suppress || reduce) {
      if (!playing || overview || reduce) setCard(null);
      return undefined;
    }

    const preset = ERA_PRESETS[eraKey];
    const globalIdx = (volumeId === 'prc' ? 5 : 0) + (chapterIndex || 0);
    const numeral = CHAPTER_NUMERALS[globalIdx] || String(globalIdx + 1);

    setCard({
      key: `${nextKey}:${Date.now()}`,
      kicker: `第${numeral}章 · ${preset?.range || ''}`,
      title: chapterTitle || preset?.label || '',
      motto: ERA_MOTTOS[eraKey] || '',
    });

    const timer = window.setTimeout(() => setCard(null), 1250);
    return () => window.clearTimeout(timer);
  }, [eraKey, volumeId, chapterIndex, chapterTitle, playing, overview, reduce, suppress]);

  if (!card) return null;

  return (
    <div key={card.key} className="chapter-intertitle" aria-hidden="true">
      <div className="chapter-intertitle-inner">
        <span className="chapter-intertitle-kicker">{card.kicker}</span>
        <strong className="chapter-intertitle-title">{card.title}</strong>
        <i className="chapter-intertitle-rule" />
        <em className="chapter-intertitle-motto">{card.motto}</em>
      </div>
    </div>
  );
}
