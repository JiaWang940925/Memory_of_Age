import type { UserProfile } from './userProfile'
import { getAgeAtYear, placeMatchesKeywords } from './userProfile'

export interface HistoricalEvent {
  id: string
  title: string
  shortTitle: string
  eventYear: number
  eraLabel: string
  locationLabel: string
  significance: string
  summary: string
  memoryCue: string
  memoryPrompt: string
  rememberingQuestions: string[]
  clueTags: string[]
  keywords: string[]
  locationKeywords?: string[]
}

export interface HistoricalEventFit {
  ageAtEvent: number | null
  isLocationMatch: boolean
  reasonText: string
}

export const historicalEvents: HistoricalEvent[] = [
  {
    id: 'founding-1949',
    title: '1949年中华人民共和国成立',
    shortTitle: '新中国成立',
    eventYear: 1949,
    eraLabel: '1949年10月',
    locationLabel: '北京天安门与全国城乡',
    significance:
      '这是很多家庭口中“解放那年”的起点，也常常是长辈回忆童年、故乡和时代变化时最早的年份坐标。',
    summary:
      '新中国成立后，庆祝集会、广播通知、张贴标语和村镇锣鼓声进入了很多普通人的集体记忆。',
    memoryCue:
      '如果家里老人常提“解放以后”“建国那会儿”，这件大事往往就是回忆时间线的起点。',
    memoryPrompt:
      '可以先想想：家里是谁最先说起“建国了”？当时是通过广播、街坊消息，还是学校与单位通知知道的？',
    rememberingQuestions: [
      '家里长辈有没有说过“解放那年”的变化？',
      '村里、街上或学校当时有没有庆祝场面？',
      '家中有没有保存过和建国初期有关的老照片或证件？',
    ],
    clueTags: ['广播', '庆祝队伍', '红旗', '口号'],
    keywords: ['解放', '建国', '新中国', '天安门', '国庆', '广播'],
    locationKeywords: ['北京'],
  },
  {
    id: 'korean-war-1953',
    title: '1953年抗美援朝胜利',
    shortTitle: '抗美援朝胜利',
    eventYear: 1953,
    eraLabel: '1950年代初',
    locationLabel: '前线与全国后方',
    significance:
      '很多家庭都经历过“参军、支前、寄信、捐献”的年代氛围，这类回忆常和亲属、邻里、集体动员联系在一起。',
    summary:
      '抗美援朝战争结束后，关于前线来信、立功消息、慰问活动和保家卫国的口号，长期留在一代人的口述里。',
    memoryCue:
      '若家中有人参军、支前或经常谈起前线通信，这件事往往能带出更多家庭故事。',
    memoryPrompt:
      '可以回想：那几年家里有没有人参军、写慰问信，或听大人提过前线来信与村里送别的场景？',
    rememberingQuestions: [
      '亲友里有没有人当过兵或参加过支前工作？',
      '家里是否留过军装照、奖章、书信或老物件？',
      '那时大家最常挂在嘴边的口号是什么？',
    ],
    clueTags: ['参军', '来信', '支前', '保家卫国'],
    keywords: ['抗美援朝', '志愿军', '参军', '前线', '保家卫国', '书信'],
  },
  {
    id: 'atomic-bomb-1964',
    title: '1964年中国第一颗原子弹爆炸成功',
    shortTitle: '第一颗原子弹成功',
    eventYear: 1964,
    eraLabel: '1960年代中期',
    locationLabel: '西北试验场与全国报道',
    significance:
      '它常被记成“国家一下子硬气起来”的节点，也容易带出当年广播、报纸和集体讨论的生活细节。',
    summary:
      '这一突破通过广播、报纸和口口相传迅速传播，许多人记得那种既惊讶又振奋的时代情绪。',
    memoryCue:
      '如果您记得当年听广播、看黑板报或单位集中学习新闻，这件事常常能把记忆拉回到具体的日常场景。',
    memoryPrompt:
      '试着回想：您是在哪里第一次听到这个消息的？当时身边的人是兴奋、好奇，还是议论了很多国家大事？',
    rememberingQuestions: [
      '那时家里主要通过广播、报纸还是他人口中得知消息？',
      '学校或单位有没有专门组织大家听新闻、看黑板报？',
      '您还记得那时家里常用的收音机、喇叭或学习角吗？',
    ],
    clueTags: ['收音机', '黑板报', '新闻', '国家工业'],
    keywords: ['原子弹', '广播', '报纸', '学习', '新闻', '科技'],
  },
  {
    id: 'gaokao-1977',
    title: '1977年恢复高考',
    shortTitle: '恢复高考',
    eventYear: 1977,
    eraLabel: '1977年冬',
    locationLabel: '全国考场与校园',
    significance:
      '它改变了许多家庭的命运，也常常带出“复习、借书、返校、夜里点灯学习”的个人记忆。',
    summary:
      '恢复高考让大量青年重新走进课堂，也让很多家庭重新谈论读书、前途与人生转折。',
    memoryCue:
      '如果您本人、兄姐、亲友或邻居经历过备考与返校，这件大事很容易牵出具体的人名、地方和心情。',
    memoryPrompt:
      '可以问自己或家人：那一年家里有没有人为考试做准备？借过书、补过课，或者专门腾出时间和空间复习吗？',
    rememberingQuestions: [
      '身边有没有人因为恢复高考改变了人生方向？',
      '家里是否还记得那时的课本、准考证、笔记本或油灯？',
      '那段时间大家最常谈的是“读书”“工作”还是“机会”？',
    ],
    clueTags: ['借书', '夜读', '返校', '准考证'],
    keywords: ['高考', '读书', '学校', '考试', '课本', '返校'],
  },
  {
    id: 'reform-1978',
    title: '1978年改革开放启动',
    shortTitle: '改革开放',
    eventYear: 1978,
    eraLabel: '1978年以后',
    locationLabel: '城乡家庭与工作单位',
    significance:
      '它不仅是国家层面的政策变化，也常和分田到户、个体经营、外出务工、买电器等生活记忆连在一起。',
    summary:
      '改革开放之后，生产方式、就业机会和城市生活节奏不断变化，很多家庭的命运轨迹也从这里开始转弯。',
    memoryCue:
      '如果您记得“包产到户”“下海”“做买卖”“进城打工”等说法，往往都能顺着这一节点继续往下回想。',
    memoryPrompt:
      '想一想：那几年家里最明显的变化是什么？是收入、工作、住房，还是第一次添置电视、缝纫机、自行车？',
    rememberingQuestions: [
      '家里生活什么时候开始明显宽松起来？',
      '有没有人从农村进城、从单位出来做生意，或换过工作方式？',
      '第一件让全家印象深刻的大件电器是什么？',
    ],
    clueTags: ['分田到户', '做买卖', '进城', '添置电器'],
    keywords: ['改革开放', '分田到户', '个体户', '打工', '做生意', '电视'],
  },
  {
    id: 'hongkong-1997',
    title: '1997年香港回归',
    shortTitle: '香港回归',
    eventYear: 1997,
    eraLabel: '1997年7月',
    locationLabel: '香港与全国电视机前',
    significance:
      '这是很多家庭共同守在电视机前的夜晚，也常常和“第一次熬夜看直播”的家庭场景连在一起。',
    summary:
      '香港回归通过电视直播和新闻报道进入千家万户，许多人记得那一晚的倒计时、交接仪式与激动气氛。',
    memoryCue:
      '如果您记得一家人围着电视看重大直播，这件事往往能带出客厅布局、邻里来往和当时的心情。',
    memoryPrompt:
      '可以回想：那一晚您在哪里看电视？是和家人一起看，还是第二天通过报纸、广播和同事同学讨论得知的？',
    rememberingQuestions: [
      '家里当时用的是黑白电视还是彩电？',
      '那晚有没有和家人、邻居一起守着直播？',
      '您还记得电视里最打动您的画面或一句话吗？',
    ],
    clueTags: ['电视直播', '倒计时', '彩电', '团聚'],
    keywords: ['香港回归', '电视', '直播', '回归', '倒计时', '客厅'],
    locationKeywords: ['香港', '广东', '深圳', '广州'],
  },
  {
    id: 'shenzhou-2003',
    title: '2003年神舟五号载人飞行成功',
    shortTitle: '神舟五号',
    eventYear: 2003,
    eraLabel: '2003年秋',
    locationLabel: '酒泉与全国媒体报道',
    significance:
      '这一事件常让人想起“第一次真正觉得中国人飞向太空了”的振奋感，也容易牵出当时的电视新闻与家庭讨论。',
    summary:
      '神舟五号成功后，航天成为很多家庭热议的话题，学校、单位和媒体也反复讲述这一突破。',
    memoryCue:
      '如果家里有孩子、孙辈正在读书，很多人会把这件事和“给晚辈讲国家大事”联系起来。',
    memoryPrompt:
      '试着想想：那次发射后，您和家人有没有专门聊起“航天”“科技”“中国人真了不起”这些话题？',
    rememberingQuestions: [
      '您是通过电视新闻、报纸还是网络最先知道这件事的？',
      '家里有没有孩子因为这件事开始喜欢科学、航模或天文？',
      '那段时间最常提起的航天员名字和画面还记得吗？',
    ],
    clueTags: ['电视新闻', '科技', '孩子', '民族自豪'],
    keywords: ['神舟五号', '航天', '杨利伟', '科技', '发射', '电视新闻'],
  },
  {
    id: 'wenchuan-2008',
    title: '2008年汶川地震',
    shortTitle: '汶川地震',
    eventYear: 2008,
    eraLabel: '2008年5月',
    locationLabel: '四川与全国救援现场',
    significance:
      '这场灾难带来的共同记忆非常强烈，很多人都记得那几天守着电视、捐款、关注救援消息的场景。',
    summary:
      '汶川地震后，全国范围内持续关注救援、悼念和重建工作，许多人能清楚回忆起当时所处的位置与第一反应。',
    memoryCue:
      '即使不在四川，很多家庭也记得那几天的电视画面、短信转发、学校默哀和捐助行动。',
    memoryPrompt:
      '可以回想：地震发生时您正在做什么？后来是通过电视、电话还是短信不断跟进消息的？',
    rememberingQuestions: [
      '那几天家里有没有持续守着新闻或与亲友互相报平安？',
      '学校、单位或社区有没有组织捐款、默哀或志愿行动？',
      '您对那段时间最深的一种情绪是什么？',
    ],
    clueTags: ['电视新闻', '短信', '捐款', '守望'],
    keywords: ['汶川', '地震', '救援', '四川', '捐款', '短信'],
    locationKeywords: ['四川', '成都', '绵阳', '阿坝', '北川', '汶川'],
  },
  {
    id: 'olympics-2008',
    title: '2008年北京奥运会',
    shortTitle: '北京奥运会',
    eventYear: 2008,
    eraLabel: '2008年夏',
    locationLabel: '北京与全国电视机前',
    significance:
      '奥运会把体育热、家庭观赛和“北京欢迎你”的城市氛围带进了很多人的生活记忆。',
    summary:
      '从开幕式到比赛直播，再到街头巷尾的讨论，奥运会是许多家庭共享的鲜明时代印象。',
    memoryCue:
      '如果您记得家里一起看开幕式、讨论比赛、收藏纪念品或学唱主题歌，这条线索很容易带出更多生活细节。',
    memoryPrompt:
      '回想一下：奥运那年，家里最常打开的是哪一个频道？您最喜欢哪一场比赛、哪一位运动员？',
    rememberingQuestions: [
      '您是和谁一起看开幕式或重点比赛的？',
      '家里有没有留下门票、纪念品、海报或主题歌记忆？',
      '那年夏天城市和社区有没有明显的奥运氛围？',
    ],
    clueTags: ['开幕式', '电视转播', '主题歌', '全民观赛'],
    keywords: ['奥运', '北京', '开幕式', '比赛', '电视', '运动员'],
    locationKeywords: ['北京'],
  },
]

function scoreAgeAlignment(event: HistoricalEvent, userProfile: UserProfile) {
  const ageAtEvent = getAgeAtYear(userProfile, event.eventYear)

  if (ageAtEvent === null || ageAtEvent < 0) {
    return 0
  }

  if (ageAtEvent <= 5) {
    return 3
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

function scoreLocationAlignment(event: HistoricalEvent, userProfile: UserProfile) {
  if (!event.locationKeywords?.length) {
    return 0
  }

  const relevantPlaces = [userProfile.birthPlace, userProfile.hometown].filter(Boolean)
  const hasMatch = relevantPlaces.some((place) =>
    placeMatchesKeywords(place, event.locationKeywords ?? []),
  )

  return hasMatch ? 5 : 0
}

export function getHistoricalEventFit(
  event: HistoricalEvent,
  userProfile: UserProfile,
): HistoricalEventFit {
  const ageAtEvent = getAgeAtYear(userProfile, event.eventYear)
  const isLocationMatch = Boolean(
    event.locationKeywords?.length
    && [userProfile.birthPlace, userProfile.hometown]
      .filter(Boolean)
      .some((place) => placeMatchesKeywords(place, event.locationKeywords ?? [])),
  )
  const reasonParts: string[] = []

  if (ageAtEvent !== null && ageAtEvent >= 0) {
    reasonParts.push(`当时您大约 ${ageAtEvent} 岁`)
  }

  if (isLocationMatch) {
    reasonParts.push('和您的出生地或成长地有地理关联')
  }

  return {
    ageAtEvent,
    isLocationMatch,
    reasonText:
      reasonParts.length > 0
        ? reasonParts.join('，')
        : '主要根据您的出生年代做出的线索推荐',
  }
}

function scoreQueryAlignment(event: HistoricalEvent, query: string) {
  const normalizedQuery = query.toLowerCase()

  return event.keywords.reduce(
    (total, keyword) => total + (normalizedQuery.includes(keyword.toLowerCase()) ? 3 : 0),
    0,
  )
}

export function buildFeaturedHistoricalEvents(
  userProfile: UserProfile,
  queries: string[],
  count: number,
) {
  const picked: HistoricalEvent[] = []
  const usedIds = new Set<string>()

  queries.forEach((query) => {
    const scored = historicalEvents
      .filter((event) => !usedIds.has(event.id))
      .map((event) => ({
        event,
        score:
          scoreQueryAlignment(event, query)
          + scoreAgeAlignment(event, userProfile)
          + scoreLocationAlignment(event, userProfile),
      }))
      .sort((left, right) => right.score - left.score)

    const match = scored[0]?.event
    if (!match) {
      return
    }

    picked.push(match)
    usedIds.add(match.id)
  })

  if (picked.length >= count) {
    return picked.slice(0, count)
  }

  historicalEvents
    .map((event) => ({
      event,
      score:
        scoreAgeAlignment(event, userProfile)
        + scoreLocationAlignment(event, userProfile),
    }))
    .sort((left, right) => right.score - left.score)
    .forEach(({ event }) => {
      if (picked.length >= count || usedIds.has(event.id)) {
        return
      }

      picked.push(event)
      usedIds.add(event.id)
    })

  return picked
}
