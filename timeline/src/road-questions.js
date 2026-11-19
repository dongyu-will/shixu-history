// Reviewed against the retained PDFs and the markji structured edition on 2026-11-12.
// Option order is bound to this version; source PDFs may order the same options differently.
export const ROAD_QUESTIONS = [
  {
    id:'2022-10', version:1, title:'南昌起义', type:'single', answer:'D',
    stem:'大革命失败后，要不要坚持革命？如何坚持革命？这是摆在中国共产党面前的两个带根本性的问题。党从残酷的现实中认识到，没有革命的武装就无法战胜武装的反革命，就无法夺取中国革命胜利，就无法改变中国人民和中华民族的命运，必须以武装的革命反对武装的反革命。南昌起义打响了武装反抗国民党反动派的第一枪，这是中国共产党',
    options:[['A','实施土地革命和武装起义方针的开始'],['B','建设无产阶级领导的新型人民军队的开端'],['C','实行工农武装割据的开始'],['D','独立领导革命战争、创建人民军队和武装夺取政权的开端']],
    explanation:'南昌起义的历史地位是独立领导革命战争、创建人民军队和武装夺取政权的开端。三湾改编着重从组织上建设新型人民军队，两者不能混同。',
    notes:{A:'土地革命和武装起义的方针由八七会议确定。',B:'这一贡献对应三湾改编。',C:'工农武装割据是在农村根据地建设中逐步探索的。',D:'南昌起义的历史地位。'},
    replay:'e-27', optionReplay:{A:'e-28',B:'meeting-50'},
    source:{file:'/sources/road-2022.pdf',page:4,answerPage:4,label:'2022年 · 第10题',note:'公开整理版；题意、选项内容与参考答案已交叉核对。'},
  },
  {
    id:'2023-10', version:1, title:'八七会议', type:'single', answer:'D',
    stem:'大革命失败以后，全国笼罩在白色恐怖之下。共产党员不怕牺牲，坚持理想信念，作出了挽救党挽救革命的努力。1927年8月7日，中共中央在汉口秘密召开紧急会议（八七会议）。八七会议',
    options:[['A','批评了大革命时期的“左”倾错误'],['B','阐明了党的工作重心从城市转移到农村的重要性'],['C','提出了组织湘、鄂、赣、粤四省的农民发动起义暴动'],['D','确定了土地革命和武装起义的方针']],
    explanation:'八七会议纠正大革命后期的右倾机会主义错误，确定土地革命和武装起义的方针。向农村进军是在随后革命实践中探索的，不能提前归给这次会议。',
    notes:{A:'纠正的是右倾机会主义错误。',B:'城市受挫后向农村进军，是后续实践中的转变。',C:'组织四省秋收起义是1927年7月中旬临时中央的决定。',D:'八七会议确定的方针。'},
    replay:'e-28', optionReplay:{B:'e-29'},
    source:{file:'/sources/road-2023.pdf',page:4,label:'2023年 · 第10题',note:'公开整理版；部分版本有“土地改革/土地革命”文字差异，此处据内容校订。'},
  },
  {
    id:'2018-27', version:1, title:'古田会议', type:'multiple', answer:'ABC',
    stem:'忠诚于党、听党指挥是我军的光荣传统。1929年12月下旬，红四军党的第九次代表大会在福建上杭县古田村召开。这次会议史称古田会议。会议通过的毛泽东起草的决议案，确立了思想建党、政治建军原则，规定红军是一个执行革命的政治任务的武装集团，必须',
    options:[['A','绝对服从共产党的领导'],['B','担负打仗、筹款和做群众工作的任务'],['C','加强政治工作'],['D','实行全国军事的总动员']],
    explanation:'古田会议强调红军的政治任务、党的领导和政治工作。全国军事总动员对应1937年洛川会议，不能放进1929年的古田会议。',
    notes:{A:'红军必须绝对服从党的领导。',B:'打仗、筹款和群众工作都是红军的任务。',C:'加强政治工作，纠正单纯军事观点。',D:'全国军事总动员对应洛川会议。'},
    replay:'e-32', optionReplay:{D:'meeting-57'},
    source:{file:'/sources/road-2018.pdf',page:4,answerPage:10,label:'2018年 · 第27题',note:'选项按结构化整理版排列，ABC对应PDF的BCD；已按内容核对。'},
  },
];
export const ROAD_STORAGE_KEY='shixu-road-study-v1';
const DAY=24*60*60*1000;
export const REVIEW_DAYS=[1,3,7];
export const emptyProgress=()=>({version:1,attempts:[],schedules:{}});
export function readProgress(storage) {
  try {
    const text=storage.getItem(ROAD_STORAGE_KEY);
    if(!text)return {progress:emptyProgress(),error:null};
    const value=JSON.parse(text);
    if(value.version!==1||!Array.isArray(value.attempts)||!value.schedules||typeof value.schedules!=='object')throw Error('invalid progress');
    const ids=new Set(ROAD_QUESTIONS.map(q=>q.id));
    const attempts=value.attempts.filter(a=>ids.has(a.questionId)&&typeof a.id==='string'&&Number.isFinite(a.at)&&typeof a.correct==='boolean'&&typeof a.answer==='string');
    const schedules=Object.fromEntries(Object.entries(value.schedules).filter(([id,s])=>ids.has(id)&&Number.isFinite(s.dueAt)&&Number.isInteger(s.step)&&s.step>=0&&s.step<REVIEW_DAYS.length));
    return {progress:{version:1,attempts,schedules},error:null};
  } catch {return {progress:emptyProgress(),error:'学习记录暂不可用，本次记录仅在当前页面保留。'};}
}
export function dueQuestions(progress,now=Date.now()) {
  return ROAD_QUESTIONS.filter(q=>progress.schedules[q.id]?.dueAt<=now).map(q=>q.id);
}
export function recordAttempt(progress,question,answer,{now=Date.now(),kind='practice',assisted=false,id=globalThis.crypto.randomUUID()}={}) {
  if(progress.attempts.some(a=>a.id===id))return progress;
  const normalized=[...new Set(answer)].sort().join('');
  if(!normalized||[...normalized].some(c=>!question.options.some(([letter])=>letter===c))||(question.type==='single'&&normalized.length!==1))throw Error('请选择有效答案');
  const correct=normalized===question.answer,previous=progress.schedules[question.id];
  const delayed=!!previous&&now>=previous.dueAt&&kind==='review';
  const attempt={id,questionId:question.id,questionVersion:question.version,at:now,answer:normalized,correct,kind,assisted,delayed};
  let schedule=previous;
  // Corrections and early practice never count as delayed retention or postpone a due review.
  if(!previous||delayed){
    const step=delayed&&correct&&!assisted?Math.min(previous.step+1,REVIEW_DAYS.length-1):0;
    schedule={step,dueAt:now+REVIEW_DAYS[step]*DAY};
  }
  return {...progress,attempts:[...progress.attempts,attempt],schedules:{...progress.schedules,[question.id]:schedule}};
}
