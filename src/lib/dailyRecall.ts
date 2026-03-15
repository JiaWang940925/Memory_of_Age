import type { Memory } from '../App'
import type { UserProfile } from './userProfile'
import { buildProfileSummary, formatBirthDate, getProfileDisplayName } from './userProfile'

export interface DailyRecallItem {
  id: string
  title: string
  prompt: string
  cue: string
  referenceText: string
  referenceLabel: string
  topic: string
  keywords: string[]
}

export type DailyRecallResponseState =
  | 'self-recalled'
  | 'after-cue'
  | 'family-supported'
  | 'rest-now'

export interface DailyRecallAssessment {
  tone: 'encouraging' | 'rest'
  title: string
  message: string
  responseState: DailyRecallResponseState
}

export interface DailyRecallLogEntry {
  id: string
  itemId: string
  itemTitle: string
  prompt: string
  topic: string
  responseState: DailyRecallResponseState
  answer: string
  recordedAt: string
}

export interface DailyRecallWeeklySummaryItem {
  date: string
  totalReviews: number
  selfRecalledCount: number
  afterCueCount: number
  familySupportedCount: number
  restCount: number
  topics: string[]
}

export interface DailyRecallDailySummaryItem extends DailyRecallWeeklySummaryItem {}

const stopPhrases = ['然后', '就是', '那个', '我们', '他们', '时候', '自己', '觉得', '特别', '一直', '后来']

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[\s，。！？、；：,.!?;:"“”‘’（）()《》【】\-_/]/g, '')
}

function truncateText(value: string, maxLength: number) {
  const trimmed = value.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= maxLength) {
    return trimmed
  }

  return `${trimmed.slice(0, maxLength)}...`
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function buildKeywordList(value: string) {
  const rawMatches = value.match(/[\u4e00-\u9fff]{2,6}|[a-z0-9]{2,}/gi) ?? []
  const uniqueKeywords = new Set<string>()

  rawMatches.forEach((match) => {
    const normalized = normalizeText(match)
    if (normalized.length < 2 || stopPhrases.some((phrase) => normalized.includes(phrase))) {
      return
    }

    uniqueKeywords.add(normalized)
  })

  return [...uniqueKeywords].slice(0, 8)
}

function getMemoryTopic(question: string, answer: string, category: string) {
  const haystack = `${question} ${answer} ${category}`

  if (/(孩子|儿子|女儿|孙子|孙女|晚辈)/.test(haystack)) {
    return {
      topic: '家里的孩子',
      prompt: '今天先从家里的孩子开始回想。您愿意再和我说说，他们是谁、平时怎么叫您吗？',
      cue: '如果一时想不全，可以先从孩子的称呼、排行，或者最先想到的那个人开始说。',
      priority: 10,
    }
  }

  if (/(爱人|老伴|丈夫|妻子|结婚|婚姻)/.test(haystack)) {
    return {
      topic: '相伴多年的家人',
      prompt: '今天想轻轻回想一下，陪伴您很久的那位重要的人，您愿意再慢慢说说吗？',
      cue: '可以先回想你们怎么认识、平时怎么称呼，或者最难忘的一件小事。',
      priority: 9,
    }
  }

  if (/(父亲|母亲|爸爸|妈妈|哥哥|姐姐|弟弟|妹妹|家里)/.test(haystack)) {
    return {
      topic: '原生家庭',
      prompt: '我们今天从家里人开始。那时候身边最重要的人，您最先想起谁？',
      cue: '可以先从父母、兄弟姐妹，或者家里最常被提起的那个人开始。',
      priority: 8,
    }
  }

  if (/(学校|老师|同学|读书|上学|校园)/.test(haystack)) {
    return {
      topic: '求学时候的人和事',
      prompt: '今天想回到读书的时候。您最先想起的是老师、同学，还是学校里的某个地方？',
      cue: '可以从老师、同学、学校名字，或者那时候最深的一次感受开始。',
      priority: 7,
    }
  }

  if (/(工作|工厂|单位|工资|上班|事业|岗位)/.test(haystack)) {
    return {
      topic: '工作经历',
      prompt: '今天想从工作经历里轻轻回想。您最先想到的是哪份工作，或者哪位同事？',
      cue: '先说工作地点、岗位名称，或者那时最常一起共事的人也可以。',
      priority: 7,
    }
  }

  if (/(出生|故乡|老家|村里|家乡|小时候)/.test(haystack)) {
    return {
      topic: '家乡和小时候',
      prompt: '今天先从小时候和老家开始。您脑海里先浮现的是哪个地方，或者哪个人？',
      cue: '可以先从老家、街坊、院子、村子，或者小时候最常见到的家人开始。',
      priority: 6,
    }
  }

  if (/(喜欢|爱好|散步|唱歌|种花|下棋|跳舞|日常)/.test(haystack)) {
    return {
      topic: '现在珍惜的日常',
      prompt: '今天想听听您现在很珍惜的日常。平时最让您安心或开心的事是什么？',
      cue: '可以从每天都会做的事情、最喜欢的人，或者最安心的一个时刻开始。',
      priority: 5,
    }
  }

  return {
    topic: category,
    prompt: `今天想轻轻回想“${category}”。您愿意先从脑海里最先冒出来的人、地点或一句话开始吗？`,
    cue: '不必一次说得很完整，先从脑海里最先出现的人、地点或一句话开始就可以。',
    priority: 4,
  }
}

function buildProfileRecallItems(profile: UserProfile | null) {
  if (!profile) {
    return []
  }

  const items: DailyRecallItem[] = []

  if (profile.familyCallName.trim() || profile.fullName.trim()) {
    items.push({
      id: 'profile-name',
      title: '常用称呼',
      prompt: '我们先从最轻松的问题开始。家里人平时更习惯怎么称呼您呢？',
      cue: '如果您有乳名、家里叫法或晚辈常用的称呼，也可以一起说。',
      referenceText: profile.familyCallName.trim() || profile.fullName.trim(),
      referenceLabel: '个人信息',
      topic: '称呼',
      keywords: buildKeywordList(`${profile.familyCallName} ${profile.fullName}`),
    })
  }

  items.push({
    id: 'profile-birthplace',
    title: '出生地点',
    prompt: '再轻轻回想一下，您是在哪里出生的？',
    cue: '可以先说省份、城市，或者您最熟悉的老家叫法。',
    referenceText: profile.birthPlace.trim(),
    referenceLabel: '出生信息',
    topic: '出生地',
    keywords: buildKeywordList(profile.birthPlace),
  })

  items.push({
    id: 'profile-birthdate',
    title: '出生日期',
    prompt: '您愿意再说说自己的出生年月日吗？记得哪一部分都可以慢慢说。',
    cue: '如果一下子想不起完整日期，可以先从年份或月份开始。',
    referenceText: formatBirthDate(profile.birthDate),
    referenceLabel: '出生信息',
    topic: '出生年月日',
    keywords: buildKeywordList(`${profile.birthDate} ${formatBirthDate(profile.birthDate)}`),
  })

  if (profile.hometown.trim()) {
    items.push({
      id: 'profile-hometown',
      title: '成长地',
      prompt: '您后来长期生活、最有归属感的地方，是哪里呢？',
      cue: '可以说老家、成长地，或者住得最久、最熟悉的城市。',
      referenceText: profile.hometown.trim(),
      referenceLabel: '成长信息',
      topic: '成长地',
      keywords: buildKeywordList(profile.hometown),
    })
  }

  return items
}

function buildMemoryRecallItems(memories: Memory[]) {
  return memories
    .slice()
    .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
    .map((memory, index) => {
      const topic = getMemoryTopic(memory.question, memory.answer, memory.category)

      return {
        id: `memory-${memory.id}`,
        title: topic.topic,
        prompt: topic.prompt,
        cue: topic.cue,
        referenceText: memory.answer.trim(),
        referenceLabel: `${memory.category} · 第 ${index + 1} 条最近记录`,
        topic: topic.topic,
        keywords: buildKeywordList(`${memory.question} ${memory.answer}`),
        priority: topic.priority,
        timestamp: memory.timestamp.getTime(),
      }
    })
    .sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority
      }

      return right.timestamp - left.timestamp
    })
}

export function buildDailyRecallItems(memories: Memory[], userProfile: UserProfile | null) {
  const items = [...buildProfileRecallItems(userProfile)]
  const seenTopics = new Set(items.map((item) => item.topic))

  buildMemoryRecallItems(memories).forEach((item) => {
    if (seenTopics.has(item.topic) && item.priority < 8) {
      return
    }

    seenTopics.add(item.topic)
    items.push({
      id: item.id,
      title: item.title,
      prompt: item.prompt,
      cue: item.cue,
      referenceText: item.referenceText,
      referenceLabel: item.referenceLabel,
      topic: item.topic,
      keywords: item.keywords,
    })
  })

  return items.slice(0, 8)
}

export function buildDailyRecallOpening(memories: Memory[], userProfile: UserProfile | null) {
  const profileName = userProfile ? getProfileDisplayName(userProfile) : '您'
  const latestMemory = memories
    .slice()
    .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())[0]

  if (!latestMemory) {
    return `${profileName}，今天我们先从一些熟悉的小问题开始，不着急，一点点回想就好。`
  }

  return `上次我们讲到“${truncateText(latestMemory.answer, 24)}”。今天我想继续陪您慢慢回想，如果有新的补充，也可以随时告诉我。`
}

export function buildDailyRecallFeedback(params: {
  answer: string
  responseState: DailyRecallResponseState
}) {
  const { answer, responseState } = params
  const trimmedAnswer = answer.trim()

  if (responseState === 'rest-now') {
    return {
      tone: 'rest',
      title: '今天先到这里也可以',
      message: '回想不是考试，也不用急着完成。今天先停在这里，等想说的时候再继续就好。',
      responseState,
    } satisfies DailyRecallAssessment
  }

  if (!trimmedAnswer) {
    return {
      tone: 'encouraging',
      title: '先记一个小线索就很好',
      message: '哪怕只记下一句称呼、一个地方，或者一件旧物，也已经是在慢慢把记忆接回来了。',
      responseState,
    } satisfies DailyRecallAssessment
  }

  switch (responseState) {
    case 'self-recalled':
      return {
        tone: 'encouraging',
        title: '今天是自己慢慢想起来的',
        message: '这段回想是您自己讲出来的，很珍贵。哪怕只有几句话，也已经把熟悉的生活线索重新连起来了。',
        responseState,
      } satisfies DailyRecallAssessment
    case 'after-cue':
      return {
        tone: 'encouraging',
        title: '提示之后想起来了',
        message: '有时候记忆只差一个小提示。今天能顺着线索继续说下去，就已经很好。',
        responseState,
      } satisfies DailyRecallAssessment
    case 'family-supported':
      return {
        tone: 'encouraging',
        title: '家人一起补充也很好',
        message: '回想本来就可以由家人一起完成。有人陪着慢慢说，往往比一个人硬想更轻松。',
        responseState,
      } satisfies DailyRecallAssessment
    default:
      return {
        tone: 'encouraging',
        title: '今天的回想已经记下了',
        message: '不必追求一次讲完整，把今天想起的这些留下来就很好。',
        responseState,
      } satisfies DailyRecallAssessment
  }
}

export function buildDailyRecallLogEntry(params: {
  item: DailyRecallItem
  answer: string
  responseState: DailyRecallResponseState
  now?: Date
}): DailyRecallLogEntry {
  const timestamp = params.now ?? new Date()

  return {
    id: `${params.item.id}-${timestamp.getTime()}`,
    itemId: params.item.id,
    itemTitle: params.item.title,
    prompt: params.item.prompt,
    topic: params.item.topic,
    responseState: params.responseState,
    answer: params.answer.trim(),
    recordedAt: timestamp.toISOString(),
  }
}

function formatDayKey(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function summarizeDayEntries(date: string, entries: DailyRecallLogEntry[]) {
  return {
    date,
    totalReviews: entries.length,
    selfRecalledCount: entries.filter((entry) => entry.responseState === 'self-recalled').length,
    afterCueCount: entries.filter((entry) => entry.responseState === 'after-cue').length,
    familySupportedCount: entries.filter((entry) => entry.responseState === 'family-supported').length,
    restCount: entries.filter((entry) => entry.responseState === 'rest-now').length,
    topics: unique(entries.map((entry) => entry.itemTitle || entry.topic)).slice(0, 4),
  } satisfies DailyRecallWeeklySummaryItem
}

export function summarizePastWeekDailyRecall(
  history: DailyRecallLogEntry[],
  now: Date = new Date(),
): DailyRecallWeeklySummaryItem[] {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  return Array.from({ length: 7 }, (_, offset) => {
    const day = new Date(today)
    day.setDate(today.getDate() - (6 - offset))
    const dayKey = formatDayKey(day)
    const dayEntries = history.filter((entry) => formatDayKey(new Date(entry.recordedAt)) === dayKey)
    return summarizeDayEntries(dayKey, dayEntries)
  })
}

export function summarizeDailyRecallHistory(
  history: DailyRecallLogEntry[],
): DailyRecallDailySummaryItem[] {
  const grouped = new Map<string, DailyRecallLogEntry[]>()

  history.forEach((entry) => {
    const dayKey = formatDayKey(new Date(entry.recordedAt))
    const items = grouped.get(dayKey) ?? []
    items.push(entry)
    grouped.set(dayKey, items)
  })

  return [...grouped.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([date, entries]) => summarizeDayEntries(date, entries))
}

export function openDailyRecallFile(items: DailyRecallItem[], userProfile: UserProfile | null) {
  if (typeof window === 'undefined') {
    return
  }

  const displayName = userProfile ? getProfileDisplayName(userProfile) : '这位使用者'
  const summary = userProfile
    ? buildProfileSummary(userProfile)
    : '这是一份由岁语整理的日常回想卡，仅供自己回看或陪伴者陪同使用。'
  const cardsHtml = items
    .map((item, index) => `
      <article class="card">
        <div class="card-top">
          <span class="index">第 ${index + 1} 题</span>
          <span class="label">${escapeHtml(item.referenceLabel)}</span>
        </div>
        <h2>${escapeHtml(item.prompt)}</h2>
        <p class="cue">温柔提示：${escapeHtml(item.cue)}</p>
        <div class="answer-box">
          <p class="answer-title">需要时可看一眼的熟悉线索</p>
          <p class="answer-text">${escapeHtml(item.referenceText).replace(/\n/g, '<br />')}</p>
        </div>
      </article>
    `)
    .join('')

  const nextWindow = window.open('', '_blank', 'width=980,height=1200')
  if (!nextWindow) {
    throw new Error('浏览器拦截了新窗口，请允许弹窗后再试')
  }

  const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(displayName)}的日常回想卡</title>
        <style>
          @page { size: A4; margin: 16mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #f7efe3;
            color: #4d3d30;
            font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
            line-height: 1.7;
          }
          .page {
            max-width: 920px;
            margin: 0 auto;
            padding: 28px 22px 42px;
          }
          .hero {
            border-radius: 28px;
            padding: 26px;
            background: linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,248,240,0.96));
            border: 1px solid rgba(193,166,141,0.45);
          }
          .eyebrow {
            display: inline-block;
            padding: 8px 14px;
            border-radius: 999px;
            background: rgba(240,222,203,0.85);
            color: #8a6547;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.08em;
          }
          h1 {
            margin: 16px 0 10px;
            font-size: 34px;
            line-height: 1.25;
          }
          .summary, .note {
            margin: 10px 0 0;
            font-size: 16px;
            color: #6a584a;
          }
          .cards {
            display: grid;
            gap: 18px;
            margin-top: 22px;
          }
          .card {
            page-break-inside: avoid;
            border-radius: 24px;
            padding: 20px;
            background: rgba(255,252,247,0.96);
            border: 1px solid rgba(193,166,141,0.38);
          }
          .card-top {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
            color: #8a745f;
            font-size: 13px;
          }
          .index {
            font-weight: 700;
          }
          h2 {
            margin: 14px 0 0;
            font-size: 22px;
            line-height: 1.45;
            color: #4b3628;
          }
          .cue {
            margin: 14px 0 0;
            color: #6b594c;
          }
          .answer-box {
            margin-top: 16px;
            border-radius: 18px;
            padding: 16px;
            background: rgba(250,244,236,0.95);
          }
          .answer-title {
            margin: 0;
            font-size: 13px;
            color: #8a745f;
          }
          .answer-text {
            margin: 10px 0 0;
            font-size: 16px;
            color: #4d3d30;
          }
          @media print {
            body { background: #ffffff; }
            .page { max-width: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <main class="page">
          <section class="hero">
            <div class="eyebrow">岁语 · 日常回想卡</div>
            <h1>${escapeHtml(displayName)}的每日回想文件</h1>
            <p class="summary">${escapeHtml(summary)}</p>
            <p class="note">这份内容仅作日常回想与陪伴参考，不替代医学诊断。如果近期回想困难明显增加，建议由家人陪同并咨询专业医生。</p>
          </section>
          <section class="cards">${cardsHtml}</section>
        </main>
      </body>
    </html>
  `

  nextWindow.document.open()
  nextWindow.document.write(html)
  nextWindow.document.close()

  const triggerPrint = () => {
    nextWindow.focus()
    window.setTimeout(() => {
      nextWindow.print()
    }, 220)
  }

  if (nextWindow.document.readyState === 'complete') {
    triggerPrint()
    return
  }

  nextWindow.addEventListener('load', triggerPrint, { once: true })
}
