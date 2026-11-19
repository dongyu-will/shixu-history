/**
 * Extract high-value exam "hat terms" (帽子词 / 核心定性词) as interactive cloze blanks.
 */
const PRIORITY_TERMS = [
  '半殖民地半封建社会',
  '反帝反封建的民主革命纲领',
  '反帝反封建',
  '农村包围城市、武装夺取政权',
  '农村包围城市',
  '思想建党、政治建军',
  '思想建党',
  '政治建军',
  '支部建在连上',
  '工农武装割据',
  '马克思主义中国化',
  '马克思主义的中国化',
  '抗日民族统一战线',
  '人民民主专政',
  '新民主主义革命总路线',
  '土地改革总路线',
  '新民主主义社会',
  '新民主主义理论',
  '新民主主义',
  '民主集中制',
  '实事求是',
  '群众路线',
  '独立自主',
  '耕者有其田',
  '减租减息',
  '交租交息',
  '平均地权',
  '节制资本',
  '农民个人私有',
  '土地使用权',
  '使用权',
  '保护中农',
  '没收一切土地',
  '中体西用',
  '师夷长技以制夷',
  '君主立宪制',
  '君主专制制度',
  '民主共和',
  '振兴中华',
  '三民主义',
  '新三民主义',
  '联俄、联共、扶助农工',
  '第一次国共合作',
  '第二次国共合作',
  '全面抗战',
  '战略防御',
  '战略相持',
  '战略反攻',
  '战略进攻',
  '战略决战',
  '三三制',
  '发展进步势力',
  '争取中间势力',
  '孤立顽固势力',
  '两个务必',
  '由乡村转向城市',
  '由乡村转到城市',
  '从农村转向城市',
  '三大法宝',
  '统一战线',
  '武装斗争',
  '党的建设',
  '主观主义',
  '宗派主义',
  '党八股',
  '第一枪',
  '无产阶级领导权',
  '工农联盟',
  '生死攸关的转折点',
  '伟大转折',
  '历史转折',
  '首要任务',
  '指导思想',
  '开端',
  '起点',
  '没有调查，没有发言权',
  '官兵平等',
  '士兵委员会',
  '和平、民主、团结',
  '双十协定',
  '共同纲领',
  '临时约法',
  '南京条约',
  '马关条约',
  '辛丑条约',
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const TERM_PATTERN = new RegExp(
  [
    '“[^”]{2,18}”',
    '《[^》]{2,18}》',
    ...PRIORITY_TERMS.map(escapeRegex),
  ].join('|'),
  'g',
);

/**
 * Split text into plain and cloze-blank segments.
 * Ensures at least one blank when text is long enough, while keeping enough context readable.
 */
export function buildClozeSegments(text, explicitTerms = null) {
  const source = String(text || '');
  if (!source) return [];

  const pattern =
    explicitTerms?.length
      ? new RegExp(
          [...explicitTerms]
            .filter(Boolean)
            .sort((a, b) => b.length - a.length)
            .map(escapeRegex)
            .join('|'),
          'g',
        )
      : TERM_PATTERN;

  const segments = [];
  let cursor = 0;
  let blankCount = 0;
  const maxBlanks = explicitTerms?.length ? explicitTerms.length : 4;

  for (const match of source.matchAll(pattern)) {
    if (blankCount >= maxBlanks) break;
    const start = match.index;
    const token = match[0];
    if (start < cursor) continue;
    // Avoid blanking out almost the entire string when text is very short.
    if (!explicitTerms && token.length >= source.length * 0.85) continue;
    if (start > cursor) segments.push({ text: source.slice(cursor, start), blank: false });
    segments.push({ text: token, blank: true, id: `b-${blankCount}` });
    blankCount += 1;
    cursor = start + token.length;
  }

  if (cursor < source.length) {
    segments.push({ text: source.slice(cursor), blank: false });
  }

  // Fallback for texts without explicit hat terms: split at punctuation or a natural verb boundary.
  if (blankCount === 0 && source.length >= 10) {
    const punctIdx = Math.max(source.lastIndexOf('，'), source.lastIndexOf('、'), source.lastIndexOf('：'));
    const verbMatch = source.match(/(确立了?|提出了?|肯定了?|规定了?|实现了?|标志著?|标志着?|推动了?|反对|转向|废除|实行|决定|坚持|纠正|成立)/);
    let splitAt = -1;
    if (punctIdx >= 2 && punctIdx <= source.length - 4) {
      splitAt = punctIdx + 1;
    } else if (verbMatch && verbMatch.index >= 2 && verbMatch.index <= source.length - 4) {
      splitAt = verbMatch.index;
    } else {
      splitAt = Math.floor(source.length * 0.5);
    }
    const head = source.slice(0, splitAt);
    const tail = source.slice(splitAt).replace(/[。！？]$/, '');
    const punct = source.slice(head.length + tail.length);
    if (tail.length >= 3 && tail.length < source.length * 0.8) {
      const fallback = [];
      if (head) fallback.push({ text: head, blank: false });
      fallback.push({ text: tail, blank: true, id: 'b-0' });
      if (punct) fallback.push({ text: punct, blank: false });
      return fallback;
    }
  }

  return segments;
}
