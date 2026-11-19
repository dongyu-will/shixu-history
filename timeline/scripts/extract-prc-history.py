"""Extract post-1949 PRC history (Volume II) from timeline/public/sources/history.pdf
and merge 10 curated 考研政治史纲 supplemental core events into timeline/public/data/history-prc.json.
Requires PyMuPDF (fitz). Does not modify any Volume I (1840-1949) files.
"""
import json
import re
from pathlib import Path
import fitz

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/sources/history.pdf'
OUT = ROOT / 'public/data/history-prc.json'

compact = lambda s: re.sub(r'\s+', '', s or '')


def split_paragraphs(parts):
    out = []
    for part in parts:
        for line in (part or '').splitlines():
            line = compact(line)
            if not line:
                continue
            new = re.match(
                r'^(\d+[、.]|[①②③④⑤⑥⑦⑧⑨⑩]|\*|（[一二三四五六七八九十]+）|第[一二三四五六七八九十]+[、，]|首先|其次|最后|方针：|十大关系：)',
                line,
            )
            if new or not out:
                out.append(line)
            else:
                out[-1] += line
    assert compact(''.join(out)) == compact(''.join(parts))
    return out


doc = fitz.open(SOURCE)

# 1. Extract all 22 post-1949 meetings/writings from pages 14-20 (0-indexed 13..19).
raw_meetings = []
for p in range(13, 20):
    for table in doc[p].find_tables().tables:
        for row in table.extract():
            if len(row) < 2:
                continue
            name, body = compact(row[0]), row[1] or ''
            if name == '会议':
                continue
            if name and not re.match(r'^[（(]\d', name):
                if name.startswith('议》') and raw_meetings:
                    raw_meetings[-1]['title'] += name
                    raw_meetings[-1]['parts'].append(body)
                    raw_meetings[-1]['pages'].append(p + 1)
                else:
                    raw_meetings.append({'title': name, 'parts': [body], 'pages': [p + 1]})
            elif raw_meetings:
                raw_meetings[-1]['title'] += name
                raw_meetings[-1]['parts'].append(body)
                raw_meetings[-1]['pages'].append(p + 1)

assert len(raw_meetings) == 22, f'Expected 22 post-1949 meetings, got {len(raw_meetings)}'

# 2. Extract all 4 post-1949 land policies from pages 45-46 (0-indexed 44..45).
raw_lands = []
for p in range(44, 46):
    for table in doc[p].find_tables().tables:
        for row in table.extract():
            if len(row) != 3:
                continue
            period, name, body = map(lambda x: x or '', row)
            if compact(period) == '年代时期':
                continue
            if compact(name):
                raw_lands.append({'period': compact(period), 'title': compact(name), 'parts': [body], 'pages': [p + 1]})
            elif raw_lands and compact(body):
                raw_lands[-1]['parts'].append(body)
                raw_lands[-1]['pages'].append(p + 1)

raw_lands = [r for r in raw_lands if '1947' not in r['period']]
assert len(raw_lands) == 4, f'Expected 4 post-1949 land policies, got {len(raw_lands)}'

# Map extracted PDF entries by substring key for deterministic binding.
def take_meeting(key):
    for m in raw_meetings:
        if key in m['title']:
            return split_paragraphs(m['parts']), sorted(set(m['pages']))
    raise KeyError(f'Missing PDF meeting matching {key}')


def take_land(key):
    for r in raw_lands:
        if key in r['title']:
            return split_paragraphs(r['parts']), sorted(set(r['pages']))
    raise KeyError(f'Missing PDF land policy matching {key}')


PLACES = {
    '北京': ([116.405285, 39.904989], '北京市'),
    '丹东': ([124.383044, 40.124296], '辽宁省'),
    '上海': ([121.472644, 31.231706], '上海市'),
    '大庆': ([125.11272, 46.590734], '黑龙江省'),
    '凤阳': ([117.562461, 32.867146], '安徽省'),
    '深圳': ([114.085947, 22.547], '广东省'),
    '武汉': ([114.298572, 30.584355], '湖北省'),
    '香港': ([114.173355, 22.320048], '香港特别行政区'),
}


def node(
    *,
    id,
    kind,
    title,
    year,
    dateLabel,
    sort,
    chapter,
    headline,
    summary,
    location,
    placeKey=None,
    endYear=None,
    original,
    pages=None,
    sourceType='pdf',
):
    coords, province = PLACES[placeKey] if placeKey else (None, None)
    pages_list = pages or []
    return {
        'id': id,
        'volume': 'prc',
        'kind': kind,
        'title': title,
        'year': year,
        'dateLabel': dateLabel,
        'endYear': endYear,
        'original': original,
        'pages': pages_list,
        'sourceType': sourceType,
        'headline': headline,
        'summary': summary,
        'location': location,
        'coordinates': coords,
        'province': province,
        'sort': sort,
        'duration': 8,
        'sourceUrl': f'/sources/history.pdf#page={pages_list[0]}' if pages_list else None,
        'chapter': chapter,
    }


m_7_3, p_7_3 = take_meeting('七届三中全会')
m_ten, p_ten = take_meeting('论十大关系')
m_8th, p_8th = take_meeting('中共八大（1956')
m_8_2, p_8_2 = take_meeting('中共八大二次会议')
m_contradiction, p_contradiction = take_meeting('正确处理人民内部矛盾')
m_8_9, p_8_9 = take_meeting('八届九中全会')
m_3npc, p_3npc = take_meeting('第三届人大一次会议')
m_truth, p_truth = take_meeting('真理标准')
m_11_3, p_11_3 = take_meeting('十一届三中全会')
m_theory, p_theory = take_meeting('理论工作务虚会')
m_1981, p_1981 = take_meeting('若干历史问题的决议')
m_12th, p_12th = take_meeting('中共十二大')
m_13th, p_13th = take_meeting('中共十三大')
m_south, p_south = take_meeting('南方谈话')
m_14th, p_14th = take_meeting('中共十四大')
m_15th, p_15th = take_meeting('中共十五大')
m_16th, p_16th = take_meeting('中共十六大')
m_17th, p_17th = take_meeting('中共十七大')
m_18th, p_18th = take_meeting('中共十八大')
m_18_3, p_18_3 = take_meeting('十八届三中全会')
m_19th, p_19th = take_meeting('中共十九大')
m_20th, p_20th = take_meeting('中共二十大')

l_1950, pl_1950 = take_land('土地改革法')
l_1953, pl_1953 = take_land('农业集体化')
l_1978, pl_1978 = take_land('农村改革开放')
l_2017, pl_2017 = take_land('三权分置')

EVENTS = [
    # ================= Chapter 0 (全局第6章): 立国建制 (1949—1956) =================
    node(
        id='prc-m-1',
        kind='meeting',
        title='中共七届三中全会',
        year=1950,
        dateLabel='1950年6月',
        sort=1950.42,
        chapter=0,
        headline='不要四面出击，争取财经基本好转',
        summary='确定建国初期中心任务是在3年左右争取国家财政经济状况基本好转，制定“不要四面出击”的战略策略方针。',
        location='北京',
        placeKey='北京',
        original=m_7_3,
        pages=p_7_3,
        sourceType='pdf',
    ),
    node(
        id='prc-l-1',
        kind='land',
        title='《中华人民共和国土地改革法》',
        year=1950,
        dateLabel='1950年6月',
        sort=1950.49,
        chapter=0,
        headline='保存富农经济，彻底废除封建土地所有制',
        summary='由解放战争时期征收富农多余土地改为保存富农经济，废除地主阶级封建剥削的土地所有制，实行农民的土地所有制。',
        location='全国新解放区',
        original=l_1950,
        pages=pl_1950,
        sourceType='pdf',
    ),
    node(
        id='prc-e-1',
        kind='event',
        title='抗美援朝战争',
        year=1950,
        endYear=1953,
        dateLabel='1950年10月—1953年7月',
        sort=1950.79,
        chapter=0,
        headline='保家卫国的立国之战',
        summary='面对美国把战火烧到鸭绿江边并派遣第七舰队侵入台湾海峡，中共中央毅然作出抗美援朝决策。1953年7月迫使美方签署停战协定，赢得相对稳定的和平环境。',
        location='鸭绿江口岸·丹东',
        placeKey='丹东',
        sourceType='editorial_supplement',
        original=[
            '1、1950年6月朝鲜战争爆发，美国武装干涉朝鲜并派海军第七舰队开入台湾海峡，公然干涉中国内政，战火烧到鸭绿江边，严重威胁新中国国家安全。',
            '2、1950年10月，党中央和毛泽东以非凡胆略作出“抗美援朝、保家卫国”的历史性决策，中国人民志愿军跨过鸭绿江赴朝作战。',
            '3、经过艰苦作战和谈判斗争，1953年7月迫使美国代表在《朝鲜停战协定》上签字。',
            '4、伟大意义：①保卫了中国的国家安全，支援了朝鲜人民，为维护亚洲和世界和平作出重要贡献；②打破了美军不可战胜的神话，极大增强了中国人民的民族自信心和自豪感；③空前提高了新中国的国际威望，为国内经济建设和社会改革赢得了相对稳定的和平环境；④锻造出伟大抗美援朝精神。',
            '*易混辨析：抗美援朝打破了美军不可战胜的神话、沉重打击美国侵略扩张势头，但并未“结束美国在东方的霸权”。',
        ],
    ),
    node(
        id='prc-e-2',
        kind='event',
        title='过渡时期总路线与“一五”计划',
        year=1953,
        endYear=1957,
        dateLabel='1953年',
        sort=1953.08,
        chapter=0,
        headline='“一化三改”主体与两翼并进',
        summary='1953年提出“一化三改”过渡时期总路线，同步实施优先发展重工业的“一五”计划，开启有计划的社会主义工业化与系统改造。',
        location='北京',
        placeKey='北京',
        sourceType='editorial_supplement',
        original=[
            '1、过渡时期总路线（1953年正式提出）：要在一个相当长的时期内，逐步实现国家的社会主义工业化，并逐步实现国家对农业、对手工业和对资本主义工商业的社会主义改造（简称“一化三改”）。',
            '2、“一化”是主体，“三改”是两翼，二者相互促进，体现了发展生产力与变革生产关系的有机统一。',
            '3、着力进行和可能进行社会主义改造的主要原因：①社会主义性质的国营经济力量相对强大，是实现国家工业化的主要基础；②资本主义经济力量弱小、发展困难，不可能成为工业起飞的基础；③对个体农业进行社会主义改造，是保证工业发展、实现国家工业化的必要条件；④当时国际环境（资本主义国家封锁遏制、社会主义国家同情援助）促使中国选择社会主义道路。',
            '4、“一五”计划（1953—1957）：集中主要力量优先发展重工业，建立国家工业化和国防现代化的初步基础（如鞍钢、长春一汽、武汉长江大桥等）。',
        ],
    ),
    node(
        id='prc-e-3',
        kind='event',
        title='第一届全国人大与1954年宪法',
        year=1954,
        dateLabel='1954年9月',
        sort=1954.67,
        chapter=0,
        headline='人民代表大会制度与第一部社会主义类型宪法',
        summary='第一届全国人民代表大会第一次会议通过《中华人民共和国宪法》，以根本法形式确立人民代表大会制度，完善社会主义基本政治制度框架。',
        location='北京',
        placeKey='北京',
        sourceType='editorial_supplement',
        original=[
            '1、1954年9月，第一届全国人民代表大会第一次会议在北京召开，制定并通过了《中华人民共和国宪法》（“五四宪法”）。',
            '2、1954年宪法是我国第一部社会主义类型的宪法，贯穿人民民主原则和社会主义原则，明确规定“中华人民共和国的一切权力属于人民”。',
            '3、一届全国人大的召开，标志着人民代表大会制度这一根本政治制度在全国范围内正式确立。',
            '4、至此，加上1949年人民政协确立的中国共产党领导的多党合作和政治协商制度以及民族区域自治制度，中国社会主义政治制度体系基本建立，为随后经济制度变革奠定政治前提。',
        ],
    ),
    node(
        id='prc-l-2',
        kind='land',
        title='农业与手工业社会主义改造',
        year=1953,
        endYear=1956,
        dateLabel='1953—1956年',
        sort=1955.15,
        chapter=0,
        headline='自愿互利，互助组→初级社→高级社',
        summary='遵循自愿互利、典型示范、国家帮助原则，通过合作社经济这一过渡形式，分互助组、初级社、高级社三步把个体农业和手工业引向集体所有制。',
        location='全国农村',
        original=l_1953 + [
            '*补充（过渡经济形式）：新民主主义过渡时期，半社会主义性质的合作社经济是个体经济向社会主义集体经济过渡的形式；手工业改造同样经历供销小组、供销合作社到生产合作社的由低到高步骤。',
        ],
        pages=pl_1953,
        sourceType='pdf_expanded',
    ),
    node(
        id='prc-e-4',
        kind='event',
        title='资本主义工商业和平赎买',
        year=1953,
        endYear=1956,
        dateLabel='1953—1956年',
        sort=1955.7,
        chapter=0,
        headline='国家资本主义由低到高，和平实现公私合营',
        summary='对民族资本主义工商业实行利用、限制、改造与和平赎买政策，经初级国家资本主义、个别企业公私合营到全行业公私合营，创造世界社会主义史上的光辉胜利。',
        location='上海·全国主要城市',
        placeKey='上海',
        sourceType='editorial_supplement',
        original=[
            '1、改造政策：对官僚资本实行剥夺没收；对民族资本主义工商业实行“利用、限制、改造”和和平赎买政策，通过国家资本主义这一过渡形式逐步改造为社会主义国营经济。',
            '2、三大步骤与分配特征：①初级形式国家资本主义（加工订货、统购包销、经销代销），企业利润按“四马分肥”分配，具有社会主义因素；②高级形式第一步：个别企业公私合营，利润仍按“四马分肥”，具有半社会主义性质；③高级形式第二步：全行业公私合营，实行定股定息（年息5%），企业基本成为社会主义性质。',
            '3、和平赎买不仅把剥削者改造成为自食其力的劳动者，而且避免了社会动荡和生产力破坏，是马克思列宁主义同中国实际结合的伟大创造。',
        ],
    ),
    node(
        id='prc-e-5',
        kind='event',
        title='社会主义基本制度确立',
        year=1956,
        dateLabel='1956年底',
        sort=1956.95,
        chapter=0,
        headline='进入社会主义初级阶段的最主要标志',
        summary='1956年底生产资料私有制社会主义改造基本完成，社会主义基本经济制度继政治制度之后确立，实现了中华民族有史以来最为广泛而深刻的社会变革。',
        location='全国',
        placeKey='北京',
        sourceType='editorial_supplement',
        original=[
            '1、1956年底，我国对农业、手工业和资本主义工商业的社会主义改造基本完成，生产资料公有制成为我国社会的经济基础。',
            '2、最主要标志：继建立社会主义基本政治制度之后，社会主义基本经济制度的建立，标志着中国正式进入社会主义社会（社会主义初级阶段），开始进入全面建设社会主义的历史阶段。',
            '3、历史意义：社会主义基本制度的确立，是中国历史上最深刻最伟大的社会变革，为当代中国一切发展进步奠定了根本政治前提和制度基础，极大提高了工人阶级和广大劳动人民的积极性，为社会主义现代化开辟了道路。',
            '*高频区分：1949年新中国成立标志半殖民地半封建社会结束、新民主主义革命基本胜利；1956年三大改造完成才标志社会主义基本制度确立。',
        ],
    ),

    # ================= Chapter 1 (全局第7章): 艰辛探索 (1956—1976) =================
    node(
        id='prc-w-1',
        kind='writing',
        title='《论十大关系》',
        year=1956,
        dateLabel='1956年4月',
        sort=1956.28,
        chapter=1,
        headline='以苏为鉴、“第二次结合”，探索中国道路的良好开端',
        summary='毛泽东明确提出以苏为鉴、把马列主义同中国实际进行“第二次结合”，确立调动一切积极因素的基本方针，标志党探索中国自己社会主义建设道路的良好开端。',
        location='北京',
        placeKey='北京',
        original=m_ten + [
            '*真题要点：1956年4月毛泽东提出进行“第二次结合”，根本目的是找出在中国怎样建设社会主义的道路。',
        ],
        pages=p_ten,
        sourceType='pdf_expanded',
    ),
    node(
        id='prc-m-2',
        kind='meeting',
        title='中共八大',
        year=1956,
        dateLabel='1956年9月',
        sort=1956.69,
        chapter=1,
        headline='指明国内主要矛盾，在综合平衡中稳步前进',
        summary='正确分析社会主义改造完成后国内主要矛盾与主要任务，确立既反保守又反冒进、在综合平衡中稳步前进的经济建设方针，陈云提出“三个主体、三个补充”。',
        location='北京',
        placeKey='北京',
        original=m_8th,
        pages=p_8th,
        sourceType='pdf',
    ),
    node(
        id='prc-w-2',
        kind='writing',
        title='《关于正确处理人民内部矛盾的问题》',
        year=1957,
        dateLabel='1957年2月',
        sort=1957.15,
        chapter=1,
        headline='阐明社会主义社会基本矛盾与两类不同性质矛盾',
        summary='系统论述社会主义社会基本矛盾可通过制度本身自我解决，提出严格区分敌我矛盾与人民内部矛盾，把正确处理人民内部矛盾作为国家政治生活主题。',
        location='北京',
        placeKey='北京',
        original=m_contradiction,
        pages=p_contradiction,
        sourceType='pdf',
    ),
    node(
        id='prc-m-3',
        kind='meeting',
        title='中共八大二次会议与建设曲折',
        year=1958,
        dateLabel='1958年5月',
        sort=1958.38,
        chapter=1,
        headline='急于求成的“大跃进”与人民公社化曲折',
        summary='通过“鼓足干劲、力争上游、多快好省地建设社会主义”总路线，随后轻率发动“大跃进”和人民公社化运动，违背客观经济规律，带来严重教训。',
        location='北京',
        placeKey='北京',
        original=m_8_2,
        pages=p_8_2,
        sourceType='pdf',
    ),
    node(
        id='prc-m-4',
        kind='meeting',
        title='中共八届九中全会与经济调整',
        year=1961,
        dateLabel='1961年1月',
        sort=1961.05,
        chapter=1,
        headline='“调整、巩固、充实、提高”八字方针',
        summary='正式决定对国民经济实行“调整、巩固、充实、提高”方针，以此为起点，我国社会主义建设从“大跃进”轨道转入全面调整轨道。',
        location='北京',
        placeKey='北京',
        original=m_8_9,
        pages=p_8_9,
        sourceType='pdf',
    ),
    node(
        id='prc-m-5',
        kind='meeting',
        title='三届人大一次会议与“四个现代化”',
        year=1964,
        dateLabel='1964年12月',
        sort=1964.95,
        chapter=1,
        headline='周恩来正式提出建设“四个现代化”战略目标',
        summary='周恩来在政府工作报告中正式宣布分两步把我国建设成为具有现代农业、现代工业、现代国防和现代科学技术的社会主义强国。',
        location='北京',
        placeKey='北京',
        original=m_3npc,
        pages=p_3npc,
        sourceType='pdf',
    ),
    node(
        id='prc-e-6',
        kind='event',
        title='独立工业体系与“两弹一星”',
        year=1964,
        endYear=1976,
        dateLabel='1956—1976年',
        sort=1970.31,
        chapter=1,
        headline='艰辛探索中建立独立工业骨架与国防科技里程碑',
        summary='全面建设社会主义时期虽经历严重曲折，但总体成就巨大：建立起独立的、比较完整的工业体系和国民经济体系，大庆油田投产，成功研制“两弹一星”。',
        location='东北·西北核航天基地',
        placeKey='大庆',
        sourceType='editorial_supplement',
        original=[
            '1、1956—1976年全面建设社会主义时期，党领导人民顶住外部封锁压力、克服严重曲折，取得奠基性的巨大成就。',
            '2、四大成就表现（真题高频）：①建立了独立的、比较完整的工业体系和国民经济体系（如大庆油田摘掉“贫油国”帽子、三线建设优化工业布局）；②人民生活水平提高，文化、教育、医疗、科技事业显著发展；③国际地位提高与国际环境改善；④在探索中形成了建设社会主义的若干重要原则。',
            '3、“两弹一星”里程碑：1964年10月第一颗原子弹爆炸成功，1967年6月第一颗氢弹空爆试验成功，1970年4月第一颗人造地球卫星“东方红一号”发射成功，大幅提升国防实力与大国地位。',
        ],
    ),
    node(
        id='prc-e-7',
        kind='event',
        title='恢复联合国合法席位与外交突破',
        year=1971,
        endYear=1972,
        dateLabel='1971—1972年',
        sort=1971.81,
        chapter=1,
        headline='重返联合国舞台，打开对外关系新局面',
        summary='1971年10月第26届联大通过2758号决议恢复中华人民共和国在联合国的一切合法权利；1972年尼克松访华与中日建交，极大改善新中国外部环境。',
        location='北京·国际舞台',
        placeKey='北京',
        sourceType='editorial_supplement',
        original=[
            '1、1971年10月25日，第26届联合国大会以压倒多数通过第2758号决议，恢复中华人民共和国在联合国的一切合法权利，包括安理会常任理事国席位。',
            '2、1972年2月美国总统尼克松访华，中美发表《上海公报》，两国关系开始走向正常化（1979年1月1日正式建交）；1972年9月中日实现邦交正常化。',
            '3、外交破局不仅标志着美国孤立中国政策彻底破产，更显著提高了中国的国际地位，为随后改革开放营造了有利的国际环境。',
        ],
    ),

    # ================= Chapter 2 (全局第8章): 改革开放 (1978—2012) =================
    node(
        id='prc-e-8',
        kind='event',
        title='真理标准问题大讨论',
        year=1978,
        dateLabel='1978年5月',
        sort=1978.36,
        chapter=2,
        headline='实践是检验真理的唯一标准，思想解放先导',
        summary='针对“两个凡是”错误方针展开深刻广泛的马克思主义思想解放运动，重新确立实事求是思想基础，成为拨乱反正和改革开放的思想先导。',
        location='北京·全国',
        placeKey='北京',
        original=m_truth,
        pages=p_truth,
        sourceType='pdf',
    ),
    node(
        id='prc-m-6',
        kind='meeting',
        title='中共十一届三中全会',
        year=1978,
        dateLabel='1978年12月',
        sort=1978.96,
        chapter=2,
        headline='实现伟大转折，开启改革开放和现代化建设新时期',
        summary='彻底否定“两个凡是”，重新确立马克思主义思想、政治、组织路线，把党和国家工作中心转移到经济建设上来、实行改革开放，实现建国以来具有深远意义的伟大转折。',
        location='北京',
        placeKey='北京',
        original=m_11_3 + [
            '*补充（改革开放决策依据）：基于对党和国家前途命运的深刻把握、对社会主义革命和建设实践的深刻总结、对时代潮流的深刻洞察、对人民群众期盼和需要的深刻体悟。',
        ],
        pages=p_11_3,
        sourceType='pdf_expanded',
    ),
    node(
        id='prc-l-3',
        kind='land',
        title='小岗村与家庭联产承包责任制',
        year=1978,
        endYear=1982,
        dateLabel='1978年11月—1982年',
        sort=1979.05,
        chapter=2,
        headline='农村改革率先突破，所有权与经营权分离',
        summary='直面人民公社体制弊端与农民温饱问题，安徽凤阳小岗村率先“大包干”；1982年中央一号文件正式肯定包产到户，实现土地集体所有权与家庭经营权分离。',
        location='安徽凤阳·小岗村',
        placeKey='凤阳',
        original=l_1978 + [
            '*真题背景：农村改革起步时面临两大突出问题——“政社合一”的人民公社体制亟待改革、一亿多农民温饱问题尚未完全解决（注：土地改革早在1952年底基本完成，乡镇企业是80年代改革后兴起的）。',
        ],
        pages=pl_1978,
        sourceType='pdf_expanded',
    ),
    node(
        id='prc-m-7',
        kind='meeting',
        title='理论工作务虚会与四项基本原则',
        year=1979,
        dateLabel='1979年3月',
        sort=1979.24,
        chapter=2,
        headline='首次提出四项基本原则（立国之本）',
        summary='邓小平在党的理论工作务虚会上旗帜鲜明提出必须坚持社会主义道路、人民民主专政、共产党领导、马列主义毛泽东思想四项基本原则。',
        location='北京',
        placeKey='北京',
        original=m_theory,
        pages=p_theory,
        sourceType='pdf',
    ),
    node(
        id='prc-e-9',
        kind='event',
        title='经济特区与梯度对外开放',
        year=1980,
        endYear=1990,
        dateLabel='1979—1990年',
        sort=1980.62,
        chapter=2,
        headline='从四大经济特区到浦东开发开放的梯度突破',
        summary='1979年颁布中外合资法、1980年设深圳/珠海/汕头/厦门四大经济特区并恢复世行/IMF代表权，继而开放14个沿海城市、设立海南特区、1990年开发开放浦东。',
        location='深圳·东南沿海·上海浦东',
        placeKey='深圳',
        sourceType='editorial_supplement',
        original=[
            '1、起步突破（1979—1980）：1979年7月颁布《中外合资经营企业法》；1980年恢复我国在世界银行、国际货币基金组织的代表权；1980年正式在深圳、珠海、汕头、厦门设立经济特区，成为对外开放的窗口和试验田。',
            '2、沿线拓展（1984—1988）：1984年进一步开放大连、天津、上海、广州等14个沿海港口城市；1985年开辟长江三角洲、珠江三角洲、闽南三角地区等沿海经济开放区；1988年建立海南省并划为最大经济特区。',
            '3、龙头带动（1990）：党中央决定开发开放上海浦东，带动长江三角洲和整个长江流域经济飞跃。',
            '4、格局形成：逐步形成“经济特区—沿海开放城市—沿海经济开放区—内地”由点到线、由线到面的多层次、有重点、点面结合的对外开放格局。',
        ],
    ),
    node(
        id='prc-m-8',
        kind='meeting',
        title='十一届六中全会与1981《历史决议》',
        year=1981,
        dateLabel='1981年6月',
        sort=1981.48,
        chapter=2,
        headline='科学评价毛泽东与毛泽东思想，完成指导思想拨乱反正',
        summary='通过《关于建国以来党的若干历史问题的决议》，彻底否定“文化大革命”，科学确立毛泽东历史地位并概括毛泽东思想活的灵魂，强调各项工作服从服务于经济建设。',
        location='北京',
        placeKey='北京',
        original=m_1981 + [
            '*真题要点：《决议》把毛泽东思想活的灵魂概括为实事求是、群众路线、独立自主；强调党和国家各项工作都必须服从和服务于经济建设这个中心。',
        ],
        pages=p_1981,
        sourceType='pdf_expanded',
    ),
    node(
        id='prc-m-9',
        kind='meeting',
        title='中共十二大',
        year=1982,
        dateLabel='1982年9月',
        sort=1982.67,
        chapter=2,
        headline='首次提出“建设有中国特色的社会主义”',
        summary='邓小平在十二大开幕词中响亮提出“走自己的道路，建设有中国特色的社会主义”，成为整个改革开放和现代化建设全部理论与实践的主题。',
        location='北京',
        placeKey='北京',
        original=m_12th,
        pages=p_12th,
        sourceType='pdf',
    ),
    node(
        id='prc-m-10',
        kind='meeting',
        title='中共十三大',
        year=1987,
        dateLabel='1987年10月',
        sort=1987.81,
        chapter=2,
        headline='社会主义初级阶段理论、“一个中心、两个基本点”与“三步走”',
        summary='系统阐述社会主义初级阶段理论，完整概括党在初级阶段“一个中心、两个基本点”的基本路线，制定现代化建设“三步走”发展战略。',
        location='北京',
        placeKey='北京',
        original=m_13th,
        pages=p_13th,
        sourceType='pdf',
    ),
    node(
        id='prc-w-3',
        kind='writing',
        title='邓小平南方谈话',
        year=1992,
        dateLabel='1992年1—2月',
        sort=1992.08,
        chapter=2,
        headline='武昌→深圳→珠海→上海，破除姓“资”姓“社”束缚',
        summary='邓小平视察南方发表重要谈话，阐明计划和市场都是经济手段、革命和改革都是解放生产力、社会主义本质与“三个有利于”标准，推动改革开放进入新阶段。',
        location='武昌·深圳·珠海·上海',
        placeKey='武汉',
        original=m_south,
        pages=p_south,
        sourceType='pdf',
    ),
    node(
        id='prc-m-11',
        kind='meeting',
        title='中共十四大与市场经济体制',
        year=1992,
        dateLabel='1992年10月',
        sort=1992.78,
        chapter=2,
        headline='确立社会主义市场经济体制改革目标',
        summary='明确我国经济体制改革的目标是建立社会主义市场经济体制，坚持社会主义基本制度与市场经济结合；国有企业改革成为建立市场经济体制的中心环节。',
        location='北京',
        placeKey='北京',
        original=m_14th + [
            '*真题要点：十四大确立社会主义市场经济体制改革目标后，建立社会主义市场经济体制的中心环节是国有企业改革（建立现代企业制度）。',
        ],
        pages=p_14th,
        sourceType='pdf_expanded',
    ),
    node(
        id='prc-m-12',
        kind='meeting',
        title='中共十五大与港澳回归',
        year=1997,
        endYear=1999,
        dateLabel='1997—1999年',
        sort=1997.70,
        chapter=2,
        headline='邓小平理论写入党章，“一国两制”成功实践',
        summary='1997年十五大确立邓小平理论为党的指导思想，明确初级阶段基本经济制度与依法治国方略；1997年7月香港回归、1999年12月澳门回归，“一国两制”成为现实。',
        location='北京·香港·澳门',
        placeKey='香港',
        original=m_15th + [
            '*补充（港澳回归）：1997年7月1日中国政府恢复对香港行使主权，1999年12月20日恢复对澳门行使主权，洗雪百年国耻，标志着“一国两制”伟大构想取得历史性成功。',
        ],
        pages=p_15th,
        sourceType='pdf_expanded',
    ),
    node(
        id='prc-e-10',
        kind='event',
        title='中国加入世界贸易组织（WTO）',
        year=2001,
        dateLabel='2001年12月',
        sort=2001.94,
        chapter=2,
        headline='对外开放进入新阶段，深度融入经济全球化',
        summary='2001年12月中国正式成为世界贸易组织第143个成员，标志着对外开放进入历史新阶段，推动中国由“引进来”为主迈向“引进来”与“走出去”并重。',
        location='全国·沿海开放口岸',
        placeKey='上海',
        sourceType='editorial_supplement',
        original=[
            '1、2001年12月11日，历经15年艰苦谈判，中国正式加入世界贸易组织（WTO），成为第143个成员。',
            '2、历史意义：标志着中国对外开放进入了一个新的阶段，实现了从局部领域开放到全方位、多层次、宽领域开放的历史性跨越。',
            '3、时间考点（真题易混）：加入WTO在2001年（中共十五大之后、十六大之前），因此“截至党的十五大召开前（1997年）”的对外开放突破不包含加入WTO。',
        ],
    ),
    node(
        id='prc-m-13',
        kind='meeting',
        title='中共十六大',
        year=2002,
        dateLabel='2002年11月',
        sort=2002.86,
        chapter=2,
        headline='“三个代表”重要思想写入党章，全面建设小康社会',
        summary='将“三个代表”重要思想确立为党的指导思想，总结中国特色社会主义基本经验，明确本世纪头二十年全面建设小康社会的奋斗目标。',
        location='北京',
        placeKey='北京',
        original=m_16th,
        pages=p_16th,
        sourceType='pdf',
    ),
    node(
        id='prc-m-14',
        kind='meeting',
        title='中共十七大',
        year=2007,
        dateLabel='2007年10月',
        sort=2007.79,
        chapter=2,
        headline='深入贯彻落实科学发展观',
        summary='首次概括中国特色社会主义理论体系，全面阐述科学发展观的科学内涵与精神实质，提出实现全面建设小康社会奋斗目标的新要求。',
        location='北京',
        placeKey='北京',
        original=m_17th,
        pages=p_17th,
        sourceType='pdf',
    ),

    # ================= Chapter 3 (全局第9章): 迈向新时代 (2012—新时代) =================
    node(
        id='prc-m-15',
        kind='meeting',
        title='中共十八大',
        year=2012,
        dateLabel='2012年11月',
        sort=2012.86,
        chapter=3,
        headline='“五位一体”总体布局与“两个一百年”，开启新时代',
        summary='阐明中国特色社会主义总依据、总布局（五位一体）和总任务，明确“两个一百年”奋斗目标，中国特色社会主义进入新时代。',
        location='北京',
        placeKey='北京',
        original=m_18th,
        pages=p_18th,
        sourceType='pdf',
    ),
    node(
        id='prc-m-16',
        kind='meeting',
        title='中共十八届三中全会',
        year=2013,
        dateLabel='2013年11月',
        sort=2013.86,
        chapter=3,
        headline='全面深化改革的划时代里程碑',
        summary='明确全面深化改革总目标是完善和发展中国特色社会主义制度、推进国家治理体系和治理能力现代化，实现改革由局部探索、破冰突围到系统集成、全面深化的转变。',
        location='北京',
        placeKey='北京',
        original=m_18_3,
        pages=p_18_3,
        sourceType='pdf',
    ),
    node(
        id='prc-m-17',
        kind='meeting',
        title='中共十九大',
        year=2017,
        dateLabel='2017年10月',
        sort=2017.80,
        chapter=3,
        headline='确立新时代指导思想，作出社会主要矛盾转化论断',
        summary='把习近平新时代中国特色社会主义思想确立为党的指导思想，指出我国社会主要矛盾转化为人民日益增长的美好生活需要和不平衡不充分的发展之间的矛盾，部署两步走战略。',
        location='北京',
        placeKey='北京',
        original=m_19th,
        pages=p_19th,
        sourceType='pdf',
    ),
    node(
        id='prc-l-4',
        kind='land',
        title='农村“三权分置”与全面小康',
        year=2017,
        endYear=2021,
        dateLabel='2017—2021年',
        sort=2020.5,
        chapter=3,
        headline='所有权、承包权、经营权分置并行，历史性消除绝对贫困',
        summary='推行农村土地“三权分置”重大制度创新，第二轮土地承包到期后再延长30年；2021年打赢脱贫攻坚战、如期全面建成小康社会，实现第一个百年奋斗目标。',
        location='全国农村',
        original=l_2017 + [
            '*补充（脱贫攻坚与全面小康）：经过新时代8年持续奋斗，2020年底现行标准下农村贫困人口全部脱贫，2021年7月1日庄严宣告在中华大地上全面建成小康社会，历史性地解决了绝对贫困问题，实现了第一个百年奋斗目标。',
        ],
        pages=pl_2017,
        sourceType='pdf_expanded',
    ),
    node(
        id='prc-m-18',
        kind='meeting',
        title='十九届六中全会与第三个历史决议',
        year=2021,
        dateLabel='2021年11月',
        sort=2021.86,
        chapter=3,
        headline='总结百年奋斗重大成就与历史经验',
        summary='审议通过《中共中央关于党的百年奋斗重大成就和历史经验的决议》，确立“两个确立”的决定性意义，系统概括中国共产党百年奋斗的五大历史意义与“十个坚持”历史经验。',
        location='北京',
        placeKey='北京',
        sourceType='editorial_supplement',
        original=[
            '1、2021年11月，党的十九届六中全会审议通过了党的历史上第三个历史决议——《中共中央关于党的百年奋斗重大成就和历史经验的决议》。',
            '2、突出亮点：着重总结新时代党和国家事业取得的历史性成就、发生的历史性变革；强调“两个确立”（确立习近平同志党中央的核心、全党的核心地位，确立习近平新时代中国特色社会主义思想的指导地位）对推进中华民族伟大复兴历史进程具有决定性意义。',
            '3、系统概括：从五个方面概括中国共产党百年奋斗的历史意义，总结“十个坚持”的宝贵历史经验（坚持党的领导、坚持人民至上、坚持理论创新、坚持独立自主、坚持中国道路、坚持胸怀天下、坚持开拓创新、坚持敢于斗争、坚持统一战线、坚持自我革命）。',
            '4、三个历史决议一脉相承：1945年六届七中全会（革命时期）→ 1981年十一届六中全会（改革开放初期）→ 2021年十九届六中全会（建党百年新时代）。',
        ],
    ),
    node(
        id='prc-m-19',
        kind='meeting',
        title='中共二十大与中国式现代化',
        year=2022,
        dateLabel='2022年10月',
        sort=2022.79,
        chapter=3,
        headline='以中国式现代化全面推进中华民族伟大复兴',
        summary='明确新时代新征程党的中心任务是以中国式现代化全面推进中华民族伟大复兴，系统阐述中国式现代化的五个中国特色与本质要求，强调以党的自我革命引领社会革命。',
        location='北京',
        placeKey='北京',
        pages=p_20th,
        sourceType='pdf_expanded',
        original=[
            '1、中心任务：团结带领全国各族人民全面建成社会主义现代化强国、实现第二个百年奋斗目标，以中国式现代化全面推进中华民族伟大复兴。',
            '2、中国式现代化的五个中国特色：人口规模巨大的现代化、全体人民共同富裕的现代化、物质文明和精神文明相协调的现代化、人与自然和谐共生的现代化、走和平发展道路的现代化。',
            '3、理论创新与一脉相承：从毛泽东思想到中国特色社会主义理论体系再到习近平新时代中国特色社会主义思想，马克思主义中国化时代化的理论成果都贯穿实事求是、群众路线、独立自主的立场观点方法，科学回答时代课题、丰富发展马克思主义。',
            '4、党的自我革命：勇于自我革命是中国共产党区别于其他政党的显著标志，是我们党跳出治乱兴衰历史周期率的第二个答案，必须以党的自我革命引领社会革命。',
        ],
    ),
]

EVENTS.sort(key=lambda e: (e['chapter'], e['sort']))
assert len(EVENTS) == 36, f'Expected 36 PRC events, got {len(EVENTS)}'
assert len({e['id'] for e in EVENTS}) == 36, 'Duplicate event IDs'

CHAPTERS = [
    {'title': '立国建制', 'range': '1949—1956'},
    {'title': '艰辛探索', 'range': '1956—1976'},
    {'title': '改革开放', 'range': '1978—2012'},
    {'title': '迈向新时代', 'range': '2012—新时代'},
]

payload = {
    'volume': 'prc',
    'title': '新中国史（1949—新时代）',
    'events': EVENTS,
    'chapters': CHAPTERS,
    'source': '大李子重点会议与土地政策专题总结（1950—2022）及统编《中国近现代史纲要》高频考点编撰',
    'sourcePages': len(doc),
    'basemapSource': 'DataV GeoAtlas 现代中国行政区划示意底图',
    'locationSource': 'DataV 现代行政中心坐标与专题示意锚点',
}

OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
counts = [sum(1 for e in EVENTS if e['chapter'] == c) for c in range(len(CHAPTERS))]
kinds = {}
sources = {}
for e in EVENTS:
    kinds[e['kind']] = kinds.get(e['kind'], 0) + 1
    sources[e['sourceType']] = sources.get(e['sourceType'], 0) + 1
print(f'Wrote {len(EVENTS)} PRC events -> {OUT}')
print('Per chapter [0..3]:', counts)
print('Kinds:', kinds)
print('Source types:', sources)
