import type { Memory, PhotoAttachment } from '../App'
import type { UserProfile } from './userProfile'
import { buildProfileSummary, getProfileDisplayName } from './userProfile'

export type FamilyTreeGenerationId = 'parents' | 'self' | 'children' | 'grandchildren'

export interface FamilyTreeMember {
  id: string
  relationKey: string
  generation: FamilyTreeGenerationId
  displayName: string
  relationLabel: string
  summary: string
  sourceLabel: string
  photo: PhotoAttachment | null
  isSelf: boolean
  sortOrder: number
}

export interface FamilyTreeLevel {
  id: FamilyTreeGenerationId
  title: string
  description: string
  members: FamilyTreeMember[]
}

export interface FamilyTreeData {
  subjectName: string
  levels: FamilyTreeLevel[]
  totalMembers: number
  relativeCount: number
  photoCount: number
}

interface FamilyRelationDefinition {
  key: string
  aliases: string[]
  canonicalLabel: string
  generation: FamilyTreeGenerationId
  sortOrder: number
  allowMultiple: boolean
}

interface FamilyMentionCandidate {
  definition: FamilyRelationDefinition
  matchedAlias: string
  displayName: string
  summary: string
  sourceLabel: string
  photo: PhotoAttachment | null
  score: number
}

interface AggregatedFamilyMember extends FamilyTreeMember {
  displayScore: number
  anchorScore: number
}

const levelOrder: FamilyTreeGenerationId[] = ['parents', 'self', 'children', 'grandchildren']

const levelLabels: Record<FamilyTreeGenerationId, { title: string; description: string }> = {
  parents: {
    title: '父母层',
    description: '原生家庭与长辈线索',
  },
  self: {
    title: '个人层',
    description: '本人、兄弟姐妹与伴侣',
  },
  children: {
    title: '子女层',
    description: '孩子一辈的回忆线索',
  },
  grandchildren: {
    title: '孙辈层',
    description: '孙辈与外孙辈线索',
  },
}

const relationDefinitions: FamilyRelationDefinition[] = [
  {
    key: 'father',
    aliases: ['父亲', '爸爸', '老爸', '阿爸'],
    canonicalLabel: '父亲',
    generation: 'parents',
    sortOrder: 10,
    allowMultiple: false,
  },
  {
    key: 'mother',
    aliases: ['母亲', '妈妈', '老妈'],
    canonicalLabel: '母亲',
    generation: 'parents',
    sortOrder: 20,
    allowMultiple: false,
  },
  {
    key: 'parents',
    aliases: ['父母', '爸妈', '爹娘'],
    canonicalLabel: '父母',
    generation: 'parents',
    sortOrder: 15,
    allowMultiple: false,
  },
  {
    key: 'brother',
    aliases: ['哥哥', '弟弟', '兄长', '兄弟'],
    canonicalLabel: '兄弟',
    generation: 'self',
    sortOrder: 20,
    allowMultiple: true,
  },
  {
    key: 'sister',
    aliases: ['姐姐', '妹妹', '姐妹'],
    canonicalLabel: '姐妹',
    generation: 'self',
    sortOrder: 30,
    allowMultiple: true,
  },
  {
    key: 'siblings',
    aliases: ['兄弟姐妹', '手足', '兄妹', '姐弟'],
    canonicalLabel: '兄弟姐妹',
    generation: 'self',
    sortOrder: 25,
    allowMultiple: false,
  },
  {
    key: 'spouse',
    aliases: ['妻子', '爱人', '老伴', '伴侣', '老婆', '丈夫', '先生', '太太', '对象'],
    canonicalLabel: '伴侣',
    generation: 'self',
    sortOrder: 80,
    allowMultiple: false,
  },
  {
    key: 'son',
    aliases: ['儿子'],
    canonicalLabel: '儿子',
    generation: 'children',
    sortOrder: 10,
    allowMultiple: true,
  },
  {
    key: 'daughter',
    aliases: ['女儿', '闺女'],
    canonicalLabel: '女儿',
    generation: 'children',
    sortOrder: 20,
    allowMultiple: true,
  },
  {
    key: 'children',
    aliases: ['孩子', '子女'],
    canonicalLabel: '子女',
    generation: 'children',
    sortOrder: 15,
    allowMultiple: false,
  },
  {
    key: 'grandson',
    aliases: ['孙子', '外孙'],
    canonicalLabel: '孙辈',
    generation: 'grandchildren',
    sortOrder: 10,
    allowMultiple: true,
  },
  {
    key: 'granddaughter',
    aliases: ['孙女', '外孙女'],
    canonicalLabel: '孙辈',
    generation: 'grandchildren',
    sortOrder: 20,
    allowMultiple: true,
  },
  {
    key: 'grandchildren',
    aliases: ['孙辈', '晚辈'],
    canonicalLabel: '孙辈',
    generation: 'grandchildren',
    sortOrder: 15,
    allowMultiple: false,
  },
]

const genericSuppressionMap: Record<string, string[]> = {
  parents: ['father', 'mother'],
  siblings: ['brother', 'sister'],
  children: ['son', 'daughter'],
  grandchildren: ['grandson', 'granddaughter'],
}

const blockedNameFragments = new Set([
  '一起',
  '我们',
  '他们',
  '后来',
  '现在',
  '以前',
  '那个',
  '这位',
  '那位',
  '家里',
  '一直',
  '经常',
  '常常',
  '还有',
  '就是',
  '也是',
  '时候',
  '当时',
  '跟我',
  '和我',
  '让我',
  '给我',
  '带我',
  '我的',
  '他的',
  '她的',
  '一个',
  '一个人',
])

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function createStableId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\u4e00-\u9fff]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function shortenText(value: string, maxLength: number) {
  const trimmed = normalizeText(value)
  if (trimmed.length <= maxLength) {
    return trimmed
  }

  return `${trimmed.slice(0, maxLength).trim()}……`
}

function splitSentences(text: string) {
  return normalizeText(text)
    .split(/(?<=[。！？!?；;\n])/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function findExcerpt(text: string, aliases: string[]) {
  const sentences = splitSentences(text)
  const matched = sentences.find((sentence) =>
    aliases.some((alias) => sentence.includes(alias)),
  )

  return shortenText(matched ?? text, 50)
}

function countHits(text: string, aliases: string[]) {
  return aliases.reduce((total, alias) => {
    const pattern = new RegExp(escapeRegex(alias), 'g')
    return total + (text.match(pattern)?.length ?? 0)
  }, 0)
}

function pickAlias(text: string, aliases: string[]) {
  return aliases.find((alias) => text.includes(alias)) ?? null
}

function sanitizeName(value: string, alias: string) {
  const nextValue = value.trim().replace(/[，。；、：:]/g, '')
  if (!nextValue || nextValue === alias || nextValue.length > 4) {
    return null
  }

  if (blockedNameFragments.has(nextValue)) {
    return null
  }

  if (
    relationDefinitions.some((definition) =>
      definition.aliases.some((relationAlias) => nextValue.includes(relationAlias)),
    )
  ) {
    return null
  }

  return nextValue
}

function extractNamedDisplayName(alias: string, text: string) {
  const escapedAlias = escapeRegex(alias)
  const patterns = [
    new RegExp(`${escapedAlias}(?:叫|名叫|叫做|叫作|就是|是|：|:|，|,)?([\\u4e00-\\u9fa5]{1,4})`),
    new RegExp(`([\\u4e00-\\u9fa5]{1,4})(?:是|就是)?(?:我的)?${escapedAlias}`),
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    const candidate = match?.[1]
    if (!candidate) {
      continue
    }

    const sanitized = sanitizeName(candidate, alias)
    if (sanitized) {
      return sanitized
    }
  }

  return null
}

function getAggregateKey(
  definition: FamilyRelationDefinition,
  displayName: string,
) {
  if (!definition.allowMultiple) {
    return definition.key
  }

  const normalizedName = createStableId(displayName || definition.canonicalLabel)
  return `${definition.key}:${normalizedName}`
}

function createSourceLabel(source: 'profile' | 'memory', hasPhoto: boolean) {
  if (source === 'profile') {
    return '来自家庭线索'
  }

  return hasPhoto ? '来自回忆与照片' : '来自回忆内容'
}

function shouldSuppressGenericMember(
  member: FamilyTreeMember,
  presentKeys: Set<string>,
) {
  const suppressedBy = genericSuppressionMap[member.relationKey]
  if (!suppressedBy) {
    return false
  }

  return suppressedBy.some((relationKey) => presentKeys.has(relationKey))
}

function buildCandidatesFromText(
  text: string,
  source: 'profile' | 'memory',
  photo: PhotoAttachment | null,
) {
  const normalized = normalizeText(text)
  if (!normalized) {
    return [] as FamilyMentionCandidate[]
  }

  return relationDefinitions.flatMap((definition) => {
    const alias = pickAlias(normalized, definition.aliases)
    if (!alias) {
      return []
    }

    const displayName = extractNamedDisplayName(alias, normalized) ?? alias
    const hitCount = Math.max(1, countHits(normalized, definition.aliases))
    const summaryBase = findExcerpt(normalized, definition.aliases)

    return [
      {
        definition,
        matchedAlias: alias,
        displayName,
        summary:
          source === 'profile'
            ? `家庭线索里提到：${summaryBase}`
            : `回忆里提到：${summaryBase}`,
        sourceLabel: createSourceLabel(source, Boolean(photo)),
        photo,
        score:
          hitCount * 3
          + (source === 'profile' ? 8 : 5)
          + (photo ? 4 : 0)
          + (displayName !== alias ? 3 : 0),
      } satisfies FamilyMentionCandidate,
    ]
  })
}

function buildSelfMember(
  profile: UserProfile | null,
  memories: Memory[],
): FamilyTreeMember {
  const allPhotoCandidates = memories.flatMap((memory, index) =>
    memory.photos.map((photo) => ({
      photo,
      memory,
      memoryIndex: index,
      photoIndex: memory.photos.indexOf(photo),
    })),
  )
  const selfPhoto =
    allPhotoCandidates.find(({ photo, memory }) =>
      `${photo.name} ${memory.category} ${memory.question}`.includes('第二章'),
    )?.photo
    ?? allPhotoCandidates[1]?.photo
    ?? allPhotoCandidates[0]?.photo
    ?? null
  const subjectName = profile ? getProfileDisplayName(profile) : '本人'

  return {
    id: 'family-self',
    relationKey: 'self',
    generation: 'self',
    displayName: subjectName,
    relationLabel: '本人',
    summary:
      profile
        ? buildProfileSummary(profile)
        : `已记录 ${memories.length} 段人生回忆，可继续补充家庭成员和称呼让族谱更完整。`,
    sourceLabel: selfPhoto ? '来自老人资料与照片' : '来自老人资料',
    photo: selfPhoto,
    isSelf: true,
    sortOrder: 50,
  }
}

export function buildFamilyTree(
  profile: UserProfile | null,
  memories: Memory[],
): FamilyTreeData {
  const subjectName = profile ? getProfileDisplayName(profile) : '这位长者'
  const aggregated = new Map<string, AggregatedFamilyMember>()

  const candidateSources = [
    ...(profile?.importantFamilyMembers.trim()
      ? buildCandidatesFromText(profile.importantFamilyMembers, 'profile', null)
      : []),
    ...memories.flatMap((memory) =>
      buildCandidatesFromText(
        `${memory.question} ${memory.answer} ${memory.category}`,
        'memory',
        memory.photos[0] ?? null,
      ),
    ),
  ]

  candidateSources.forEach((candidate) => {
    const aggregateKey = getAggregateKey(candidate.definition, candidate.displayName)
    const existing = aggregated.get(aggregateKey)
    const nextDisplayScore =
      (candidate.displayName !== candidate.matchedAlias ? 6 : 0)
      + (candidate.sourceLabel === '来自家庭线索' ? 5 : 0)
      + (candidate.photo ? 2 : 0)

    if (!existing) {
      aggregated.set(aggregateKey, {
        id: `family-${createStableId(aggregateKey)}`,
        relationKey: candidate.definition.key,
        generation: candidate.definition.generation,
        displayName: candidate.displayName,
        relationLabel: candidate.definition.canonicalLabel,
        summary: candidate.summary,
        sourceLabel: candidate.sourceLabel,
        photo: candidate.photo,
        isSelf: false,
        sortOrder: candidate.definition.sortOrder,
        displayScore: nextDisplayScore,
        anchorScore: candidate.score,
      })
      return
    }

    if (!existing.photo && candidate.photo) {
      existing.photo = candidate.photo
    }

    if (nextDisplayScore > existing.displayScore) {
      existing.displayName = candidate.displayName
      existing.displayScore = nextDisplayScore
    }

    if (candidate.score > existing.anchorScore) {
      existing.summary = candidate.summary
      existing.sourceLabel = candidate.sourceLabel
      existing.anchorScore = candidate.score
    }
  })

  const mergedMembers = [...aggregated.values()]
  const presentKeys = new Set(mergedMembers.map((member) => member.relationKey))
  const filteredMembers: FamilyTreeMember[] = mergedMembers.filter(
    (member) => !shouldSuppressGenericMember(member, presentKeys),
  )

  filteredMembers.push(buildSelfMember(profile, memories))

  const levels = levelOrder.map((levelId) => ({
    id: levelId,
    title: levelLabels[levelId].title,
    description: levelLabels[levelId].description,
    members: filteredMembers
      .filter((member) => member.generation === levelId)
      .sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder
        }

        if (left.isSelf !== right.isSelf) {
          return left.isSelf ? -1 : 1
        }

        return left.id.localeCompare(right.id)
      }),
  }))

  const totalMembers = levels.reduce((count, level) => count + level.members.length, 0)
  const relativeCount = Math.max(totalMembers - 1, 0)
  const photoCount = levels.reduce(
    (count, level) => count + level.members.filter((member) => Boolean(member.photo)).length,
    0,
  )

  return {
    subjectName,
    levels,
    totalMembers,
    relativeCount,
    photoCount,
  }
}
