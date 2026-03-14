import type { Memory, PhotoAttachment } from '../App'

export type ImportantPersonTheme = 'family' | 'work' | 'study' | 'social'

export interface ImportantPersonSceneLink {
  memoryId: string
  category: string
  question: string
  excerpt: string
  timestamp: Date
  photo: PhotoAttachment | null
}

export interface ImportantPerson {
  id: string
  displayName: string
  relationLabel: string
  groupLabel: string
  theme: ImportantPersonTheme
  mentionCount: number
  memoryCount: number
  importanceScore: number
  summary: string
  detailPrompt: string
  clueTags: string[]
  photo: PhotoAttachment | null
  relatedSceneIds: string[]
  anchorMemoryId: string
  scenes: ImportantPersonSceneLink[]
}

interface RelationshipDefinition {
  key: string
  aliases: string[]
  canonicalLabel: string
  groupLabel: string
  theme: ImportantPersonTheme
  priority: number
  detailPrompt: string
  clueTags: string[]
}

interface RelationshipMatch {
  definition: RelationshipDefinition
  alias: string
  displayName: string
  hitCount: number
  excerpt: string
}

interface AggregatedPerson {
  id: string
  displayName: string
  relationLabel: string
  groupLabel: string
  theme: ImportantPersonTheme
  mentionCount: number
  memoryCount: number
  importanceScore: number
  detailPrompt: string
  clueTags: Set<string>
  photo: PhotoAttachment | null
  relatedSceneIds: Set<string>
  anchorMemoryId: string
  anchorExcerpt: string
  anchorCategory: string
  anchorScore: number
  scenes: ImportantPersonSceneLink[]
}

const relationshipDefinitions: RelationshipDefinition[] = [
  {
    key: 'father',
    aliases: ['父亲', '爸爸', '老爸', '阿爸'],
    canonicalLabel: '父亲',
    groupLabel: '原生家庭',
    theme: 'family',
    priority: 10,
    detailPrompt: '可以继续想想他平时怎么称呼您、最常说的一句话，或者您最难忘的一次陪伴。',
    clueTags: ['父辈', '家庭', '童年'],
  },
  {
    key: 'mother',
    aliases: ['母亲', '妈妈', '老妈'],
    canonicalLabel: '母亲',
    groupLabel: '原生家庭',
    theme: 'family',
    priority: 10,
    detailPrompt: '可以继续想想她平时做的事情、说话语气，或者您最想留下的一顿饭、一句叮嘱。',
    clueTags: ['母亲', '家庭', '照料'],
  },
  {
    key: 'parents',
    aliases: ['父母', '爸妈', '爹娘'],
    canonicalLabel: '父母',
    groupLabel: '原生家庭',
    theme: 'family',
    priority: 9,
    detailPrompt: '可以从家里的称呼、住处布局，或者一家人在一起时最常发生的事情开始回想。',
    clueTags: ['父母', '家庭', '老家'],
  },
  {
    key: 'spouse',
    aliases: ['老伴', '爱人', '丈夫', '妻子', '先生', '太太', '对象'],
    canonicalLabel: '伴侣',
    groupLabel: '婚恋家庭',
    theme: 'family',
    priority: 10,
    detailPrompt: '可以继续讲讲你们如何认识、平时怎么称呼彼此，或者最难忘的一件小事。',
    clueTags: ['伴侣', '婚姻', '相伴'],
  },
  {
    key: 'son',
    aliases: ['儿子'],
    canonicalLabel: '儿子',
    groupLabel: '孩子和晚辈',
    theme: 'family',
    priority: 9,
    detailPrompt: '可以想想他小时候的样子、第一次让您骄傲的瞬间，或者你们现在最常聊什么。',
    clueTags: ['儿子', '孩子', '成长'],
  },
  {
    key: 'daughter',
    aliases: ['女儿'],
    canonicalLabel: '女儿',
    groupLabel: '孩子和晚辈',
    theme: 'family',
    priority: 9,
    detailPrompt: '可以想想她小时候的样子、最贴心的一次陪伴，或者您现在最想对她说的话。',
    clueTags: ['女儿', '孩子', '成长'],
  },
  {
    key: 'children',
    aliases: ['孩子', '子女'],
    canonicalLabel: '孩子',
    groupLabel: '孩子和晚辈',
    theme: 'family',
    priority: 8,
    detailPrompt: '可以先从排行、昵称，或者脑海里第一个浮现的那位晚辈讲起。',
    clueTags: ['孩子', '家庭', '照顾'],
  },
  {
    key: 'grandson',
    aliases: ['孙子', '外孙'],
    canonicalLabel: '孙子',
    groupLabel: '孙辈',
    theme: 'family',
    priority: 8,
    detailPrompt: '可以想想他小时候最可爱的地方，或者现在最让您惦记的一件事。',
    clueTags: ['孙子', '孙辈', '陪伴'],
  },
  {
    key: 'granddaughter',
    aliases: ['孙女', '外孙女'],
    canonicalLabel: '孙女',
    groupLabel: '孙辈',
    theme: 'family',
    priority: 8,
    detailPrompt: '可以想想她最爱叫您的方式、一起做过的事情，或者最让您开心的一次见面。',
    clueTags: ['孙女', '孙辈', '陪伴'],
  },
  {
    key: 'grandchildren',
    aliases: ['孙辈', '晚辈'],
    canonicalLabel: '孙辈',
    groupLabel: '孙辈',
    theme: 'family',
    priority: 7,
    detailPrompt: '可以先从家里最常见到的那位晚辈开始，慢慢回想他们给生活带来的变化。',
    clueTags: ['孙辈', '晚辈', '家庭'],
  },
  {
    key: 'teacher',
    aliases: ['老师', '班主任'],
    canonicalLabel: '老师',
    groupLabel: '求学阶段的人',
    theme: 'study',
    priority: 7,
    detailPrompt: '可以继续回想老师的名字、口头禅、课堂样子，或者最影响您的一次教导。',
    clueTags: ['老师', '学校', '成长'],
  },
  {
    key: 'classmate',
    aliases: ['同学'],
    canonicalLabel: '同学',
    groupLabel: '求学阶段的人',
    theme: 'study',
    priority: 6,
    detailPrompt: '可以继续回想那位同学的名字、座位、一起做过的事，或者后来是否还联系。',
    clueTags: ['同学', '学校', '青春'],
  },
  {
    key: 'friend',
    aliases: ['朋友', '好友'],
    canonicalLabel: '朋友',
    groupLabel: '朋友与邻里',
    theme: 'social',
    priority: 6,
    detailPrompt: '可以继续讲讲你们平时怎么来往、最谈得来什么，或者为什么一直记着这个人。',
    clueTags: ['朋友', '往来', '情义'],
  },
  {
    key: 'neighbor',
    aliases: ['邻居', '街坊'],
    canonicalLabel: '邻居',
    groupLabel: '朋友与邻里',
    theme: 'social',
    priority: 5,
    detailPrompt: '可以继续回想住得多近、平时怎么串门，或者哪件小事最让您记住这位邻里。',
    clueTags: ['邻里', '街坊', '老家'],
  },
  {
    key: 'colleague',
    aliases: ['同事', '工友'],
    canonicalLabel: '同事',
    groupLabel: '工作伙伴',
    theme: 'work',
    priority: 7,
    detailPrompt: '可以继续想想那时一起上班的人、岗位分工，或者最深的一次互相帮忙。',
    clueTags: ['同事', '工作', '单位'],
  },
  {
    key: 'master',
    aliases: ['师傅'],
    canonicalLabel: '师傅',
    groupLabel: '工作伙伴',
    theme: 'work',
    priority: 7,
    detailPrompt: '可以继续讲讲他教过您什么、本事有多厉害，或者最让您服气的一次经历。',
    clueTags: ['师傅', '工作', '传帮带'],
  },
]

const genericSuppressionMap: Record<string, string[]> = {
  parents: ['father', 'mother'],
  children: ['son', 'daughter'],
  grandchildren: ['grandson', 'granddaughter'],
}

const PLACE_SUFFIXES = [
  '省',
  '市',
  '区',
  '县',
  '镇',
  '乡',
  '村',
  '街',
  '路',
  '巷',
  '里',
  '湾',
  '河',
  '江',
  '湖',
  '海',
  '山',
  '桥',
  '站',
  '港',
  '广场',
  '厂',
  '校',
  '院',
  '馆',
  '场',
  '园',
  '道',
]

const GENERIC_PLACES = [
  '学校',
  '教室',
  '操场',
  '车站',
  '火车站',
  '医院',
  '市场',
  '菜市场',
  '商店',
  '工厂',
  '车间',
  '码头',
  '街口',
  '巷口',
  '田里',
  '河边',
  '江边',
  '海边',
  '广场',
  '公园',
  '礼堂',
  '电影院',
]

function createStableId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\u4e00-\u9fff]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

export function extractPlaceCandidates(text: string) {
  if (!text) {
    return []
  }

  const results: Array<{ value: string; index: number }> = []
  const pattern = new RegExp(`([\\u4e00-\\u9fa5]{2,8}(?:${PLACE_SUFFIXES.join('|')}))`, 'g')
  let match = pattern.exec(text)

  while (match) {
    const value = match[1]
    if (value && !results.some((item) => item.value === value)) {
      results.push({ value, index: match.index })
    }
    match = pattern.exec(text)
  }

  GENERIC_PLACES.forEach((place) => {
    const index = text.indexOf(place)
    if (index >= 0 && !results.some((item) => item.value === place)) {
      results.push({ value: place, index })
    }
  })

  return results
    .sort((left, right) => left.index - right.index)
    .map((item) => item.value)
}

function truncateText(value: string, maxLength: number) {
  const trimmed = value.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= maxLength) {
    return trimmed
  }

  return `${trimmed.slice(0, maxLength).trim()}……`
}

function countHits(text: string, aliases: string[]) {
  return aliases.reduce((total, alias) => {
    const pattern = new RegExp(alias, 'g')
    return total + (text.match(pattern)?.length ?? 0)
  }, 0)
}

function pickAlias(text: string, aliases: string[]) {
  return aliases.find((alias) => text.includes(alias)) ?? null
}

function splitSentences(text: string) {
  return text
    .split(/(?<=[。！？!?；;\n])/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function findExcerpt(text: string, aliases: string[]) {
  const sentences = splitSentences(text)
  const matched = sentences.find((sentence) =>
    aliases.some((alias) => sentence.includes(alias)),
  )

  return truncateText(matched ?? text, 80)
}

function findNamedDisplayName(definition: RelationshipDefinition, text: string) {
  if (definition.key === 'teacher') {
    return text.match(/([老小阿]?[一-龥]{1,3}(?:老师|班主任))/)?.[1] ?? null
  }

  if (definition.key === 'master') {
    return text.match(/([老小阿]?[一-龥]{1,3}师傅)/)?.[1] ?? null
  }

  return null
}

function shouldSuppressGenericMatch(
  definition: RelationshipDefinition,
  matchedKeys: Set<string>,
) {
  const suppressedBy = genericSuppressionMap[definition.key]
  if (!suppressedBy) {
    return false
  }

  return suppressedBy.some((key) => matchedKeys.has(key))
}

function buildDisplayName(
  definition: RelationshipDefinition,
  alias: string,
  text: string,
) {
  if (definition.theme === 'family') {
    return alias
  }

  return findNamedDisplayName(definition, text) ?? alias
}

function getAggregateKey(definition: RelationshipDefinition, displayName: string) {
  if (definition.theme === 'family') {
    return definition.key
  }

  return `${definition.key}:${displayName}`
}

function scoreMatch(
  definition: RelationshipDefinition,
  memory: Memory,
  hitCount: number,
  hasPhoto: boolean,
) {
  let score = definition.priority * 5 + hitCount * 2

  if (memory.photos.length > 0 && hasPhoto) {
    score += 4
  }

  if (memory.category.includes('家庭') || memory.category.includes('婚恋')) {
    score += definition.theme === 'family' ? 4 : 0
  }

  if (memory.category.includes('工作')) {
    score += definition.theme === 'work' ? 3 : 0
  }

  if (memory.category.includes('求学') || memory.category.includes('童年')) {
    score += definition.theme === 'study' ? 3 : 0
  }

  return score
}

function buildSummary(person: AggregatedPerson) {
  if (person.memoryCount <= 1) {
    return `您在“${person.anchorCategory}”这段回忆里提到过${person.displayName}：${person.anchorExcerpt}`
  }

  return `您在 ${person.memoryCount} 段回忆里提到过${person.displayName}。最集中的线索来自“${person.anchorCategory}”：${person.anchorExcerpt}`
}

function buildRelationshipMatches(memory: Memory) {
  const haystack = `${memory.question} ${memory.answer} ${memory.category}`
  const preliminaryMatches: RelationshipMatch[] = []

  relationshipDefinitions.forEach((definition) => {
    const alias = pickAlias(haystack, definition.aliases)
    if (!alias) {
      return
    }

    preliminaryMatches.push({
      definition,
      alias,
      displayName: buildDisplayName(definition, alias, memory.answer),
      hitCount: Math.max(1, countHits(haystack, definition.aliases)),
      excerpt: findExcerpt(memory.answer, definition.aliases),
    })
  })

  const matchedKeys = new Set(preliminaryMatches.map((item) => item.definition.key))

  return preliminaryMatches.filter(
    (match) => !shouldSuppressGenericMatch(match.definition, matchedKeys),
  )
}

export function buildImportantPeople(memories: Memory[]) {
  const aggregated = new Map<string, AggregatedPerson>()

  memories.forEach((memory) => {
    const matches = buildRelationshipMatches(memory)
    if (!matches.length) {
      return
    }

    matches.forEach((match) => {
      const aggregateKey = getAggregateKey(match.definition, match.displayName)
      const photo = memory.photos[0] ?? null
      const score = scoreMatch(match.definition, memory, match.hitCount, Boolean(photo))
      const sceneLink: ImportantPersonSceneLink = {
        memoryId: memory.id,
        category: memory.category,
        question: memory.question,
        excerpt: match.excerpt,
        timestamp: memory.timestamp,
        photo,
      }

      const existing = aggregated.get(aggregateKey)
      if (!existing) {
        aggregated.set(aggregateKey, {
          id: createStableId(aggregateKey),
          displayName: match.displayName,
          relationLabel: match.definition.canonicalLabel,
          groupLabel: match.definition.groupLabel,
          theme: match.definition.theme,
          mentionCount: match.hitCount,
          memoryCount: 1,
          importanceScore: score,
          detailPrompt: match.definition.detailPrompt,
          clueTags: new Set([...match.definition.clueTags, memory.category]),
          photo,
          relatedSceneIds: new Set([memory.id]),
          anchorMemoryId: memory.id,
          anchorExcerpt: match.excerpt,
          anchorCategory: memory.category,
          anchorScore: score,
          scenes: [sceneLink],
        })
        return
      }

      existing.mentionCount += match.hitCount
      existing.importanceScore += score
      existing.clueTags.add(memory.category)
      existing.relatedSceneIds.add(memory.id)

      if (!existing.scenes.some((scene) => scene.memoryId === memory.id)) {
        existing.scenes.push(sceneLink)
        existing.memoryCount += 1
      }

      if (!existing.photo && photo) {
        existing.photo = photo
      }

      if (score > existing.anchorScore || match.excerpt.length > existing.anchorExcerpt.length) {
        existing.anchorMemoryId = memory.id
        existing.anchorExcerpt = match.excerpt
        existing.anchorCategory = memory.category
        existing.anchorScore = score
      }
    })
  })

  return [...aggregated.values()]
    .map((person) => ({
      id: person.id,
      displayName: person.displayName,
      relationLabel: person.relationLabel,
      groupLabel: person.groupLabel,
      theme: person.theme,
      mentionCount: person.mentionCount,
      memoryCount: person.memoryCount,
      importanceScore: person.importanceScore,
      summary: buildSummary(person),
      detailPrompt: person.detailPrompt,
      clueTags: [...person.clueTags].slice(0, 6),
      photo: person.photo,
      relatedSceneIds: [...person.relatedSceneIds],
      anchorMemoryId: person.anchorMemoryId,
      scenes: person.scenes.sort(
        (left, right) => left.timestamp.getTime() - right.timestamp.getTime(),
      ),
    }))
    .sort((left, right) => {
      if (right.importanceScore !== left.importanceScore) {
        return right.importanceScore - left.importanceScore
      }

      return right.memoryCount - left.memoryCount
    })
}

export function buildImportantPeopleBySceneId(people: ImportantPerson[]) {
  const map: Record<string, ImportantPerson[]> = {}

  people.forEach((person) => {
    person.relatedSceneIds.forEach((sceneId) => {
      if (!map[sceneId]) {
        map[sceneId] = []
      }

      map[sceneId].push(person)
    })
  })

  Object.values(map).forEach((items) =>
    items.sort((left, right) => right.importanceScore - left.importanceScore),
  )

  return map
}
