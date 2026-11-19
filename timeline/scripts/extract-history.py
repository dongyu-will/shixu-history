"""Extract source-bound history content. Requires PyMuPDF (fitz)."""
import json
import os
import re
import shutil
from pathlib import Path
import fitz

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(os.environ.get('SHIXU_SOURCE_PDF') or (ROOT / 'public/sources/history.pdf'))
doc = fitz.open(SOURCE)
compact = lambda s: re.sub(r'\s+', '', s or '')

def text(parts):
    out = []
    for part in parts:
        for line in part.splitlines():
            line = compact(line)
            if not line:
                continue
            new = re.match(r'^(\d+、|[①②③④⑤⑥⑦⑧⑨⑩]|\*|（[一二三四五六七八九十]+）|第[一二三四五六七八九十]+[、，]|首先|其次|最后)', line)
            if new or not out:
                out.append(line)
            else:
                out[-1] += line
    assert compact(''.join(out)) == compact(''.join(parts))
    return out

events = []
def event(kind, title, year, raw, pages, date=None, end=None, id=None):
    e = dict(id=id or f'{kind}-{len(events)+1}', kind=kind, title=title, year=year,
             dateLabel=date or str(year)+'年', endYear=end, original=text(raw), pages=sorted(set(pages)))
    events.append(e)
    return e

# All 47 original timeline entries, preserving cross-page continuations.
rows=[]
for p in range(60,80):
    for cells in doc[p].find_tables().tables[0].extract():
        time,title,body=cells
        if compact(time)=='时间': continue
        if compact(time): rows.append(dict(time=compact(time),title=compact(title),parts=[body or ''],pages=[p+1]))
        else:
            rows[-1]['title']+=compact(title)
            rows[-1]['parts'].append(body or '')
            rows[-1]['pages'].append(p+1)
assert len(rows)==47
for i,r in enumerate(rows):
    time=r['time']
    years=re.findall(r'(?:18|19)\d{2}', time)
    year=int(years[0]) if years else 1870
    date=(time if '年代' in time else time+'年') if '.' not in time else time.replace('.', '年',1).replace('.', '月',1)+'日'
    e=event('event',r['title'],year,r['parts'],r['pages'],date, int(years[1]) if len(years)>1 else None,id=f'e-{i+1}')
    if '.' in time:
        y,m,d=map(int,time.split('.'));e['sort']=y+(m-1)/12+(d-1)/372

# Conferences: actual table cells, including title/date split over pages.
meetings=[]
for p in range(14):
    for table in doc[p].find_tables().tables:
        for name,body in table.extract():
            name=compact(name);body=body or ''
            if name=='会议':continue
            if name and not re.match(r'^[（(]\d',name):
                meetings.append(dict(title=name,parts=[body],pages=[p+1]))
            elif meetings:
                meetings[-1]['title']+=name
                meetings[-1]['parts'].append(body)
                meetings[-1]['pages'].append(p+1)

aliases={'中共一大':'中国共产党的成立'}
for r in meetings:
    yr=re.search(r'(19\d{2})',r['title'])
    if not yr or int(yr[1])>1949:continue
    title=re.split(r'[（(](?=19)',r['title'])[0]
    if title.startswith('《为抗日'): title='八一宣言'
    match=next((e for e in events if e['title']==aliases.get(title,title)),None)
    if match:
        match['kind']='meeting'
        match['title']=title
        match['timelineOriginal']=match['original']
        match['original']+=text(r['parts'])
        match['pages']=sorted(set(match['pages']+r['pages']))
        match['dateLabel']=re.search(r'[（(]([\d.、-]+)[）)]',r['title'])[1] if re.search(r'[（(]([\d.、-]+)[）)]',r['title']) else match['dateLabel']
        e=match
    else:
        e=event('meeting',title,int(yr[1]),r['parts'],r['pages'],r['title'][len(title):].strip('（）()'))
    dateparts=re.search(r'(19\d{2})[.、](\d{1,2})(?:[.、](\d{1,2}))?',r['title'])
    if dateparts:
        y,m,d=dateparts.groups(); e['sort']=int(y)+(int(m)-1)/12+(int(d or 1)-1)/372
    if title=='中共一大': e['dateLabel']='1921年7月23日开幕'; e['sort']=1921+6/12+22/372
    if title=='三湾改编': e['dateLabel']='1927年9月29日';e['sort']=1927+8/12+28/372
    if title=='八一宣言':e['dateLabel']='1935年8月1日'
    if title=='中共六届六中全会':e['dateLabel']='1938年9—11月'; e['sort']=1938+8/12
    if title=='中共七大':e['dateLabel']='1945年4月23日—6月11日';e['sort']=1945+3/12+22/372
    if title=='重庆谈判':
        e['dateLabel']='1945年8月28日赴重庆';e['sort']=1945+7/12+27/372
        e['sourceNote']='原表标题标注1945.8.25，正文记载8月28日赴重庆；播放日期采用正文。'

# Land policy cells; blank rows continue the preceding policy, repeated headers are skipped.
lands=[]
started=False
for p in range(40,45):
    for table in doc[p].find_tables().tables:
        for r in table.extract():
            if len(r)!=3:continue
            period,name,body=map(lambda x:x or '',r)
            if compact(period)=='年代时期':started=True;continue
            if not started:continue
            if compact(name):lands.append(dict(period=compact(period),title=compact(name),parts=[body],pages=[p+1]))
            elif lands and compact(body):
                lands[-1]['parts'].append(body);lands[-1]['pages'].append(p+1)
for r in lands:
    yr=re.search(r'(18\d{2}|19\d{2})',r['period'])
    if not yr or int(yr[1])>1949:continue
    end=re.findall(r'(?:18|19)\d{2}',r['period'])
    event('land',r['title'],int(yr[1]),r['parts'],r['pages'],r['period'],int(end[1]) if len(end)>1 else None)

# Writings: source-column crops avoid misleading merged-cell extraction.
def crop(p,y0,y1):
    page=doc[p-1]
    lines=[]
    for b in page.get_text('blocks'):
        if b[0]>=249 and b[1]>=y0 and b[3]<=y1: lines.append(b[4])
    return ''.join(lines)
writings=[
('中国社会各阶级的分析',1925,[(57,332,384)]),
('湖南农民运动考察报告',1927,[(57,386,493)]),
('中国的红色政权为什么能够存在？',1928,[(57,513,638)]),
('井冈山的斗争',1928,[(57,641,677)]),
('星星之火，可以燎原',1930,[(57,680,740),(58,85,159)]),
('反对本本主义',1930,[(58,162,270)]),
('中国革命战争的战略问题',1936,[(58,309,434)]),
('实践论、矛盾论',1937,[(58,435,615)]),
('论持久战',1938,[(58,616,724)]),
('〈共产党人〉发刊词',1939,[(59,85,285)]),
('中国革命和中国共产党',1939,[(59,287,394)]),
('新民主主义论',1940,[(59,395,520)]),
('改造我们的学习',1941,[(59,522,684)]),
('整顿党的作风',1942,[(59,522,684)]),
('反对党八股',1942,[(59,522,684)]),
('在延安文艺座谈会上的讲话',1942,[(60,107,125)]),
('论联合政府',1945,[(60,145,252)]),
('在晋绥干部会议上的讲话',1948,[(60,290,416)]),
('将革命进行到底',1948,[(60,435,453)]),
('七届二中全会上的报告',1949,[(60,471,561)]),
('论人民民主专政',1949,[(60,562,724)]),
]
for title,year,regions in writings:
    parts=[crop(*r) for r in regions];assert compact(''.join(parts)),title
    e=event('writing','《'+title+'》',year,parts,[r[0] for r in regions])
    if title in ('改造我们的学习','整顿党的作风','反对党八股'):
        e['sourceNote']='原资料将三篇整风著作合并说明，下方保留这一组原文。'

# Concise narration, distilled from the linked source rather than generated at runtime.
summaries={
'鸦片战争':('中国近代史的起点','战败后，清政府于1842年签订中英《南京条约》。中国社会性质和革命任务开始发生变化。','中国沿海'),
'广州三元里人民的抗英斗争':('人民自发的反侵略斗争','中国近代史上中国人民第一次大规模的反侵略武装斗争。','广州市'),
'魏源《海国图志》':('睁眼看世界，学习西方技术','提出“师夷长技以制夷”，主张学习外国先进军事与科学技术，以抵御外国侵略。',None),
'太平天国运动':('旧式农民战争的高峰','《天朝田亩制度》提出平分土地的方案；《资政新篇》提出具有资本主义色彩的发展方案。',None),
'洋务运动':('以“自强”“求富”探索出路','以“中体西用”为指导，兴办近代企业、建设新式海陆军、创办学堂和派遣留学生。',None),
'早期维新派':('从学习技术走向学习制度','王韬、薛福成、马建忠、郑观应等，不仅主张学习西方科学技术，也要求吸纳政治、经济学说。',None),
'中日甲午战争':('民族危机进一步加深','北洋海军全军覆没，洋务运动失败。1895年《马关条约》签订，列强掀起瓜分中国的狂潮。',None),
'救亡图存与振兴中华':('寻找民族的出路','严复喊出“救亡”口号、介绍进化论；孙中山组建兴中会，提出“振兴中华”。',None),
'戊戌维新':('资产阶级改良道路的尝试','维新派主张变法、兴民权、设议院和兴西学。这是一场爱国救亡运动，也是一场思想启蒙运动。','北京市'),
'义和团运动':('反对列强侵略的群众斗争','义和团在粉碎帝国主义列强瓜分中国的斗争中发挥重要作用，同时存在排外、迷信等局限。',None),
'八国联军侵华战争与《辛丑条约》签订及清末新政':('清政府沦为“洋人的朝廷”','1901年《辛丑条约》签订。清政府随后推行“新政”和预备立宪，其根本目的是延续统治。','北京市'),
'孙中山成立中国同盟会与三民主义':('全国性资产阶级革命政党成立','1905年8月20日，中国同盟会在东京成立。三民主义初步描绘了资产阶级共和国的方案。',None),
'萍浏醴起义':('同盟会成立后的首次武装起义','革命派选择以武装起义推翻清王朝统治。',None),
'革命与改良的论战':('中国究竟应走哪条道路','革命派与改良派以《民报》《新民丛报》为主要阵地展开论战，传播民主革命思想。',None),
'武昌起义与清王朝的覆灭':('辛亥革命的突破','1911年10月10日武昌起义爆发，1912年2月12日清帝退位，封建君主专制制度覆灭。','武汉市'),
'中华民国建立':('民主共和的制度尝试','1912年1月1日，孙中山在南京就任临时大总统。《临时约法》确认了资产阶级共和国的政治制度。','南京市'),
'北洋军阀与旧民主主义革命的失败':('旧民主主义革命走到尽头','北洋军阀政权代表大地主和买办资产阶级利益。护法运动失败，表明旧民主主义革命道路难以继续。',None),
'新文化运动':('民主与科学的思想启蒙','1915年《青年杂志》创办，新文化运动兴起。五四运动后，马克思主义逐步在思想文化领域发挥指导作用。','上海市'),
'俄国十月革命':('先进分子转向社会主义','十月革命推动中国先进分子研究马克思主义。李大钊率先在中国举起马克思主义旗帜。',None),
'五四运动':('新民主主义革命的开端','巴黎和会中国外交失败成为直接导火线。五四运动促进马克思主义传播，推动其与中国工人运动结合。','北京市'),
'罢工运动':('工人运动的发展','这一条目集中比较香港海员、京汉铁路、安源路矿、开滦五矿及省港大罢工，复习时注意各自特点。',None),
'大革命':('第一次国共合作推动革命高潮','以五卅运动为起点，全国大革命高潮兴起。1926年北伐开始；1927年国共合作破裂，大革命失败。',None),
'南昌起义':('武装反抗国民党反动派的第一枪','1927年8月1日，周恩来、贺龙、叶挺、朱德、刘伯承等领导南昌起义，开启独立领导革命战争、创建人民军队的新阶段。','南昌市'),
'秋收起义':('从进攻城市转向农村','起义军公开打出“工农革命军”旗帜。攻打长沙受挫后，部队转向农村，开始创建井冈山根据地的斗争。',None),
'毛泽东思想萌芽时期':('从中国社会和农民问题出发','联系《中国社会各阶级的分析》《湖南农民运动考察报告》，理解革命对象、动力和领导权问题。',None),
'毛泽东思想初步形成时期':('探索中国革命的新道路','联系《中国的红色政权为什么能够存在？》《井冈山的斗争》《星星之火，可以燎原》和《反对本本主义》。',None),
'土地革命战争时期严重挫折':('“左”倾教条主义带来的危害','错误的革命道路、土地政策和军事方针造成严重损失，第五次反“围剿”失败，红军被迫战略转移。',None),
'九一八事变':('中国抗日战争的起点','1931年9月18日，日本关东军制造柳条湖事件，进攻沈阳。中国人民十四年抗日战争由此开始。','沈阳市'),
'一二九运动':('抗日救亡运动走向新高潮','1935年12月9日，北平学生举行抗日游行，要求停止内战、一致对外，运动迅速波及全国。','北京市'),
'长征胜利':('中国革命转危为安的关键','1936年10月，红军三大主力会师，长征胜利结束，实现北上抗日的战略转移。',None),
'抗日民族统一战线':('把抗日力量团结起来','联系八一宣言、瓦窑堡会议、西安事变和第二次国共合作，理解抗日民族统一战线的形成。',None),
'巩固抗日民族统一战线的策略总方针':('发展、争取与孤立','发展进步势力、争取中间势力、孤立顽固势力；对顽固派实行又联合又斗争的政策。',None),
'三三制民主政权建设':('团结各方面的抗日民主政权','共产党员、党外进步人士和中间派各占三分之一，以团结赞成抗日又赞成民主的各阶级、阶层。',None),
'抗日战争的胜利':('近代反侵略斗争的完全胜利','抗战胜利是中华民族从深重危机走向伟大复兴的历史转折点。复习时区分胜利的决定因素、关键和重要法宝。',None),
'中国共产党争取和平民主':('和平、民主、团结','1945年8月25日，中共中央发表《对目前时局的宣言》，明确提出和平、民主、团结的口号。',None),
'重庆谈判和政治协商会议':('争取和平建国的努力','1945年重庆谈判签订《双十协定》；1946年政治协商会议达成政府组织、和平建国等五项协议。','重庆市'),
'全面内战':('从战略防御走向战略决战','解放战争经历战略防御、战略进攻、战略决战。国民党统治区的人民民主运动形成第二条战线。',None),
'与民主党派合作':('协商建国的道路','1948年“五一口号”揭开协商建国的序幕；1949年民主党派和无党派民主人士公开自愿接受中国共产党领导。',None),
'新中国成立':('民族独立、人民解放的新起点','中华人民共和国成立。材料中的建国后内容，可继续结合会议与土地政策专题学习。','北京市'),
'中共一大':('中国共产党正式成立','1921年7月23日，大会在上海开幕，最后一天转移至嘉兴南湖游船。大会确定党的名称，通过第一个纲领和决议。','上海市'),
'中共二大':('制定民主革命纲领','第一次明确提出反帝反封建的民主革命纲领，区分党的最高纲领与现阶段的最低纲领。','上海市'),
'中共三大':('明确第一次国共合作方式','决定共产党员以个人身份加入国民党，同时保持党在政治、思想、组织上的独立性。','广州市'),
'国民党一大':('第一次国共合作正式形成','重新解释三民主义，事实上确认联俄、联共、扶助农工三大革命政策。','广州市'),
'中共四大':('领导权与工农联盟','第一次明确提出无产阶级在民主革命中的领导权和工农联盟问题。',None),
'中共五大':('确立党的组织指导原则','材料指出，1927年修正的党章首次明确规定党组织的指导原则为民主集中制。',None),
'八七会议':('从大革命失败转向土地革命','会议总结大革命失败的教训，确定土地革命和武装起义的方针。毛泽东强调“政权是由枪杆子中取得的”。','武汉市'),
'三湾改编':('把党的支部建在连上','1927年9月29日，毛泽东在江西永新三湾村领导改编，从组织上确立党对军队的领导。','永新县'),
'中共六大':('以争取群众为首要任务','1928年在苏联举行，确定以争取群众作为党的首要任务，反对“左”倾危险。',None),
'古田会议':('思想建党、政治建军','1929年12月，会议在福建上杭古田召开，确立思想建党、政治建军原则，系统回答建党建军的根本问题。','上杭县'),
'中华苏维埃一大':('工农民主政权的全国性尝试','1931年11月在江西瑞金召开，通过宪法大纲，成立中华苏维埃共和国临时中央政府。','瑞金市'),
'遵义会议':('生死攸关的转折点','1935年1月，会议集中解决军事和组织问题，开启党独立自主解决中国革命实际问题的新阶段。','遵义市'),
'八一宣言':('停止内战，一致抗日','呼吁全国各党派、各阶层、各军队团结起来，共同抗日。',None),
'瓦窑堡会议':('确立抗日民族统一战线方针','阐明建立抗日民族统一战线的可能性，提出新政策，开始解决政治路线问题。','子长市'),
'停战议和一致抗日通电':('从反蒋转向联蒋抗日','放弃反蒋口号，第一次把蒋介石作为联合对象；此后提出“逼蒋抗日”的总方针。',None),
'西安事变':('和平解决成为时局转换的枢纽','张学良、杨虎城实行“兵谏”。和平解决后，十年内战局面基本结束，国内和平初步实现。','西安市'),
'国民党五届三中全会':('推动国共谈判','中共提出停止内战、一致对外的要求和四项保证，推动国共两党谈判。',None),
'洛川会议':('制定全面抗战路线','1937年8月召开，提出使已发动的抗战成为全面的全民族抗战，制定抗日救国十大纲领。','洛川县'),
'中共中央为公布国共合作宣言':('第二次国共合作正式形成','1937年9月22日宣言发表，次日蒋介石发表承认共产党合法地位的谈话。',None),
'中共六届六中全会':('提出“马克思主义中国化”','1938年9至11月在延安召开。毛泽东在《论新阶段》中第一次提出“马克思主义中国化”的科学命题。','延安市'),
'整风运动':('确立实事求是的思想路线','反对主观主义以整顿学风，反对宗派主义以整顿党风，反对党八股以整顿文风。','延安市'),
'六届七中全会':('总结历史经验，增进全党团结','原则通过《关于若干历史问题的决议》，为党的七大胜利召开创造条件。','延安市'),
'中共七大':('把毛泽东思想确立为指导思想','1945年4至6月在延安召开，将毛泽东思想写入党章，总结党的三大优良作风。','延安市'),
'对目前时局的宣言':('明确和平、民主、团结的口号','1945年8月25日发表，体现抗战胜利后争取和平民主的主张。',None),
'重庆谈判':('《双十协定》确认和平建国方针','1945年8月28日毛泽东赴重庆谈判，10月10日签署《双十协定》。','重庆市'),
'重庆政治协商会议':('围绕和平建国达成五项协议','1946年1月10日在重庆开幕，达成政府组织、国民大会、和平建国纲领、宪法草案和军事问题五项协议。','重庆市'),
'五一口号':('揭开协商建国的序幕','号召召开政治协商会议、召集人民代表大会、成立民主联合政府。',None),
'对时局的意见':('公开自愿接受中国共产党领导','1949年1月22日，民主党派领导人和无党派民主人士联合发表政治声明，拥护建立人民民主的新中国。',None),
'中共七届二中全会':('党的工作重心由乡村转向城市','1949年3月在西柏坡召开，提出促进革命取得全国胜利的方针，强调“两个务必”。','平山县'),
'中国人民政治协商会议第一届全体会议':('新中国的筹建与制度奠基','1949年9月在北平召开，通过《共同纲领》，为中华人民共和国的建立作出重要贡献。','北京市'),
'《天朝田亩制度》':('“凡天下田，天下人同耕”','提出平均分配土地的方案，反映农民要求获得土地的愿望；其绝对平均的社会理想未能付诸实施。',None),
'民生主义':('平均地权','核定地价、涨价归公；“平均地权”并非把土地所有权分给农民，没有正面触及封建土地所有制。',None),
'新民生主义':('平均地权与节制资本','国民党一大重新解释三民主义，民生主义概括为“平均地权”和“节制资本”两大原则。','广州市'),
'土地革命和武装反抗国民党统治的总方针':('八七会议确立新方针','在大革命失败后，会议确定土地革命和武装起义的方针。','武汉市'),
'井冈山土地法':('以立法形式肯定农民获得土地','1928年12月制定，规定没收一切土地归苏维埃政府所有，存在不适合农村实际的规定。','井冈山市'),
'兴国土地法':('对没收一切土地的原则性改正','1929年4月制定，改为没收一切公共土地及地主阶级的土地，保护中农利益。','兴国县'),
'土地革命中的阶级路线和土地分配方法':('以乡为单位，按人口平分土地','依靠贫农雇农、联合中农、限制富农、保护中小工商业者、消灭地主阶级，实行抽多补少、抽肥补瘦。',None),
'减租减息':('在抗日统一战线下调整土地政策','地主减租减息，农民交租交息；既改善农民生活，又照顾地主、富农利益，团结各方面抗日力量。',None),
'《关于清算减租及土地问题的指示》（五四指示）':('由减租减息转向“耕者有其田”','1946年5月4日发布，标志着土地政策从削弱封建剥削向变革封建土地关系过渡。',None),
'《中国土地法大纲》':('彻底反封建的土地革命纲领','1947年全国土地会议通过，规定废除封建及半封建剥削的土地制度，实行“耕者有其田”。','平山县'),
}

bookmeta={
'中国社会各阶级的分析':('分清敌友','分析中国社会各阶级，讨论革命的对象、动力和领导权。'),
'湖南农民运动考察报告':('农民运动与无产阶级领导','强调领导农民斗争的重要性，分析中国农民运动的特点。'),
'中国的红色政权为什么能够存在？':('工农武装割据的理论探索','分析中国国情，阐述红色政权存在和发展的原因、条件。'),
'井冈山的斗争':('土地、武装与根据地','阐明土地革命、武装斗争和农村革命根据地建设的关系。'),
'星星之火，可以燎原':('农村包围城市道路的探索','强调红军、游击队和红色区域对于中国革命发展的重要作用。'),
'反对本本主义':('没有调查，就没有发言权','强调理论与实际相结合，提出独立自主思想的最初明确表述。'),
'中国革命战争的战略问题':('从中国实际研究战争规律','总结土地革命战争的经验，系统说明中国革命战争的战略问题。'),
'实践论、矛盾论':('从哲学高度总结革命经验','批判主观主义尤其是教条主义，论证马克思主义基本原理与中国具体实际相结合。'),
'论持久战':('抗日战争为什么是持久战','批判亡国论和速胜论，分析中日矛盾的四个特点，预见抗战三个阶段。'),
'〈共产党人〉发刊词':('统一战线、武装斗争、党的建设','概括中国革命的三大法宝，论述党的建设这一“伟大的工程”。'),
'中国革命和中国共产党':('认识国情，认识中国革命','提出新民主主义及新民主主义革命的概念，分析革命对象和动力。'),
'新民主主义论':('中国革命必须分两步走','阐述新民主主义的政治、经济和文化，论述共和国的国体、政体。'),
'改造我们的学习':('反对主观主义，整顿学风','1941年5月作报告，整风首先在党的高级干部中进行。'),
'整顿党的作风':('反对宗派主义，整顿党风','与《改造我们的学习》《反对党八股》结合，掌握整风三方面的对应关系。'),
'反对党八股':('反对党八股，整顿文风','1942年2月的讲演之一，整风运动在全党范围普遍展开。'),
'在延安文艺座谈会上的讲话':('文艺为人民大众服务','提出文艺为人民大众服务、为工农兵服务的方针。'),
'论联合政府':('三大作风与新民主主义纲领','概括理论联系实际、密切联系群众、批评与自我批评三大优良作风。'),
'在晋绥干部会议上的讲话':('完整表述新民主主义革命总路线','明确革命的领导、动力、对象，提出土地改革的总路线。'),
'将革命进行到底':('第一次公开使用人民民主专政概念','材料将这一论断与1949年《论人民民主专政》的系统阐述相联系。'),
'七届二中全会上的报告':('工作重心转移与“两个务必”','党的工作中心从乡村转向城市，继续保持谦虚谨慎和艰苦奋斗的作风。'),
'论人民民主专政':('以工农联盟为基础的人民民主专政','阐述工人阶级领导、工农联盟基础及新中国建设、外交等方面的主张。'),
}
places=json.loads((ROOT/'public/data/places.json').read_text())
placebyname={p['name']:p for p in places}
for e in events:
    if e['kind']=='writing':
        k=e['title'][1:-1];headline,summary=bookmeta[k];place=None
    elif e['title'] in summaries:
        headline,summary,place=summaries[e['title']]
    else:
        raise ValueError('Missing narration: '+e['title'])
    e.update(headline=headline,summary=summary,location=place or '全国 / 专题视角',coordinates=None,province=None)
    if place in placebyname:
        p=placebyname[place];e['coordinates']=[p['lng'],p['lat']]
        parent=p
        while parent and parent.get('level')!='province':parent=next((q for q in places if q['adcode']==parent.get('parent')),None)
        e['province']=parent['adcode'] if parent else None
    e['sort']=e.get('sort',e['year'])
    exact={'e-12':('1905年8月20日',1905+7/12+19/372),
           'e-15':('1911年10月10日',1911+9/12+9/372),
           'e-16':('1912年1月1日',1912),
           'e-35':('1931年9月18日',1931+8/12+17/372),
           'e-37':('1935年12月9日',1935+11/12+8/372),
           'e-38':('1936年10月',1936+9/12),
           'e-42':('1945年抗战胜利',1945+8/12+2/372),
           'e-47':('1949年',1949.999)}
    if e['id'] in exact:e['dateLabel'],e['sort']=exact[e['id']]
    e['duration']=max(9,min(15,round(len(e['summary'])/5)+2))
    e['sourceUrl']='/sources/history.pdf#page='+str(e['pages'][0])
    e['chapter']=0 if e['year']<1919 else 1 if e['year']<1927 else 2 if e['year']<1937 else 3 if e['year']<1945 else 4

events.sort(key=lambda e:(e['sort'],{'event':0,'meeting':1,'writing':2,'land':3}[e['kind']]))
assert len({e['id'] for e in events})==len(events)
assert all(e['original'] and e['summary'] and e['pages'] for e in events)
chapters=[dict(title=t,range=r,subtitle=s) for t,r,s in [
('山河变局','1840—1919','危机与救亡，探索民族出路'),
('星火初燃','1919—1927','新的思想，新的革命力量'),
('道路探索','1927—1937','从城市走向农村'),
('全民族抗战','1937—1945','团结抗战，迎来胜利'),
('走向新中国','1945—1949','从争取和平到协商建国')]]
out=dict(events=events,chapters=chapters,source='大李子专题总结资料',sourcePages=80,
         basemapSource='https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json',
         locationSource='https://geo.datav.aliyun.com/areas_v3/bound/all.json')
(ROOT/'public/data/history.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
shutil.copyfile(SOURCE,ROOT/'public/sources/history.pdf')
print('Extracted',len(events),'narrated scenes, including all 47 original timeline entries.')
print({k:sum(e['kind']==k for e in events) for k in ('event','meeting','writing','land')})
print('Geolocated',sum(bool(e['coordinates']) for e in events),'scenes from DataV place metadata.')
