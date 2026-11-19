import { AUTHORED_STORIES, beatAt, storyTime } from './stories.js';
export const LESSON_SECONDS = 90;
export const DECISION_AT = 20;
export const CHAPTERS = [
  { id:'e-29', start:0, duration:36, date:'1927年9月', lens:'道路探索', question:'进攻城市受挫，队伍向哪里去？' },
  { id:'meeting-50', start:36, duration:30, date:'1927年9月29日—10月3日', lens:'组织领导', question:'方向改变后，怎样把队伍组织起来？' },
  { id:'e-32', start:66, duration:24, date:'1929年12月', lens:'思想建党 · 政治建军', question:'有了组织，军队还需要怎样的思想和政治建设？' },
];
export const DECISIONS = [
  {id:'city',text:'继续按原计划，集中力量进攻长沙'},
  {id:'rural',text:'放弃进攻长沙，向农村山区转移'},
  {id:'reorganize',text:'只整顿队伍，仍以进攻长沙为目标'},
];
export const PROBLEMS = [
  {id:'thought',text:'确立思想建党、政治建军原则'},
  {id:'road',text:'受挫后转向农村山区，探索革命道路'},
  {id:'organization',text:'把支部建在连上，从组织上落实党的领导'},
];
export const ANSWERS = {'e-29':'road','meeting-50':'organization','e-32':'thought'};
export const QUIZ_BANK = ['e-32','e-29','meeting-50'];
export const NARRATION = [
  [0,7.2,'部队分路起义，原定目标仍是长沙。先看计划怎样指向城市。'],
  [7.2,14.4,'三路进攻受挫。原定目标没有实现，部队需要重新判断行动方向。'],
  [14.4,20,'余部在文家市会合。先停下来判断，接下来发生了什么？'],
  [20,29.8,'实际的选择，是放弃进攻长沙，向农村山区转移，保存力量，寻找立足点。'],
  [29.8,36,'部队来到三湾。方向改变后，组织与领导问题仍需解决。'],
  [36,42.56,'三湾改编整顿队伍，将一个师缩编为一个团，保存骨干。'],
  [42.56,50.06,'把支部建在连上，从组织上落实党对军队的领导。'],
  [50.06,58.5,'官兵平等和士兵委员会，也改变了队伍内部的关系。'],
  [58.5,66,'部队继续向井冈山前进。军队建设的探索，还要进入思想和政治层面。'],
  [66,74,'时间来到一九二九年。单纯军事观点等错误思想，影响党和军队的建设。'],
  [74,82,'古田会议确立思想建党、政治建军原则，强调把思想建设放在首位。'],
  [82,90,'三个层面：转兵探索道路，三湾着重组织领导，古田强调思想建党和政治建军。'],
];
export function lessonEvents(events) {
  return CHAPTERS.map(c=>{const e=events.find(e=>e.id===c.id);if(!e)throw Error(`缺少资料 ${c.id}`);return {...e,duration:c.duration};});
}
export function lessonFrame(events,time) {
  const index=Math.max(0,CHAPTERS.findLastIndex(c=>c.start<=time));
  const scene=events[index];const native=storyTime(scene,time-CHAPTERS[index].start);
  return {index,phase:beatAt(AUTHORED_STORIES[scene.id],native),native,cue:Math.max(0,NARRATION.findLastIndex(c=>c[0]<=time))};
}
export function boundedTime(requested,resolved) {return Math.max(0,Math.min(resolved?LESSON_SECONDS:DECISION_AT,requested));}
export function scoreReconstruction(order,matches) {
  const ordered=CHAPTERS.map((c,i)=>order[i]===c.id);
  const matched=CHAPTERS.map(c=>matches[c.id]===ANSWERS[c.id]);
  return {ordered,matched,total:[...ordered,...matched].filter(Boolean).length};
}
