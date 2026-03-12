import type { UserProfile } from './userProfile'
import { getAgeAtYear, placeMatchesKeywords } from './userProfile'

export interface HistoricalSourceLink {
  label: string
  url: string
}

export interface HistoricalProfile {
  id: string
  name: string
  title: string
  eventTitle: string
  eventYear: number
  eraLabel: string
  locationLabel: string
  significance: string
  summary: string
  firstPersonNarrative: string
  encounterPrompt: string
  perspectiveNote: string
  keywords: string[]
  locationKeywords?: string[]
  sourceLinks: HistoricalSourceLink[]
}

export const historicalProfiles: HistoricalProfile[] = [
  {
    id: 'peng-zhuying',
    name: '彭竹英',
    title: '侵华日军“慰安妇”制度幸存者口述者',
    eventTitle: '抗日战争时期战争暴行记忆',
    eventYear: 1943,
    eraLabel: '1930年代至1940年代',
    locationLabel: '湖南岳阳平江一带',
    significance:
      '她的口述让战争中的性暴力与殖民压迫不再停留在抽象概念，而成为必须被记住的个人历史。',
    summary:
      '彭竹英是公开留下口述资料的幸存者之一。她的证言被整理进纪实资料与纪念活动中，成为研究侵华日军“慰安妇”制度的重要见证。',
    firstPersonNarrative:
      '我是从苦难里活下来的人。很多年里，我一直记着那段被强迫、被羞辱、也无法轻易开口的日子。到了晚年，我还是决定把经历讲出来，因为如果我们不说，后人就更难知道战争到底伤害了多少普通人。',
    encounterPrompt:
      '当你在地图里遇见她，听到的不只是一个人的受难，也是一个民族要求历史被如实记住的声音。',
    perspectiveNote:
      '以下第一人称内容依据公开口述资料整理，为尊重幸存者经历，未采用过度细节化呈现。',
    keywords: ['战争', '记忆', '女性', '创伤', '历史', '见证', '家庭', '故乡'],
    locationKeywords: ['湖南', '岳阳', '平江'],
    sourceLinks: [
      {
        label: '人民日报：让历史记忆长久传承',
        url: 'http://society.people.com.cn/n1/2025/0814/c1008-40539425.html',
      },
    ],
  },
  {
    id: 'zhao-zhong',
    name: '赵忠',
    title: '抗美援朝前线译电员',
    eventTitle: '抗美援朝战争',
    eventYear: 1952,
    eraLabel: '1952年起',
    locationLabel: '志愿军第67军通信岗位',
    significance:
      '他代表了战场上大量并不站在聚光灯下、却维系部队运转的通信兵与后勤兵群体。',
    summary:
      '赵忠1935年出生，1952年参军，在抗美援朝前线担任译电员。公开报道中，他回忆了年轻时在战场上承担通信任务的经历。',
    firstPersonNarrative:
      '我那时年纪很轻，穿上军装以后，最深的感受就是要把前线和后方连起来。很多人记得冲锋，我更记得信息不能断、战友不能散。我们那一代人把“保家卫国”看得很重，所以后来回想起来，苦是苦，但心里一直是硬的。',
    encounterPrompt:
      '如果你在节点边偶遇这位老兵，地图会提醒你：真正撑起历史的，常常是那些默默完成岗位的人。',
    perspectiveNote:
      '第一人称内容根据退役军人事务系统公开采访整理，为概括性转述。',
    keywords: ['抗美援朝', '志愿军', '战争', '前线', '军人', '保家卫国', '奋斗', '集体'],
    sourceLinks: [
      {
        label: '中华人民共和国退役军人事务部：赵忠',
        url: 'https://www.mva.gov.cn/xinwen/dfdt/202010/t20201029_42162.html',
      },
    ],
  },
  {
    id: 'hou-bo',
    name: '侯波',
    title: '开国大典现场摄影见证者',
    eventTitle: '中华人民共和国成立',
    eventYear: 1949,
    eraLabel: '1949年10月1日',
    locationLabel: '北京天安门',
    significance:
      '她用镜头记录了开国大典等重要时刻，让“新中国成立”从宏大叙事变成可被看见的历史现场。',
    summary:
      '侯波长期担任摄影工作，留下了大量新中国成立初期的重要影像。她是开国大典现场的重要见证者之一。',
    firstPersonNarrative:
      '站在天安门附近按下快门时，我知道眼前的一切很重要，但真正震动我的，是那种“一个新时代真的开始了”的感觉。后来很多年，人们通过照片回看那一天，我也因此一次次回到那个现场。',
    encounterPrompt:
      '与她相遇时，你会发现历史不仅靠文字记住，也靠一张张照片把时代定格。',
    perspectiveNote:
      '第一人称内容根据公开回忆报道整理，为概括性转述。',
    keywords: ['开国大典', '新中国成立', '摄影', '北京', '国家', '时代', '记忆', '城市'],
    locationKeywords: ['北京'],
    sourceLinks: [
      {
        label: '人民网：中国摄影大师侯波追思会',
        url: 'http://cpc.people.com.cn/GB/64093/64094/6902930.html',
      },
    ],
  },
  {
    id: 'he-yanling',
    name: '何燕凌',
    title: '开国大典现场记者',
    eventTitle: '中华人民共和国成立',
    eventYear: 1949,
    eraLabel: '1949年10月1日',
    locationLabel: '北京天安门广场',
    significance:
      '他代表着亲历新中国诞生、并将这一时刻写给全国读者的新闻记录者。',
    summary:
      '何燕凌曾参与报道开国大典。公开回忆中，他讲述了当时在现场采访、记录与见证国家诞生的感受。',
    firstPersonNarrative:
      '那天站在人群与队列之间，我心里最强烈的念头不是“我要写一篇稿子”，而是“我要把这一天认真记下来”。因为我很清楚，很多人一辈子都等着看见这样的时刻。',
    encounterPrompt:
      '当地图把他安排在某个节点旁边，你读到的是新闻人的现场感，也是时代第一次被写成当天新闻的激动。',
    perspectiveNote:
      '第一人称内容根据中国记协公开文章整理，为概括性转述。',
    keywords: ['开国大典', '记者', '新中国成立', '城市', '国家', '新闻', '记录', '时代'],
    locationKeywords: ['北京'],
    sourceLinks: [
      {
        label: '中国记协网：何燕凌回忆开国大典采访',
        url: 'http://www.zgjx.cn/2019-09/26/c_138422840.htm',
      },
    ],
  },
  {
    id: 'qi-farui',
    name: '戚发轫',
    title: '中国载人航天亲历者',
    eventTitle: '神舟五号载人飞行成功',
    eventYear: 2003,
    eraLabel: '2003年',
    locationLabel: '中国载人航天工程现场',
    significance:
      '他代表着看见中国人第一次进入太空并成功返回的科技工作者群体，是国家科技跨越的重要见证者。',
    summary:
      '戚发轫是中国载人航天工程的重要亲历者之一。公开报道中，他回顾了从东方红一号到神舟五号成功背后的长期奋斗。',
    firstPersonNarrative:
      '神舟五号成功那一刻，对我们来说不是一天的胜利，而是很多年终于走到结果。看着杨利伟平安归来，我心里最重的一块石头才算真正落地，也第一次真切感到中国载人航天站稳了。',
    encounterPrompt:
      '在地图里遇见他，像是在告诉晚辈：宏大的突破，往往靠几十年如一日的技术积累。',
    perspectiveNote:
      '第一人称内容根据中国载人航天工程公开回顾整理，为概括性转述。',
    keywords: ['航天', '神舟五号', '杨利伟', '科技', '国家', '工程', '梦想', '青年'],
    sourceLinks: [
      {
        label: '中国载人航天：戚发轫讲述五十年飞天路',
        url: 'https://www.cmse.gov.cn/gfgg/zgzrxthd/201804/t20180404_22468.html',
      },
    ],
  },
  {
    id: 'feng-wei',
    name: '冯维',
    title: '汶川地震幸存者与重建亲历者',
    eventTitle: '2008年汶川地震',
    eventYear: 2008,
    eraLabel: '2008年及之后',
    locationLabel: '四川北川',
    significance:
      '她代表了灾后重建中“活下来并继续生活”的普通人，体现了灾难记忆与地方重建的连续性。',
    summary:
      '冯维是北川地震幸存者。公开报道记录了她在灾难后重返生活、见证家园变化的经历。',
    firstPersonNarrative:
      '地震以后，我最怕的不是回忆，而是怕故乡再也回不来了。后来一点点重建起来，我才慢慢明白，记住伤痛不是为了停在原地，而是为了带着失去的人继续把日子往前过。',
    encounterPrompt:
      '如果你在地图某一站遇见她，画面会从废墟感慢慢过渡到重建后的街道，提醒人们灾难之后仍然有人在认真生活。',
    perspectiveNote:
      '第一人称内容根据国防部新闻报道整理，为概括性转述。',
    keywords: ['汶川地震', '地震', '重建', '故乡', '坚韧', '灾难', '家园', '恢复'],
    locationKeywords: ['四川', '北川', '绵阳', '成都', '汶川', '阿坝'],
    sourceLinks: [
      {
        label: '国防部网：北川地震幸存者冯维',
        url: 'http://www.mod.gov.cn/big5/gfbw/jsxd/4923871.html',
      },
    ],
  },
  {
    id: 'cheng-qiang',
    name: '程强',
    title: '汶川地震获救少年与空降兵',
    eventTitle: '2008年汶川地震后的成长记忆',
    eventYear: 2008,
    eraLabel: '2008年至今',
    locationLabel: '四川与空降兵部队',
    significance:
      '他把灾难中的被救助者身份，转化成后来主动守护他人的军人身份，具有鲜明的时代象征性。',
    summary:
      '程强在汶川地震中获救，后来成长为空降兵。公开报道把他的经历视作灾后代际成长与国家救援记忆的一种延续。',
    firstPersonNarrative:
      '小时候我是在灾难里被人救出来的，所以长大后我一直想，等我有能力的时候，也要站到能保护别人的位置上。地震没有从我生命里消失，但它让我更明白“被托住”意味着什么。',
    encounterPrompt:
      '在平面地图上遇见他时，节点会像一条从废墟通往训练场的支线，让“被救”与“去守护别人”连成一条时间线。',
    perspectiveNote:
      '第一人称内容根据新华社公开报道整理，为概括性转述。',
    keywords: ['汶川地震', '少年', '空降兵', '救援', '成长', '家园', '坚韧', '青年'],
    locationKeywords: ['四川', '北川', '绵阳', '成都', '汶川', '阿坝'],
    sourceLinks: [
      {
        label: '新华社客户端：程强，从灾区少年到空降兵',
        url: 'https://h.xinhuaxmt.com/vh512/share/11472209?docid=11472209',
      },
    ],
  },
]

function scoreAgeAlignment(profile: HistoricalProfile, userProfile: UserProfile) {
  const ageAtEvent = getAgeAtYear(userProfile, profile.eventYear)

  if (ageAtEvent === null) {
    return 0
  }

  if (ageAtEvent < 0) {
    return 0
  }

  if (ageAtEvent <= 12) {
    return 6
  }

  if (ageAtEvent <= 25) {
    return 8
  }

  if (ageAtEvent <= 45) {
    return 6
  }

  if (ageAtEvent <= 65) {
    return 4
  }

  return 2
}

function scoreLocationAlignment(profile: HistoricalProfile, userProfile: UserProfile) {
  if (!profile.locationKeywords?.length) {
    return 0
  }

  const relevantPlaces = [userProfile.birthPlace, userProfile.hometown].filter(Boolean)
  const hasMatch = relevantPlaces.some((place) =>
    placeMatchesKeywords(place, profile.locationKeywords ?? []),
  )

  return hasMatch ? 5 : 0
}

function scoreQueryAlignment(profile: HistoricalProfile, query: string) {
  const normalizedQuery = query.toLowerCase()

  return profile.keywords.reduce(
    (total, keyword) => total + (normalizedQuery.includes(keyword.toLowerCase()) ? 3 : 0),
    0,
  )
}

export function buildFeaturedHistoricalEncounters(
  userProfile: UserProfile,
  queries: string[],
  count: number,
) {
  const picked: HistoricalProfile[] = []
  const usedIds = new Set<string>()

  queries.forEach((query) => {
    const scored = historicalProfiles
      .filter((profile) => !usedIds.has(profile.id))
      .map((profile) => ({
        profile,
        score:
          scoreQueryAlignment(profile, query)
          + scoreAgeAlignment(profile, userProfile)
          + scoreLocationAlignment(profile, userProfile),
      }))
      .sort((left, right) => right.score - left.score)

    const match = scored[0]?.profile
    if (!match) {
      return
    }

    picked.push(match)
    usedIds.add(match.id)
  })

  if (picked.length >= count) {
    return picked.slice(0, count)
  }

  historicalProfiles
    .map((profile) => ({
      profile,
      score:
        scoreAgeAlignment(profile, userProfile)
        + scoreLocationAlignment(profile, userProfile),
    }))
    .sort((left, right) => right.score - left.score)
    .forEach(({ profile }) => {
      if (picked.length >= count || usedIds.has(profile.id)) {
        return
      }

      picked.push(profile)
      usedIds.add(profile.id)
    })

  return picked
}
