import type { CSSProperties } from 'react'
import type { Memory, PhotoAttachment } from '../App'

export interface JourneyBackdrop {
  id: string
  label: string
  mapLabel: string
  description: string
  gradient: string
  accent: string
  cardTint: string
}

export interface JourneyScene {
  id: string
  index: number
  title: string
  subtitle: string
  quote: string
  excerpt: string
  category: string
  emotionLabel: string
  timeLabel: string
  backdrop: JourneyBackdrop
  heroPhoto: PhotoAttachment | null
  photos: PhotoAttachment[]
  imageDescription: string
  videoPrompt: string
  narrationPrompt: string
  question: string
  answer: string
}

export interface DigitalAvatarProfile {
  name: string
  title: string
  intro: string
  appearance: string
  auraTags: string[]
}

export interface JourneyExperience {
  title: string
  subtitle: string
  readinessLabel: string
  avatar: DigitalAvatarProfile
  scenes: JourneyScene[]
  totalPhotoCount: number
  totalCategories: number
}

interface BackdropTemplate extends JourneyBackdrop {
  keywords: string[]
}

const backdropTemplates: BackdropTemplate[] = [
  {
    id: 'hometown',
    label: '故乡老屋',
    mapLabel: '老屋巷口',
    description: '旧木门、炊烟和晒谷场的气息，会让人自然想起小时候的家。',
    gradient:
      'linear-gradient(135deg, rgba(119, 70, 45, 0.92) 0%, rgba(214, 166, 111, 0.78) 52%, rgba(252, 233, 203, 0.92) 100%)',
    accent: 'rgba(255, 227, 175, 0.38)',
    cardTint: 'rgba(84, 49, 26, 0.22)',
    keywords: ['老家', '故乡', '家里', '院子', '村', '巷子', '灶台', '门口', '堂屋', '土路'],
  },
  {
    id: 'school',
    label: '校园时光',
    mapLabel: '校园长廊',
    description: '走廊、操场和铃声，会把回忆拉回到求学时代的清晨与黄昏。',
    gradient:
      'linear-gradient(135deg, rgba(68, 97, 71, 0.92) 0%, rgba(120, 164, 122, 0.82) 48%, rgba(232, 241, 204, 0.9) 100%)',
    accent: 'rgba(221, 247, 174, 0.3)',
    cardTint: 'rgba(48, 84, 55, 0.2)',
    keywords: ['学校', '教室', '老师', '同学', '校园', '操场', '读书', '上学', '课桌', '黑板'],
  },
  {
    id: 'factory',
    label: '奋斗年代',
    mapLabel: '车间大道',
    description: '车间、工地和早班车的节奏，会让人生的奋斗感更具体。',
    gradient:
      'linear-gradient(135deg, rgba(70, 84, 109, 0.94) 0%, rgba(117, 139, 173, 0.82) 45%, rgba(234, 226, 211, 0.9) 100%)',
    accent: 'rgba(176, 201, 245, 0.28)',
    cardTint: 'rgba(52, 67, 94, 0.2)',
    keywords: ['工厂', '车间', '单位', '上班', '工地', '师傅', '生产队', '厂里', '岗位', '机器'],
  },
  {
    id: 'waterside',
    label: '河岸旧梦',
    mapLabel: '江边栈道',
    description: '河流、码头和桥边晚风，会把记忆变得更舒展、更有电影感。',
    gradient:
      'linear-gradient(135deg, rgba(42, 83, 108, 0.94) 0%, rgba(91, 145, 168, 0.82) 45%, rgba(216, 242, 245, 0.92) 100%)',
    accent: 'rgba(161, 231, 237, 0.28)',
    cardTint: 'rgba(33, 74, 96, 0.22)',
    keywords: ['河', '江', '湖', '海', '桥', '码头', '渡口', '船', '水边', '岸边'],
  },
  {
    id: 'city',
    label: '城市街景',
    mapLabel: '城市街角',
    description: '霓虹、巷口小店和公交站牌，适合承载人生转折与重逢。',
    gradient:
      'linear-gradient(135deg, rgba(84, 55, 85, 0.94) 0%, rgba(147, 95, 132, 0.82) 48%, rgba(242, 221, 208, 0.92) 100%)',
    accent: 'rgba(233, 185, 225, 0.28)',
    cardTint: 'rgba(87, 49, 78, 0.22)',
    keywords: ['城市', '街上', '车站', '市场', '商店', '城里', '公交', '电影院', '医院', '广场'],
  },
  {
    id: 'family',
    label: '家人团聚',
    mapLabel: '团圆庭院',
    description: '饭桌、灯火和团圆时刻，最适合承载亲情与爱意的记忆。',
    gradient:
      'linear-gradient(135deg, rgba(136, 77, 63, 0.94) 0%, rgba(205, 126, 100, 0.82) 45%, rgba(253, 229, 201, 0.92) 100%)',
    accent: 'rgba(255, 205, 176, 0.32)',
    cardTint: 'rgba(118, 62, 49, 0.2)',
    keywords: ['家人', '父母', '爱人', '孩子', '结婚', '过年', '团圆', '厨房', '饭桌', '亲戚'],
  },
  {
    id: 'journey',
    label: '远行足迹',
    mapLabel: '旅途站台',
    description: '车票、站台和路上的风景，适合表现人生路上的迁徙与冒险。',
    gradient:
      'linear-gradient(135deg, rgba(95, 67, 44, 0.94) 0%, rgba(182, 140, 89, 0.82) 42%, rgba(250, 236, 192, 0.92) 100%)',
    accent: 'rgba(244, 219, 159, 0.3)',
    cardTint: 'rgba(109, 76, 40, 0.2)',
    keywords: ['火车', '旅行', '远行', '站台', '汽车', '搬家', '外地', '出发', '回乡', '一路上'],
  },
]

const categoryFallbackBackdrop: Record<string, string> = {
  童年时光: 'hometown',
  童年记忆: 'hometown',
  青春岁月: 'school',
  求学成长: 'school',
  初入社会: 'journey',
  工作事业: 'factory',
  家庭故事: 'family',
  婚恋家庭: 'family',
  家庭责任: 'family',
  晚年生活: 'waterside',
  人生智慧: 'journey',
  人生体悟: 'journey',
  时代记忆: 'city',
}

function formatSceneTime(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

function shortenText(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength).trim()}……`
}

function getEmotionLabel(emotion: Memory['emotion']) {
  if (emotion === 'positive') {
    return '温暖闪光'
  }

  if (emotion === 'attention') {
    return '人生感悟'
  }

  return '细水长流'
}

function pickBackdrop(memory: Memory): JourneyBackdrop {
  const haystack = `${memory.question} ${memory.answer} ${memory.category}`.toLowerCase()
  let matchedTemplate: BackdropTemplate | null = null
  let maxScore = 0

  backdropTemplates.forEach((template) => {
    const score = template.keywords.reduce(
      (total, keyword) => total + (haystack.includes(keyword.toLowerCase()) ? 1 : 0),
      0,
    )

    if (score > maxScore) {
      maxScore = score
      matchedTemplate = template
    }
  })

  if (matchedTemplate) {
    return matchedTemplate
  }

  const fallbackId = categoryFallbackBackdrop[memory.category] ?? 'hometown'
  return backdropTemplates.find((template) => template.id === fallbackId) ?? backdropTemplates[0]
}

function buildSceneTitle(memory: Memory, backdrop: JourneyBackdrop, index: number) {
  const shortAnswer = shortenText(memory.answer.replace(/[。！!？?]/g, ' ').trim(), 12)
  if (shortAnswer) {
    return `${backdrop.mapLabel} · ${shortAnswer}`
  }

  return `${backdrop.mapLabel} · 第 ${index + 1} 站`
}

function createVideoPrompt(memory: Memory, backdrop: JourneyBackdrop) {
  const answerSnippet = shortenText(memory.answer, 56)
  return `镜头从${backdrop.mapLabel}的远景缓慢推进，数字人边走边讲：“${answerSnippet}”，画面里保留${backdrop.description}`
}

function createNarrationPrompt(memory: Memory, backdrop: JourneyBackdrop) {
  return `请用温和、缓慢的语气讲述这一幕，重点突出${backdrop.label}的空间感，以及“${shortenText(memory.answer, 36)}”带来的情绪余味。`
}

function buildAvatar(memories: Memory[], scenes: JourneyScene[], totalPhotoCount: number): DigitalAvatarProfile {
  const backdropFrequency = new Map<string, number>()
  const categoryFrequency = new Map<string, number>()
  const emotionFrequency = new Map<string, number>()

  scenes.forEach((scene) => {
    backdropFrequency.set(scene.backdrop.id, (backdropFrequency.get(scene.backdrop.id) ?? 0) + 1)
  })

  memories.forEach((memory) => {
    categoryFrequency.set(memory.category, (categoryFrequency.get(memory.category) ?? 0) + 1)
    emotionFrequency.set(memory.emotion, (emotionFrequency.get(memory.emotion) ?? 0) + 1)
  })

  const dominantBackdropId =
    [...backdropFrequency.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'hometown'
  const dominantCategory =
    [...categoryFrequency.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? '人生故事'
  const dominantEmotion =
    [...emotionFrequency.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'neutral'

  const dominantBackdrop =
    backdropTemplates.find((template) => template.id === dominantBackdropId) ?? backdropTemplates[0]

  const emotionTitle =
    dominantEmotion === 'positive'
      ? '温暖讲述者'
      : dominantEmotion === 'attention'
        ? '坚韧回望者'
        : '岁月收藏家'

  return {
    name: '岁语数字人',
    title: `${dominantBackdrop.label}的${emotionTitle}`,
    intro: `已从 ${memories.length} 段回忆里提炼出一位可以在地图中陪伴家人重走人生的讲述者，主线集中在“${dominantCategory}”。`,
    appearance: `建议形象为银发、温和眼神、带有${dominantBackdrop.label}色调的衣着，让数字人一出场就和回忆里的空间气味连在一起。`,
    auraTags: [
      dominantBackdrop.mapLabel,
      `${memories.length} 段人生场景`,
      totalPhotoCount > 0 ? `${totalPhotoCount} 张老照片已融入地图` : '可继续补充老照片',
    ],
  }
}

export function buildJourneyExperience(memories: Memory[]): JourneyExperience {
  const sortedMemories = [...memories].sort(
    (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  )

  const scenes = sortedMemories.map((memory, index) => {
    const backdrop = pickBackdrop(memory)
    const heroPhoto = memory.photos[0] ?? null
    const quote = shortenText(memory.answer, 48)

    return {
      id: memory.id,
      index,
      title: buildSceneTitle(memory, backdrop, index),
      subtitle: `第 ${index + 1} 站 · ${memory.category}`,
      quote,
      excerpt: shortenText(memory.answer, 110),
      category: memory.category,
      emotionLabel: getEmotionLabel(memory.emotion),
      timeLabel: formatSceneTime(memory.timestamp),
      backdrop,
      heroPhoto,
      photos: memory.photos,
      imageDescription: heroPhoto
        ? '已使用用户上传的老照片作为场景回看素材'
        : `建议补充一张带有“${backdrop.mapLabel}”气质的照片，强化回忆代入感`,
      videoPrompt: createVideoPrompt(memory, backdrop),
      narrationPrompt: createNarrationPrompt(memory, backdrop),
      question: memory.question,
      answer: memory.answer,
    }
  })

  const totalPhotoCount = memories.reduce(
    (count, memory) => count + memory.photos.length,
    0,
  )

  const avatar = buildAvatar(memories, scenes, totalPhotoCount)
  const journeyTitle =
    scenes.length > 0
      ? `沿着 ${scenes.length} 个场景，重走人生地图`
      : '回忆地图尚未开启'

  return {
    title: journeyTitle,
    subtitle:
      scenes.length > 0
        ? '系统会把每段回忆转成一个可行走的站点，用数字人、场景背景和多媒体内容把故事重新排布。'
        : '先记录几段重要回忆，地图平台才有足够内容来生成数字人和场景。',
    readinessLabel:
      scenes.length >= 4
        ? '回忆录已具备沉浸式地图浏览条件'
        : '建议至少累积 4 段回忆，地图会更完整',
    avatar,
    scenes,
    totalPhotoCount,
    totalCategories: new Set(memories.map((memory) => memory.category)).size,
  }
}

export function buildBackdropStyle(scene: JourneyScene): CSSProperties {
  if (scene.heroPhoto) {
    return {
      backgroundImage: `linear-gradient(135deg, rgba(37, 24, 18, 0.76), rgba(255, 241, 220, 0.18)), url(${scene.heroPhoto.dataUrl})`,
      backgroundPosition: 'center',
      backgroundSize: 'cover',
    }
  }

  return {
    backgroundImage: scene.backdrop.gradient,
  }
}
