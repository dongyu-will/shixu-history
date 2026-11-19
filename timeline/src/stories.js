import { PROCESS_STORIES } from './storyboards/catalog.js';
import { PROCESS_PLACES } from './storyboards/places.js';

// Authored sequences represent historical actions. Connections are directional
// schematics rather than surveyed military routes or territorial boundaries.
export const STORY_PLACES = {
  changsha: { name: '长沙', coordinates: [112.982279, 28.19409], dx: -13, dy: -22, anchor: 'end' },
  xiushui: { name: '修水', coordinates: [114.573428, 29.032729], dx: 15, dy: 22 },
  pingjiang: { name: '平江', coordinates: [113.593751, 28.701523], dx: -12, dy: -14, anchor: 'end' },
  tonggu: { name: '铜鼓', coordinates: [114.37014, 28.520956], dx: 15, dy: -8 },
  liuyang: { name: '浏阳', coordinates: [113.633301, 28.141112], dx: -17, dy: -14, anchor: 'end' },
  anyuan: { name: '安源', coordinates: [113.855044, 27.625826], dx: 15, dy: 20 },
  liling: { name: '醴陵', coordinates: [113.507157, 27.657873], dx: -15, dy: 25, anchor: 'end' },
  wenjiashi: { name: '文家市', coordinates: [113.925, 28.0486], dx: 18, dy: 5 },
  sanwan: { name: '三湾', coordinates: [113.969962, 26.845689], dx: 18, dy: 5 },
  jinggangshan: { name: '井冈山地区', coordinates: [114.16, 26.62], dx: 20, dy: 9 },
};

export const STORY_SOURCES = {
  autumn: { title: '共产党员网：百年瞬间·秋收起义', url: 'https://www.12371.cn/2021/01/09/VIDE1610159042141982.shtml' },
  decision: { title: '共产党员网：9月19日党史日志', url: 'https://www.12371.cn/special/ds/9/19/' },
  directions: { title: '中国军网：三湾改编·建设新型人民军队的重要开端', url: 'https://www.81.cn/js_208592/jdt_208593/16243563.html' },
  sanwan: { title: '中央纪委：铭记光荣历史·三湾改编', url: 'https://m.ccdi.gov.cn/content/38/ab/18602.html' },
  organization: { title: '国防部：三湾，见证我军新生', url: 'https://www.mod.gov.cn/gfbw/gfjy_index/js_214151/4921325.html' },
};

export const AUTHORED_STORIES = {
  ...Object.fromEntries(Object.entries(PROCESS_STORIES).map(([id,story]) => [id, {
    ...story,
    center: story.anchor ? PROCESS_PLACES[story.anchor] : story.center,
    scale: story.anchor ? 2200 : story.scale,
  }])),
  'e-27': {
    kind: 'uprising', duration: 22, center: [115.89, 28.68], scale: 3000,
    sources: [],
    beats: [
      { at: 0, short: '起义', date: '1927年8月1日', title: '南昌起义爆发', text: '周恩来、贺龙、叶挺、朱德、刘伯承等领导2万余人的部队在南昌举行起义。' },
      { at: 7, short: '反抗', date: '1927年8月1日', title: '武装反抗国民党反动派', text: '大革命失败后，革命力量以武装起义作出回应。' },
      { at: 14, short: '建军', date: '1927年8月1日', title: '独立领导革命战争、创建人民军队', text: '这一枪，标志着中国共产党独立领导革命战争、创建人民军队和武装夺取政权的开端。' },
    ],
  },
  'e-28': {
    kind: 'decision', duration: 18, center: [114.3, 30.58], scale: 2600,
    sources: [],
    beats: [
      { at: 0, short: '总结', date: '1927年8月7日', title: '在失败中重新确定方向', text: '中共中央在汉口召开紧急会议，总结大革命失败的教训，纠正右倾机会主义错误。' },
      { at: 6, short: '方针', date: '1927年8月7日', title: '土地革命与武装起义', text: '会议确定两条相互联系的行动方针，为此后的革命实践指明方向。' },
      { at: 12, short: '实践', date: '1927年8月7日', title: '把革命力量重新组织起来', text: '随后开展的秋收起义和农村根据地建设，成为探索新道路的重要实践。' },
    ],
  },
  'e-29': {
    kind: 'autumn', duration: 35, center: [113.8, 28], scale: 11800,
    sources: [STORY_SOURCES.autumn, STORY_SOURCES.decision, STORY_SOURCES.directions, STORY_SOURCES.sanwan],
    beats: [
      { at: 0, short: '起义', date: '1927年9月', title: '三路起义，原定进攻长沙', text: '部队分别从修水、铜鼓和安源等地行动。虚线表示原定进攻方向。' },
      { at: 7, short: '受挫', date: '1927年9月上旬', title: '进攻受挫，原定目标未能实现', text: '面对强敌，三路起义部队均受挫折，继续强攻城市难以维持。' },
      { at: 14, short: '会合', date: '1927年9月19日', title: '余部在文家市会合', text: '毛泽东通知各部到文家市集结，在这里召开前敌委员会会议。' },
      { at: 21, short: '转兵', date: '1927年9月19日以后', title: '放弃攻长沙，转向农村山区', text: '部队改变原定方向，沿罗霄山脉南移，保存力量、寻找立足点。' },
      { at: 29, short: '三湾', date: '1927年9月29日', title: '抵达三湾，准备改编', text: '部队来到江西永新三湾村。接下来的改变，发生在军队的组织内部。' },
    ],
  },
  'meeting-50': {
    kind: 'organization', duration: 32, center: [113.8, 28], scale: 11800,
    sources: [STORY_SOURCES.sanwan, STORY_SOURCES.organization],
    beats: [
      { at: 0, short: '整编', date: '1927年9月29日起', title: '整编队伍，保存骨干', text: '部队由一个师缩编为一个团，重新整顿组织。' },
      { at: 7, short: '支部', date: '三湾改编', title: '支部建在连上', text: '党支部进入连队，党的领导由组织体系落实到基层。图中连队是关系示意。' },
      { at: 15, short: '民主', date: '三湾改编', title: '官兵平等，建立士兵委员会', text: '士兵参与管理和监督，军队内部的组织关系也随之改变。' },
      { at: 24, short: '南下', date: '1927年10月3日', title: '改编后，继续向井冈山进军', text: '毛泽东率部离开三湾，向井冈山地区继续前进。' },
    ],
  },
};

export function beatAt(story, seconds) {
  if (!story) return 0;
  return Math.max(0, story.beats.findLastIndex((beat) => beat.at <= seconds + 1e-7));
}

const KEY_EVENTS = new Set(['e-1','e-4','e-5','e-7','e-9','e-15','e-16','e-18','e-20','e-21','e-26','e-27','e-28','e-32','e-35','e-36','e-38','e-39','e-42','e-45','e-47','meeting-68','meeting-69','writing-88','land-79']);
export const PLAYBACK_SECONDS = 12 * 60;

/** Allocate teaching time by complexity, independently of authored motion time. */
export function storyboardEvents(events, targetSeconds = PLAYBACK_SECONDS) {
  const weights=events.map(e=>e.id==='e-29'?17:e.id==='meeting-50'?15:KEY_EVENTS.has(e.id)?12:e.id.startsWith('e-')?8:e.kind==='land'?7.5:e.kind==='writing'?5.5:6);
  const sum=weights.reduce((a,b)=>a+b,0);
  const exact=weights.map(w=>w/sum*Math.round(targetSeconds*10));
  const ticks=exact.map(Math.floor);
  const order=exact.map((value,i)=>({i,remainder:value-ticks[i]})).sort((a,b)=>b.remainder-a.remainder);
  const remaining=Math.round(targetSeconds*10)-ticks.reduce((a,b)=>a+b,0);
  for(let i=0;i<remaining;i++)ticks[order[i].i]++;
  return events.map((event,i)=>({...event,duration:ticks[i]/10}));
}

export function storyTime(event, playbackSeconds) {
  const duration=AUTHORED_STORIES[event.id]?.duration||event.duration;
  return Math.max(0,Math.min(duration,playbackSeconds/event.duration*duration));
}

export function playbackTime(event, authoredSeconds) {
  const duration=AUTHORED_STORIES[event.id]?.duration||event.duration;
  return Math.max(0,Math.min(event.duration,authoredSeconds/duration*event.duration));
}
