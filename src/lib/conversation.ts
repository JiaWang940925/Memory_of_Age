import type { Memory } from '../App'
import { buildImportantPeople, extractPlaceCandidates } from './peopleMentions'
import {
  type InterviewMode,
  type PromptStyle,
  type PromptStyleBase,
  type UserProfile,
  getAgeAtYear,
  getBirthYear,
  getProfileDisplayName,
  getPromptStyleForProfile,
  placeMatchesKeywords,
} from './userProfile'

export interface InterviewPrompt {
  id: string
  category: string
  text: string
  order: number
  promptType: 'life-stage' | 'event'
  familyHint?: string
}

export interface EventReminder {
  id: string
  title: string
  teaser: string
}

function buildFamilyHint(category: string) {
  switch (category) {
    case '童年记忆':
      return '可以先从老家的房子、称呼、谁最常陪在身边这些线索追问，不必急着一次说完整。'
    case '求学成长':
      return '家属可以先追问老师、同学、学校名字，或让老人先回想教室、操场、上学路。'
    case '初入社会':
      return '如果老人一时不知从哪里说起，可以先问第一份工作在哪里、和谁一起上班。'
    case '工作事业':
      return '建议家属继续追问岗位、同事、单位地点，以及最辛苦或最自豪的一件事。'
    case '婚恋家庭':
    case '家庭责任':
      return '可以先从家里最重要的人开始，慢慢问称呼、关系、谁常一起吃饭或一起过节。'
    case '时代记忆':
      return '如果老人只记得模糊印象，家属可以先问当时住在哪里、家里在做什么、谁把消息告诉了他。'
    default:
      return '如果老人一时卡住，可以先换成问人物、地点、物件，再慢慢回到这段故事本身。'
  }
}

interface LifeStagePromptSeed {
  id: string
  category: string
  order: number
  buildText: (profile: UserProfile, style: PromptStyle) => string
}

interface EventPromptSeed {
  id: string
  eventTitle: string
  eventYear: number
  minAge: number
  locationKeywords?: string[]
  buildText: (
    profile: UserProfile,
    ageAtEvent: number,
    isLocationMatch: boolean,
  ) => string
}

function normalizePromptStyle(
  profile: UserProfile,
  styleOrMode?: PromptStyle | InterviewMode,
): PromptStyle {
  if (!styleOrMode) {
    return getPromptStyleForProfile(profile)
  }

  if (typeof styleOrMode !== 'string') {
    return styleOrMode
  }

  if (styleOrMode === 'family-assist') {
    return { base: 'family', gentle: false }
  }

  if (styleOrMode === 'gentle-recall') {
    return { base: 'self', gentle: true }
  }

  return { base: 'self', gentle: false }
}

function applyPromptStyle(text: string, style: PromptStyle) {
  if (style.base === 'family') {
    return style.gentle
      ? `请您轻轻读给老人听：${text} 可以从一个人或一个地点开始。`
      : `请您轻轻读给老人听：${text}`
  }

  if (style.base === 'caregiver') {
    return style.gentle
      ? `请简单记录：${text} 可以从一个人或一个地点开始。`
      : `请简单记录：${text}`
  }

  return style.gentle ? `${text} 可以从一个人或一个地点开始。` : text
}

function buildPromptText(
  _profile: UserProfile,
  variants: Record<PromptStyleBase | 'gentle', string>,
  style?: PromptStyle,
) {
  const promptStyle = style ?? { base: 'self', gentle: false }
  if (promptStyle.gentle && variants.gentle) {
    if (promptStyle.base === 'family') {
      return `请您轻轻读给老人听：${variants.gentle}`
    }
    if (promptStyle.base === 'caregiver') {
      return `请简单记录：${variants.gentle}`
    }
    return variants.gentle
  }

  if (promptStyle.base === 'family') {
    return variants.family ?? variants.self
  }

  if (promptStyle.base === 'caregiver') {
    return variants.caregiver ?? variants.self
  }

  return variants.self
}

const lifeStagePromptSeeds: LifeStagePromptSeed[] = [
  {
    id: 'childhood-home',
    category: '童年记忆',
    order: 10,
    buildText: (profile, style) =>
      buildPromptText(
        profile,
        {
          self: '童年主要生活、长大的地方是哪里？如果有老家、村子或街道的名字也可以告诉我。',
          family: '请您轻轻问老人：童年主要生活、长大的地方是哪里？有老家、村子或街道名字也可以。',
          caregiver: '请记录：童年主要生活、长大的地方。',
          gentle: '童年时住在哪里？可以说一个地方名。',
        },
        style,
      ),
  },
  {
    id: 'childhood-play',
    category: '童年记忆',
    order: 20,
    buildText: (_profile, style) =>
      applyPromptStyle(
        '小时候最喜欢玩的游戏、玩具或伙伴是谁？那段快乐现在回想起来是什么感觉？',
        style,
      ),
  },
  {
    id: 'school-days',
    category: '求学成长',
    order: 30,
    buildText: (_profile, style) =>
      applyPromptStyle(
        '读书时有没有一位老师、一门功课或一次考试，让您到现在还记得？当时心里是什么滋味？',
        style,
      ),
  },
  {
    id: 'campus-friendship',
    category: '求学成长',
    order: 40,
    buildText: (_profile, style) =>
      applyPromptStyle(
        '求学阶段有没有一位同学、朋友或一次集体活动，让您觉得自己慢慢长大了？',
        style,
      ),
  },
  {
    id: 'first-job',
    category: '初入社会',
    order: 50,
    buildText: (profile, style) =>
      buildPromptText(
        profile,
        {
          self: '成年后的工作经历是怎样的？您做过哪些工作，主要在哪些地方，最难忘的一段是什么？',
          family: '请您问老人：成年后的工作经历是怎样的？做过哪些工作，主要在哪些地方，最难忘的一段是什么？',
          caregiver: '请记录：成年后的工作经历（做过哪些工作、主要地点、最难忘的一段）。',
          gentle: '成年后做过哪些工作？主要在哪里？哪一段最难忘？',
        },
        style,
      ),
  },
  {
    id: 'career-turning-point',
    category: '工作事业',
    order: 60,
    buildText: (profile, style) =>
      buildPromptText(
        profile,
        {
          self: '成年后的工作经历里，有没有一段最重要的阶段或一次转折，让您记得特别清楚？',
          family: '请您问老人：成年后的工作经历里，有没有一段最重要的阶段或一次转折，让他记得特别清楚？',
          caregiver: '请记录：工作经历中最重要的一段或一次转折。',
          gentle: '工作里最重要的一段是什么？',
        },
        style,
      ),
  },
  {
    id: 'love-story',
    category: '婚恋家庭',
    order: 70,
    buildText: (profile, style) =>
      buildPromptText(
        profile,
        {
          self: '请介绍一下家庭成员或重要的人：称呼、关系、平时谁最常陪在您身边？',
          family: '请您问老人：家里重要的人有哪些？称呼、关系、谁最常陪在身边？',
          caregiver: '请记录：家庭成员/重要人物（称呼、关系、常陪伴的人）。',
          gentle: '家里最重要的人是谁？他/她怎么称呼您？',
        },
        style,
      ),
  },
  {
    id: 'family-tradition',
    category: '婚恋家庭',
    order: 80,
    buildText: (_profile, style) =>
      applyPromptStyle(
        '成家之后，家里有没有一顿饭、一个节日或一种习惯，让您觉得特别温暖？',
        style,
      ),
  },
  {
    id: 'parenting-stage',
    category: '家庭责任',
    order: 90,
    buildText: (_profile, style) =>
      applyPromptStyle(
        '如果您曾照顾孩子、晚辈或家人，有没有哪个瞬间让您觉得自己的责任特别重，也特别值得？',
        style,
      ),
  },
  {
    id: 'later-life',
    category: '晚年生活',
    order: 100,
    buildText: (_profile, style) =>
      applyPromptStyle(
        '到了现在这个人生阶段，您最珍惜的日常、爱好或陪伴是什么？',
        style,
      ),
  },
  {
    id: 'wisdom-advice',
    category: '人生体悟',
    order: 110,
    buildText: (_profile, style) =>
      applyPromptStyle(
        '回头看自己的人生，如果给年轻时候的自己一句叮嘱，您最想说什么？',
        style,
      ),
  },
]

const eventPromptSeeds: EventPromptSeed[] = [
  {
    id: 'event-prc-founding',
    eventTitle: '中华人民共和国成立',
    eventYear: 1949,
    minAge: 6,
    buildText: (_profile, ageAtEvent) =>
      `1949 年新中国成立时，您大约 ${ageAtEvent} 岁。您还记得身边的大人、街坊或学校当时是什么气氛吗？那时您的心情怎样？`,
  },
  {
    id: 'event-korean-war',
    eventTitle: '抗美援朝时期',
    eventYear: 1950,
    minAge: 6,
    buildText: (_profile, ageAtEvent) =>
      `抗美援朝那几年，您正值 ${ageAtEvent} 岁左右。您记得家里、村里或单位是怎样谈起那段岁月的吗？那时您最深的感受是什么？`,
  },
  {
    id: 'event-gaokao-return',
    eventTitle: '恢复高考',
    eventYear: 1977,
    minAge: 12,
    buildText: (_profile, ageAtEvent) =>
      `1977 年恢复高考时，您大约 ${ageAtEvent} 岁。那时社会上对读书、升学和改变命运的期待，您有亲身感受吗？`,
  },
  {
    id: 'event-reform-opening',
    eventTitle: '改革开放初期',
    eventYear: 1978,
    minAge: 12,
    buildText: (_profile, ageAtEvent) =>
      `改革开放刚开始的时候，您大约 ${ageAtEvent} 岁。您记得工作、生活、买卖或观念上最明显的变化是什么吗？`,
  },
  {
    id: 'event-hongkong-return',
    eventTitle: '香港回归',
    eventYear: 1997,
    minAge: 10,
    buildText: (_profile, ageAtEvent) =>
      `1997 年香港回归时，您已经 ${ageAtEvent} 岁左右。您还记得自己听到这个消息时的心情或和家人讨论的内容吗？`,
  },
  {
    id: 'event-shenzhou5',
    eventTitle: '杨利伟乘神舟五号成功飞天',
    eventYear: 2003,
    minAge: 8,
    buildText: (_profile, ageAtEvent) =>
      `2003 年杨利伟乘神舟五号成功飞天时，您大约 ${ageAtEvent} 岁。那天您看到或听到这个消息时，心里有什么激动、骄傲或感慨吗？`,
  },
  {
    id: 'event-wenchuan',
    eventTitle: '2008 年汶川地震',
    eventYear: 2008,
    minAge: 8,
    locationKeywords: ['四川', '成都', '绵阳', '德阳', '北川', '汶川', '广元', '都江堰', '阿坝'],
    buildText: (profile, ageAtEvent, isLocationMatch) =>
      isLocationMatch
        ? `2008 年汶川地震发生时，您大约 ${ageAtEvent} 岁，而且和 ${profile.birthPlace} 这片地方有直接联系。您还记得当时最真实的心情、担心和身边发生的事吗？`
        : `2008 年汶川地震发生时，您大约 ${ageAtEvent} 岁。您还记得自己听到消息时的震动、担心或后来参与帮助的经历吗？`,
  },
]

function getEventPromptOrder(ageAtEvent: number) {
  if (ageAtEvent <= 14) {
    return 25
  }

  if (ageAtEvent <= 24) {
    return 45
  }

  if (ageAtEvent <= 40) {
    return 75
  }

  if (ageAtEvent <= 60) {
    return 95
  }

  return 105
}

function scoreEvent(ageAtEvent: number, isLocationMatch: boolean) {
  if (ageAtEvent < 0) {
    return -1
  }

  let score = 0

  if (ageAtEvent >= 8 && ageAtEvent <= 22) {
    score += 6
  } else if (ageAtEvent <= 40) {
    score += 5
  } else if (ageAtEvent <= 65) {
    score += 3
  } else {
    score += 1
  }

  if (isLocationMatch) {
    score += 4
  }

  return score
}

export function buildEventReminders(profile: UserProfile): EventReminder[] {
  return eventPromptSeeds
    .map((seed) => {
      const ageAtEvent = getAgeAtYear(profile, seed.eventYear)
      if (ageAtEvent === null || ageAtEvent < seed.minAge) {
        return null
      }

      const isLocationMatch = seed.locationKeywords
        ? placeMatchesKeywords(profile.birthPlace, seed.locationKeywords)
        : false

      return {
        id: seed.id,
        teaser: seed.buildText(profile, ageAtEvent, isLocationMatch),
        title: seed.eventTitle,
        score: scoreEvent(ageAtEvent, isLocationMatch),
      }
    })
    .filter((item): item is EventReminder & { score: number } => item !== null)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map(({ id, teaser, title }) => ({
      id,
      teaser,
      title,
    }))
}

export function buildInterviewPrompts(
  profile: UserProfile,
  styleOrMode?: PromptStyle | InterviewMode,
): InterviewPrompt[] {
  const style = normalizePromptStyle(profile, styleOrMode)
  const stagePrompts = lifeStagePromptSeeds.map((seed) => ({
    id: seed.id,
    category: seed.category,
    text: seed.buildText(profile, style),
    order: seed.order,
    promptType: 'life-stage' as const,
    familyHint: style.base !== 'self' ? buildFamilyHint(seed.category) : undefined,
  }))

  const eventPrompts: Array<{
    id: string
    category: string
    text: string
    order: number
    promptType: 'event'
    score: number
    familyHint?: string
  }> = []

  eventPromptSeeds.forEach((seed) => {
      const ageAtEvent = getAgeAtYear(profile, seed.eventYear)
      if (ageAtEvent === null || ageAtEvent < seed.minAge) {
        return
      }

      const isLocationMatch = seed.locationKeywords
        ? placeMatchesKeywords(profile.birthPlace, seed.locationKeywords)
        : false
      const score = scoreEvent(ageAtEvent, isLocationMatch)

      if (score < 2) {
        return
      }

      eventPrompts.push({
        id: seed.id,
        category: '时代记忆',
        text: seed.buildText(profile, ageAtEvent, isLocationMatch),
        order: getEventPromptOrder(ageAtEvent),
        promptType: 'event' as const,
        score,
        familyHint: style.base !== 'self' ? buildFamilyHint('时代记忆') : undefined,
      })
    })

  return [...stagePrompts, ...eventPrompts]
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order
      }

      if ('score' in left && 'score' in right) {
        return right.score - left.score
      }

      return 0
    })
    .map(({ id, category, text, order, promptType, familyHint }) => ({
      id,
      category,
      text,
      order,
      promptType,
      familyHint,
    }))
}

export function getInitialAskedPromptIds(
  prompts: InterviewPrompt[],
  memories: Memory[],
) {
  const promptTextMap = new Map(prompts.map((prompt) => [prompt.text, prompt.id]))
  const ids = new Set<string>()

  memories.forEach((memory) => {
    if (typeof memory.promptId === 'string' && memory.promptId) {
      ids.add(memory.promptId)
      return
    }

    const matchedId = promptTextMap.get(memory.question)
    if (matchedId) {
      ids.add(matchedId)
    }
  })

  return [...ids]
}

export function pickNextPrompt(
  prompts: InterviewPrompt[],
  askedPromptIds: string[],
) {
  const asked = new Set(askedPromptIds)
  return prompts.find((prompt) => !asked.has(prompt.id)) ?? null
}

export function buildOpeningQuestion(
  profile: UserProfile,
  prompt: InterviewPrompt | null,
  styleOrMode?: PromptStyle | InterviewMode,
) {
  const birthYear = getBirthYear(profile)
  const profileName = getProfileDisplayName(profile)
  const style = normalizePromptStyle(profile, styleOrMode)

  if (!prompt) {
    if (style.base === 'family') {
      return `您好。老人基础资料我已经记下了。接下来会依次了解童年地点、成年工作经历、家庭成员等人生阶段。您可以陪着${profileName}，从最容易开口的人、地点或照片开始讲起，我会帮你们慢慢整理成回忆录。`
    }

    if (style.base === 'caregiver') {
      return '您好。资料已记录。接下来会依次了解童年地点、成年工作经历、家庭成员等人生阶段。请协助记录关键信息，之后我会整理成回忆录。'
    }

    return `您好，${profileName}。您的基础资料我已经记下了。接下来会依次了解童年地点、成年工作经历、家庭成员等人生阶段。您可以从任何一个想讲的阶段开始，我会帮您慢慢整理成回忆录。`
  }

  const eraPrefix = birthYear
    ? `您出生于 ${birthYear} 年，来自 ${profile.birthPlace}。`
    : `我已经记下您来自 ${profile.birthPlace}。`
  const gentleTail = profile.memoryConcern
    ? '我会放慢节奏，用更短、更轻的问题陪您慢慢回想。'
    : '我会结合您的年龄和成长背景，一步步陪您回顾人生。'

  if (style.base === 'family') {
    const familyGentleTail = profile.memoryConcern
      ? '我会把问题问得更慢、更短，方便您陪着ta一起回想。'
      : '您可以把这个问题轻轻读给ta听，也可以先从人名、地点和照片开始陪ta回想。'
    return `您好。${profileName}的资料我已经记下了。${eraPrefix} ${familyGentleTail} 我们先从“${prompt.category}”开始：${prompt.text}`
  }

  if (style.base === 'caregiver') {
    return `您好。${eraPrefix} 接下来会依次了解童年地点、成年工作经历、家庭成员等人生阶段。请协助记录，我们先从“${prompt.category}”开始：${prompt.text}`
  }

  return `您好，${profileName}。${eraPrefix} ${gentleTail} 接下来会依次了解童年地点、成年工作经历、家庭成员等人生阶段。我们先从“${prompt.category}”开始吧：${prompt.text}`
}

const WORK_KEYWORDS = [
  '工作',
  '单位',
  '岗位',
  '工厂',
  '公司',
  '上班',
  '车间',
  '厂里',
  '工地',
  '师傅',
  '同事',
  '职业',
  '职务',
]

const WORK_CATEGORIES = new Set(['初入社会', '工作事业'])

export function inferCoveredPromptIds(profile: UserProfile, memories: Memory[]) {
  const covered = new Set<string>()

  const childhoodCovered =
    Boolean(profile.hometown.trim() || profile.birthPlace.trim())
    || memories.some((memory) => {
      const places = extractPlaceCandidates(`${memory.question} ${memory.answer}`)
      return places.length > 0 || memory.category === '童年记忆'
    })

  if (childhoodCovered) {
    covered.add('childhood-home')
  }

  const workCovered =
    Boolean(profile.importantRole.trim())
    || memories.some((memory) => {
      if (WORK_CATEGORIES.has(memory.category)) {
        return true
      }
      const text = `${memory.question} ${memory.answer}`
      return WORK_KEYWORDS.some((keyword) => text.includes(keyword))
    })

  if (workCovered) {
    covered.add('first-job')
    covered.add('career-turning-point')
  }

  const familyCovered =
    Boolean(profile.importantFamilyMembers.trim())
    || buildImportantPeople(memories).some((person) => person.theme === 'family')

  if (familyCovered) {
    covered.add('love-story')
  }

  return [...covered]
}

export function buildSmartResponse(params: {
  emotion: Memory['emotion']
  hasPhotos: boolean
  nextPrompt: InterviewPrompt | null
  styleOrMode?: PromptStyle | InterviewMode
}) {
  const { emotion, hasPhotos, nextPrompt, styleOrMode } = params

  const guidanceMap: Record<Memory['emotion'], string[]> = {
    positive: [
      '这段回忆里有很强的温度，我能感受到您说起它时的光亮。',
      '听您这样讲，我能感受到那段岁月里的暖意和活力。',
    ],
    neutral: [
      '谢谢您讲得这么细，这些平常片段往往最能留下时代的质感。',
      '这样的生活细节很珍贵，往往最能把一个人的人生串起来。',
    ],
    attention: [
      '这段经历听起来不轻松，谢谢您愿意把它讲出来。',
      '我能感受到其中的不容易，您愿意继续说，已经很有力量。',
    ],
  }

  const lead =
    guidanceMap[emotion][Math.floor(Math.random() * guidanceMap[emotion].length)]
  const photoTail = hasPhotos
    ? ' 照片也会帮我们把那时的人和场景保留下来。'
    : ''
  const style = styleOrMode
    ? normalizePromptStyle({} as UserProfile, styleOrMode)
    : { base: 'self', gentle: false }

  if (!nextPrompt) {
    if (style.base === 'family') {
      return `${lead}${photoTail} 你们已经整理出很多重要的人生片段了。接下来如果愿意，也可以继续自由补充任何还想留下的人和事。`
    }

    if (style.base === 'caregiver') {
      return `${lead}${photoTail} 已记录多段重要的人生片段。接下来可继续补充任何还想留下的故事。`
    }

    return `${lead}${photoTail} 您已经分享了很多重要的人生片段。接下来如果愿意，也可以自由补充任何还想留下的故事。`
  }

  if (style.base === 'family') {
    const familyTail = nextPrompt.familyHint ? ` 家属追问建议：${nextPrompt.familyHint}` : ''
    return `${lead}${photoTail} 接下来我想继续从“${nextPrompt.category}”陪你们往前走：${nextPrompt.text}${familyTail}`
  }

  if (style.base === 'caregiver') {
    return `${lead}${photoTail} 接下来请继续记录“${nextPrompt.category}”：${nextPrompt.text}`
  }

  return `${lead}${photoTail} 接下来我想继续从“${nextPrompt.category}”陪您往前走：${nextPrompt.text}`
}
