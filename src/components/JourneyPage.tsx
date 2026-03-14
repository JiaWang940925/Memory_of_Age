import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  Compass,
  HeartHandshake,
  MapPinned,
  Rocket,
  School,
  ScrollText,
  Sparkles,
  TrainFront,
  UsersRound,
  Waves,
  Waypoints,
} from 'lucide-react'
import type { GeneratedAvatar, Memory } from '../App'
import { buildJourneyExperience, type JourneyScene } from '../lib/memoryJourney'
import { buildProfileSummary, type UserProfile } from '../lib/userProfile'

interface JourneyPageProps {
  memories: Memory[]
  onBack: () => void
  userProfile: UserProfile
  generatedAvatar: GeneratedAvatar | null
}

interface MemoryMapNode {
  id: string
  kind: 'memory'
  x: number
  y: number
  scene: JourneyScene
}

interface PersonProfile {
  id: string
  name: string
  relationLabel: string
  summary: string
  encounterPrompt: string
  sourceSceneId: string
  sourcePlace: string | null
  sourceSceneTitle: string
}

interface PersonMapNode {
  id: string
  kind: 'person'
  x: number
  y: number
  profile: PersonProfile
  anchorSceneId: string
}

interface SelectedMapNode {
  kind: 'memory' | 'person'
  id: string
}

const MAP_CANVAS_HEIGHT = 640
const MAP_NODE_SPACING = 250
const MAP_SIDE_PADDING = 220
const MAP_HISTORY_ROW_Y = [186, 224, 172, 212]
const MAP_MEMORY_ROW_Y = [430, 372, 452, 394, 438]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getMapCanvasWidth(nodeCount: number) {
  if (nodeCount <= 1) {
    return 1360
  }

  return Math.max(
    1360,
    MAP_SIDE_PADDING * 2 + (nodeCount - 1) * MAP_NODE_SPACING,
  )
}

function buildMemoryNodes(
  scenes: JourneyScene[],
  canvasWidth: number,
): MemoryMapNode[] {
  if (!scenes.length) {
    return []
  }

  if (scenes.length === 1) {
    return [
      {
        id: scenes[0].id,
        kind: 'memory',
        x: canvasWidth / 2,
        y: MAP_MEMORY_ROW_Y[1],
        scene: scenes[0],
      },
    ]
  }

  return scenes.map((scene, index) => {
    const x = MAP_SIDE_PADDING + index * MAP_NODE_SPACING
    const y = MAP_MEMORY_ROW_Y[index % MAP_MEMORY_ROW_Y.length]

    return {
      id: scene.id,
      kind: 'memory',
      x,
      y,
      scene,
    }
  })
}

function buildPersonNodes(
  memoryNodes: MemoryMapNode[],
  profiles: PersonProfile[],
  canvasWidth: number,
): PersonMapNode[] {
  if (!profiles.length) {
    return []
  }

  return memoryNodes.flatMap((node, index) => {
    const relatedProfiles = profiles.filter((item) => item.sourceSceneId === node.id)
    if (!relatedProfiles.length) {
      return []
    }

    const x = clamp(
      node.x + (index % 2 === 0 ? -56 : 56),
      152,
      canvasWidth - 152,
    )
    return relatedProfiles.map((profile, profileIndex) => {
      const y = MAP_HISTORY_ROW_Y[(index + profileIndex) % MAP_HISTORY_ROW_Y.length]

      return {
        id: `${profile.id}-${node.id}`,
        kind: 'person',
        x: clamp(x + profileIndex * 34, 152, canvasWidth - 152),
        y,
        profile,
        anchorSceneId: node.id,
      }
    })
  })
}

function buildPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) {
    return ''
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`
  }

  let path = `M ${points[0].x} ${points[0].y}`

  for (let index = 1; index < points.length; index += 1) {
    const previousPoint = points[index - 1]
    const point = points[index]
    const controlX = (previousPoint.x + point.x) / 2

    path += ` C ${controlX} ${previousPoint.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`
  }

  return path
}

function getSceneIcon(scene: JourneyScene): LucideIcon {
  switch (scene.backdrop.id) {
    case 'school':
      return School
    case 'factory':
      return Building2
    case 'waterside':
      return Waves
    case 'family':
      return HeartHandshake
    case 'journey':
      return TrainFront
    default:
      return MapPinned
  }
}

function getPersonIcon(profile: PersonProfile): LucideIcon {
  if (profile.relationLabel.includes('老师')) {
    return School
  }

  if (profile.relationLabel.includes('同事') || profile.relationLabel.includes('领导')) {
    return Building2
  }

  if (profile.relationLabel.includes('朋友') || profile.relationLabel.includes('同学')) {
    return UsersRound
  }

  if (profile.relationLabel.includes('航天') || profile.relationLabel.includes('工程')) {
    return Rocket
  }

  return HeartHandshake
}

const RELATION_KEYWORDS: Array<{ label: string; keywords: string[] }> = [
  { label: '父母', keywords: ['父亲', '母亲', '爸爸', '妈妈'] },
  { label: '长辈', keywords: ['爷爷', '奶奶', '外公', '外婆', '姥爷', '姥姥'] },
  { label: '兄弟姐妹', keywords: ['哥哥', '姐姐', '弟弟', '妹妹'] },
  { label: '亲戚', keywords: ['叔叔', '阿姨', '舅舅', '姑姑', '伯伯', '婶婶', '姨妈', '舅妈'] },
  { label: '伴侣', keywords: ['爱人', '丈夫', '妻子', '对象', '老伴'] },
  { label: '子女', keywords: ['孩子', '儿子', '女儿', '孙子', '孙女'] },
  { label: '老师', keywords: ['老师', '班主任', '校长', '同桌'] },
  { label: '同学', keywords: ['同学'] },
  { label: '朋友', keywords: ['朋友', '伙伴'] },
  { label: '同事', keywords: ['同事', '同僚', '工友', '战友'] },
  { label: '领导', keywords: ['领导', '主任', '经理', '厂长', '队长'] },
  { label: '邻里', keywords: ['邻居', '街坊', '邻里'] },
]

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

function extractPlaceCandidates(text: string) {
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
    const idx = text.indexOf(place)
    if (idx >= 0 && !results.some((item) => item.value === place)) {
      results.push({ value: place, index: idx })
    }
  })

  return results.sort((left, right) => left.index - right.index).map((item) => item.value)
}

function extractPersonCandidates(text: string) {
  if (!text) {
    return []
  }

  const results: Array<{ name: string; relationLabel: string; index: number }> = []
  const normalized = text.replace(/\s+/g, '')

  RELATION_KEYWORDS.forEach((group) => {
    group.keywords.forEach((keyword) => {
      const idx = normalized.indexOf(keyword)
      if (idx >= 0 && !results.some((item) => item.name === keyword)) {
        results.push({ name: keyword, relationLabel: group.label, index: idx })
      }
    })
  })

  const nameRegex = /(张|王|李|赵|刘|陈|杨|黄|周|吴|徐|孙|胡|朱|高|林|何|郭|马|罗|梁|宋|郑|谢|韩|唐|冯|于|董|萧|程|曹|袁|邓|许|傅|沈|曾|彭|吕|苏|卢|蒋|蔡|贾|丁|魏|薛|叶|阎|余|潘|杜|戴|夏|钟|汪|田|任|姜|范|方|石|姚|谭|廖|邱|熊|金|陆|郝|孔|白|崔|康|毛|邵|史|秦|江|顾|段|贺|孟|龙|万|侯|钱)([\\u4e00-\\u9fa5]{1,2})/g
  let nameMatch = nameRegex.exec(text)
  while (nameMatch) {
    const name = `${nameMatch[1]}${nameMatch[2]}`
    if (!results.some((item) => item.name === name)) {
      results.push({ name, relationLabel: '重要人物', index: nameMatch.index })
    }
    nameMatch = nameRegex.exec(text)
  }

  return results
    .sort((left, right) => left.index - right.index)
    .map((item) => ({ name: item.name, relationLabel: item.relationLabel }))
}

function pickSentence(text: string, keyword: string) {
  const pieces = text.split(/[。！？!?]/).map((piece) => piece.trim()).filter(Boolean)
  const matched = pieces.find((piece) => piece.includes(keyword))
  return matched ?? pieces[0] ?? ''
}

function buildMentionedPeople(
  scenes: JourneyScene[],
) {
  return scenes.flatMap((scene) => {
    const baseText = `${scene.answer} ${scene.question}`.trim()
    const people = extractPersonCandidates(baseText)
    const places = extractPlaceCandidates(baseText)
    const place = places[0] ?? ''

    return people.slice(0, 3).map((person) => {
      const snippet = pickSentence(baseText, person.name)
      return {
        id: `${scene.id}-${person.name}`,
        name: person.name,
        relationLabel: person.relationLabel,
        summary: snippet ? `“${snippet}”` : '来自这段回忆的关键人物。',
        encounterPrompt: place
          ? `您在${place}提到了这位${person.relationLabel}，可以继续聊聊吗？`
          : `您提到了这位${person.relationLabel}，可以继续聊聊吗？`,
        sourceSceneId: scene.id,
        sourcePlace: place || null,
        sourceSceneTitle: scene.title,
      }
    })
  })
}

function PaperMapNode({
  isActive,
  label,
  subtitle,
  x,
  y,
  kind,
  onClick,
  icon: Icon,
}: {
  isActive: boolean
  label: string
  subtitle: string
  x: number
  y: number
  kind: 'memory' | 'person'
  onClick: () => void
  icon: LucideIcon
}) {
  return (
    <div
      className="sketch-node"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        className={`sketch-node-button ${kind} ${isActive ? 'active' : ''}`}
      >
        <Icon className="h-7 w-7" />
      </button>
      <div className={`sketch-node-label ${isActive ? 'active' : ''}`}>
        <p className="text-elder-sm font-semibold text-foreground">{label}</p>
        <p className="text-[1rem] leading-6 text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  )
}

export function JourneyPage({
  memories,
  onBack,
  userProfile,
  generatedAvatar,
}: JourneyPageProps) {
  const journey = buildJourneyExperience(memories)
  const mapCanvasWidth = getMapCanvasWidth(journey.scenes.length)
  const memoryNodes = buildMemoryNodes(journey.scenes, mapCanvasWidth)
  const mentionedPeople = useMemo(
    () => buildMentionedPeople(journey.scenes),
    [journey.scenes],
  )
  const personNodes = buildPersonNodes(memoryNodes, mentionedPeople, mapCanvasWidth)
  const [selectedNode, setSelectedNode] = useState<SelectedMapNode>({
    kind: 'memory',
    id: memoryNodes[0]?.id ?? '',
  })
  const [mapOffsetX, setMapOffsetX] = useState(0)
  const [mapMaxOffset, setMapMaxOffset] = useState(0)
  const [mapViewportWidth, setMapViewportWidth] = useState(0)
  const mapViewportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const hasSelectedMemory = memoryNodes.some(
      (node) => node.kind === selectedNode.kind && node.id === selectedNode.id,
    )
    const hasSelectedPerson = personNodes.some(
      (node) => node.kind === selectedNode.kind && node.id === selectedNode.id,
    )

    if (hasSelectedMemory || hasSelectedPerson) {
      return
    }

    setSelectedNode({
      kind: 'memory',
      id: memoryNodes[0]?.id ?? '',
    })
  }, [memoryNodes, personNodes, selectedNode])

  useEffect(() => {
    const syncMapScrollState = () => {
      const viewport = mapViewportRef.current
      if (!viewport) {
        return
      }

      const nextViewportWidth = viewport.clientWidth
      const nextMaxOffset = Math.max(0, mapCanvasWidth - nextViewportWidth)

      setMapViewportWidth(nextViewportWidth)
      setMapMaxOffset(nextMaxOffset)
      setMapOffsetX((previous) => clamp(previous, 0, nextMaxOffset))
    }

    syncMapScrollState()
    window.addEventListener('resize', syncMapScrollState)

    return () => {
      window.removeEventListener('resize', syncMapScrollState)
    }
  }, [mapCanvasWidth])

  if (!journey.scenes.length) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b border-border bg-card/90 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
          <div className="mx-auto flex max-w-6xl items-center gap-3 sm:gap-4">
            <button
              onClick={onBack}
              className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-foreground hover:bg-accent/80 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-elder-xl font-bold text-foreground">平面回忆地图</h1>
              <p className="text-elder-sm text-muted-foreground">
                需要先积累一些回忆，地图才能展开
              </p>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
          <div className="paper-panel text-center py-16 px-8">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-accent text-primary">
              <Waypoints className="h-12 w-12" />
            </div>
            <h2 className="text-elder-xl font-semibold text-foreground">地图还没有节点</h2>
            <p className="mt-4 text-elder-base text-muted-foreground max-w-2xl mx-auto">
              先记录几段人生故事，平台会自动生成数字人、回忆站点和人物关联支线。
            </p>
            <button onClick={onBack} className="btn-primary mt-8">
              返回回忆录
            </button>
          </div>
        </div>
      </div>
    )
  }

  const selectedMemoryNode = selectedNode.kind === 'memory'
    ? memoryNodes.find((node) => node.id === selectedNode.id) ?? memoryNodes[0]
    : null
  const selectedPersonNode = selectedNode.kind === 'person'
    ? personNodes.find((node) => node.id === selectedNode.id) ?? personNodes[0]
    : null
  const selectedPersonProfile = selectedNode.kind === 'person'
    ? selectedPersonNode?.profile ?? personNodes[0]?.profile ?? null
    : null
  const selectedTargetX = selectedNode.kind === 'person'
    ? selectedPersonNode?.x ?? personNodes[0]?.x ?? 0
    : selectedMemoryNode?.x ?? memoryNodes[0]?.x ?? 0
  const activeScene = selectedMemoryNode?.scene
    ?? memoryNodes.find((node) => node.id === selectedPersonNode?.anchorSceneId)?.scene
    ?? memoryNodes[0].scene
  const linkedPersonNode = personNodes.find((node) => node.anchorSceneId === activeScene.id) ?? personNodes[0]
  const routePath = buildPath(memoryNodes)
  const placeByScene = useMemo(() => {
    return new Map(
      journey.scenes.map((scene) => {
        const place = extractPlaceCandidates(`${scene.answer} ${scene.question}`)[0] || ''
        return [scene.id, place]
      }),
    )
  }, [journey.scenes])

  useEffect(() => {
    if (mapMaxOffset <= 0 || mapViewportWidth <= 0) {
      return
    }

    const desiredOffset = clamp(
      selectedTargetX - mapViewportWidth / 2,
      0,
      mapMaxOffset,
    )

    setMapOffsetX(desiredOffset)
  }, [
    mapMaxOffset,
    mapViewportWidth,
    selectedNode.id,
    selectedNode.kind,
    selectedTargetX,
  ])

  const nudgeMap = (direction: 'left' | 'right') => {
    setMapOffsetX((previous) =>
      clamp(previous + (direction === 'left' ? -420 : 420), 0, mapMaxOffset),
    )
  }
  const handleMapSliderChange = (event: ChangeEvent<HTMLInputElement>) => {
    setMapOffsetX(Number(event.target.value))
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/88 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-6xl flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={onBack}
              className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-foreground hover:bg-accent/80 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-elder-xl font-bold text-foreground">平面回忆地图</h1>
              <p className="text-elder-sm text-muted-foreground">
                用简笔纸面地图浏览人生，也在节点间遇见您提到的人物
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <span className="emotion-tag-neutral">{journey.scenes.length} 个回忆节点</span>
            <span className="emotion-tag-positive">{mentionedPeople.length} 位关联人物</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <article className="paper-panel space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UsersRound className="h-7 w-7" />
              </div>
              <div>
                <div className="flex flex-wrap gap-3">
                  <span className={generatedAvatar ? 'emotion-tag-positive' : 'emotion-tag-neutral'}>
                    {generatedAvatar ? '数字人视频已接入' : '可继续生成数字人视频'}
                  </span>
                  <span className="emotion-tag-neutral">{journey.avatar.title}</span>
                </div>
                <h2 className="mt-3 text-elder-lg font-semibold text-foreground">
                  {journey.avatar.name}
                </h2>
                <p className="mt-2 text-elder-base text-muted-foreground">
                  {journey.avatar.intro}
                </p>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-border bg-[linear-gradient(145deg,rgba(193,152,114,0.22),rgba(255,248,239,0.92))] px-5 py-5 sm:px-6 sm:py-6">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" />
                <span className="text-elder-base font-semibold">数字人形象建议</span>
              </div>
              <p className="mt-3 text-elder-base leading-relaxed text-foreground">
                {journey.avatar.appearance}
              </p>
            </div>

            {generatedAvatar ? (
              <div className="rounded-[1.75rem] border border-border bg-card/92 px-5 py-5">
                <p className="text-elder-base font-semibold text-foreground">SadTalker 数字人预览</p>
                <video
                  controls
                  src={generatedAvatar.videoUrl}
                  className="mt-4 w-full rounded-3xl bg-black aspect-video"
                />
                <p className="mt-3 text-elder-sm text-muted-foreground">
                  最近一次生成时间：{new Date(generatedAvatar.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {journey.avatar.auraTags.map((tag) => (
                <span key={tag} className="emotion-tag-neutral">
                  {tag}
                </span>
              ))}
              {generatedAvatar ? (
                <span className="emotion-tag-positive">已同步到地图平台</span>
              ) : null}
            </div>
          </article>

          <article className="paper-panel space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                <Compass className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-elder-lg font-semibold text-foreground">地图玩法</h2>
                <p className="mt-2 text-elder-base text-muted-foreground">
                  棕色节点是您的回忆，青灰节点是您提到的人物。点击任一节点都能在下方读到故事，并知道它和哪一段人生场景相连。
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div className="rounded-3xl bg-accent/35 px-5 py-5">
                <p className="text-elder-sm text-muted-foreground">当前主线</p>
                <p className="mt-2 text-elder-base font-semibold text-foreground">
                  {journey.title}
                </p>
              </div>
              <div className="rounded-3xl bg-accent/35 px-5 py-5">
                <p className="text-elder-sm text-muted-foreground">人物关联库</p>
                <p className="mt-2 text-elder-base font-semibold text-foreground">
                  {mentionedPeople.length} 位关联人物
                </p>
              </div>
              <div className="rounded-3xl bg-accent/35 px-5 py-5">
                <p className="text-elder-sm text-muted-foreground">叠加依据</p>
                <p className="mt-2 text-elder-base font-semibold text-foreground">
                  回忆内容中的地点与人物
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card px-5 py-5">
              <p className="text-elder-sm text-muted-foreground">当前用户画像</p>
              <p className="mt-3 text-elder-base leading-relaxed text-foreground">
                {buildProfileSummary(userProfile)}
              </p>
              <p className="mt-3 text-elder-sm text-muted-foreground">
                地图中的人物来自您亲自提到的回忆与故事。
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="map-legend-chip">
                <span className="map-legend-dot memory" />
                <span className="text-elder-sm text-foreground">我的回忆节点</span>
              </div>
              <div className="map-legend-chip">
                <span className="map-legend-dot person" />
                <span className="text-elder-sm text-foreground">关联人物节点</span>
              </div>
            </div>
          </article>
        </section>

        <section className="paper-panel">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Waypoints className="h-5 w-5" />
                <span className="text-elder-base font-semibold">平面简笔画地图</span>
              </div>
              <h2 className="mt-3 text-elder-lg font-semibold text-foreground">
                回忆主线与历史偶遇支线在同一张纸面地图里展开
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="emotion-tag-neutral">{journey.readinessLabel}</span>
              <span className="emotion-tag-positive">
                {placeByScene.get(activeScene.id) || activeScene.backdrop.label}
              </span>
            </div>
          </div>

          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-elder-sm text-muted-foreground">
              节点已改成横向展开。可点击左右按钮，或拖动下方滑杆浏览整张地图。
            </div>
            <div className="flex w-full items-center gap-2 sm:gap-3 lg:w-auto">
              <button
                type="button"
                onClick={() => nudgeMap('left')}
                disabled={mapOffsetX <= 4}
                className="map-scroll-button"
                aria-label="向左拖动地图"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="map-scroll-slider">
                <span className="flex items-center gap-2 text-elder-sm font-medium text-foreground">
                  <ArrowRight className="h-4 w-4 rotate-180 text-primary" />
                  左右拖动地图
                  <ArrowRight className="h-4 w-4 text-primary" />
                </span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(mapMaxOffset, 1)}
                  value={Math.min(mapOffsetX, Math.max(mapMaxOffset, 1))}
                  onChange={handleMapSliderChange}
                  disabled={mapMaxOffset <= 0}
                  className="map-scroll-range"
                  aria-label="横向拖动地图"
                />
              </div>
              <button
                type="button"
                onClick={() => nudgeMap('right')}
                disabled={mapOffsetX >= mapMaxOffset - 4}
                className="map-scroll-button"
                aria-label="向右拖动地图"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="sketch-map-frame">
            <div className="sketch-map-edge left" aria-hidden="true" />
            <div className="sketch-map-edge right" aria-hidden="true" />
            <div
              ref={mapViewportRef}
              className="sketch-map-viewport"
            >
              <div
                className="sketch-map sketch-map-canvas"
                style={{
                  width: `${mapCanvasWidth}px`,
                  minWidth: `${mapCanvasWidth}px`,
                  height: `${MAP_CANVAS_HEIGHT}px`,
                  transform: `translateX(-${mapOffsetX}px)`,
                }}
              >
                <svg
                  viewBox={`0 0 ${mapCanvasWidth} ${MAP_CANVAS_HEIGHT}`}
                  className="absolute inset-0 h-full w-full"
                  aria-hidden="true"
                >
                  <path d={routePath} className="sketch-route-outline" />
                  <path d={routePath} className="sketch-route-main" />
                {personNodes.map((node) => {
                  const anchor = memoryNodes.find((item) => item.id === node.anchorSceneId)
                  if (!anchor) {
                    return null
                    }

                    const branch = `M ${anchor.x} ${anchor.y} L ${node.x} ${node.y}`
                    return <path key={node.id} d={branch} className="sketch-route-branch" />
                  })}
                </svg>

                {memoryNodes.map((node) => (
                  <PaperMapNode
                    key={node.id}
                    isActive={selectedNode.kind === 'memory' && selectedNode.id === node.id}
                    label={placeByScene.get(node.scene.id) || node.scene.backdrop.mapLabel}
                    subtitle={`第 ${node.scene.index + 1} 站`}
                    x={node.x}
                    y={node.y}
                    kind="memory"
                    icon={getSceneIcon(node.scene)}
                    onClick={() => {
                      setSelectedNode({
                        kind: 'memory',
                        id: node.id,
                      })
                    }}
                  />
                ))}

                {personNodes.map((node) => (
                  <PaperMapNode
                    key={node.id}
                    isActive={selectedNode.kind === 'person' && selectedNode.id === node.id}
                    label={node.profile.name}
                    subtitle={node.profile.relationLabel}
                    x={node.x}
                    y={node.y}
                    kind="person"
                    icon={getPersonIcon(node.profile)}
                    onClick={() => {
                      setSelectedNode({
                        kind: 'person',
                        id: node.id,
                      })
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="paper-panel space-y-5">
            {selectedNode.kind === 'memory' && selectedMemoryNode ? (
              <>
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <BookOpen className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-elder-lg font-semibold text-foreground">
                      {selectedMemoryNode.scene.title}
                    </h2>
                    <p className="mt-2 text-elder-base text-muted-foreground">
                      {selectedMemoryNode.scene.backdrop.description}
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl bg-accent/35 p-5">
                  <p className="text-elder-sm text-muted-foreground">引导问题</p>
                  <p className="mt-2 text-elder-base italic text-foreground">
                    “{selectedMemoryNode.scene.question}”
                  </p>
                </div>

                <div className="rounded-3xl border border-border bg-card px-5 py-5">
                  <p className="text-elder-sm text-muted-foreground">回忆正文</p>
                  <p className="mt-3 text-elder-base leading-relaxed text-foreground">
                    {selectedMemoryNode.scene.answer}
                  </p>
                </div>

                <div className="rounded-3xl bg-[linear-gradient(145deg,rgba(136,114,90,0.14),rgba(255,249,242,0.95))] px-5 py-5">
                  <div className="flex items-center gap-2 text-primary">
                    <UsersRound className="h-5 w-5" />
                    <span className="text-elder-base font-semibold">数字人讲述建议</span>
                  </div>
                  <p className="mt-3 text-elder-base leading-relaxed text-foreground">
                    “{selectedMemoryNode.scene.quote}”适合由数字人以缓慢、亲近的语调讲出来，让家人进入这段场景。
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <span className="emotion-tag-neutral">{selectedMemoryNode.scene.category}</span>
                  <span className="emotion-tag-positive">{selectedMemoryNode.scene.timeLabel}</span>
                  <span className="emotion-tag-neutral">{selectedMemoryNode.scene.emotionLabel}</span>
                </div>
              </>
            ) : selectedPersonProfile ? (
              <>
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                    {(() => {
                      const Icon = getPersonIcon(selectedPersonProfile)
                      return <Icon className="h-7 w-7" />
                    })()}
                  </div>
                  <div>
                    <h2 className="text-elder-lg font-semibold text-foreground">
                      {selectedPersonProfile.name}
                    </h2>
                    <p className="mt-2 text-elder-base text-muted-foreground">
                      {selectedPersonProfile.relationLabel}
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl bg-accent/35 p-5 space-y-3">
                  <p className="text-elder-sm text-muted-foreground">人物线索</p>
                  <p className="text-elder-base font-semibold text-foreground">
                    {selectedPersonProfile.relationLabel}
                  </p>
                  <p className="text-elder-base text-muted-foreground">
                    {selectedPersonProfile.summary}
                  </p>
                  <p className="text-elder-sm leading-7 text-muted-foreground">
                    {selectedPersonProfile.encounterPrompt}
                  </p>
                </div>

                <div className="rounded-3xl border border-border bg-card px-5 py-5">
                  <p className="text-elder-sm text-muted-foreground">回忆位置</p>
                  <p className="mt-3 text-elder-base leading-relaxed text-foreground">
                    {selectedPersonProfile.sourcePlace
                      ? `提及地点：${selectedPersonProfile.sourcePlace}`
                      : '未明确提及具体地点'}
                  </p>
                  <p className="mt-4 text-elder-sm text-muted-foreground leading-7">
                    来自：{selectedPersonProfile.sourceSceneTitle}
                  </p>
                </div>

                <div className="rounded-3xl bg-[linear-gradient(145deg,rgba(92,112,116,0.1),rgba(247,245,240,0.96))] px-5 py-5">
                  <p className="text-elder-sm text-muted-foreground">继续追问方向</p>
                  <p className="mt-3 text-elder-base leading-relaxed text-foreground">
                    试着从这位人物的性格、共同经历或对您影响的瞬间继续聊聊。
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <span className="emotion-tag-neutral">{selectedPersonProfile.relationLabel}</span>
                  {selectedPersonProfile.sourcePlace ? (
                    <span className="emotion-tag-positive">{selectedPersonProfile.sourcePlace}</span>
                  ) : null}
                </div>
              </>
            ) : null}
          </article>

          <article className="paper-panel space-y-5">
            {selectedNode.kind === 'memory' && selectedMemoryNode ? (
              <>
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                    <ScrollText className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-elder-lg font-semibold text-foreground">节点延展内容</h2>
                    <p className="mt-2 text-elder-base text-muted-foreground">
                      这一区同时放图片、视频演绎提示，以及本节点可以关联到的人物。
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-dashed border-border bg-[linear-gradient(145deg,rgba(226,205,178,0.22),rgba(255,249,241,0.94))] px-5 py-5">
                  <p className="text-elder-base font-semibold text-foreground">图片场景</p>
                  {selectedMemoryNode.scene.photos.length > 0 ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {selectedMemoryNode.scene.photos.map((photo) => (
                        <figure
                          key={photo.id}
                          className="overflow-hidden rounded-3xl border border-border bg-card"
                        >
                          <img
                            src={photo.dataUrl}
                            alt={photo.name}
                            className="h-52 w-full object-cover"
                          />
                          <figcaption className="px-4 py-3 text-elder-sm text-muted-foreground truncate">
                            {photo.name}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-elder-base text-muted-foreground leading-relaxed">
                      {selectedMemoryNode.scene.imageDescription}
                    </p>
                  )}
                </div>

                <div className="rounded-3xl bg-accent/30 px-5 py-5">
                  <p className="text-elder-base font-semibold text-foreground">视频演绎提示</p>
                  <p className="mt-3 text-elder-base leading-relaxed text-muted-foreground">
                    {selectedMemoryNode.scene.videoPrompt}
                  </p>
                  <p className="mt-4 text-elder-sm text-muted-foreground">
                    旁白建议：{selectedMemoryNode.scene.narrationPrompt}
                  </p>
                </div>

                <div className="rounded-3xl border border-border bg-card px-5 py-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                  <p className="text-elder-base font-semibold text-foreground">本节点关联人物</p>
                  <p className="mt-2 text-elder-sm text-muted-foreground">
                    {linkedPersonNode?.profile.encounterPrompt ?? '这段回忆里没有提到具体人物'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNode({
                      kind: 'person',
                      id: linkedPersonNode?.id ?? '',
                    })
                  }}
                  className="btn-outline min-h-[3.8rem] px-6 py-3 w-full sm:w-auto"
                  disabled={!linkedPersonNode}
                >
                  读取人物故事
                </button>
              </div>
              <div className="mt-4 rounded-2xl bg-accent/35 px-4 py-4">
                <p className="text-elder-base font-semibold text-foreground">
                  {linkedPersonNode?.profile.name ?? '暂未提到人物'}
                </p>
                <p className="mt-2 text-elder-base text-muted-foreground">
                  {linkedPersonNode?.profile.relationLabel ?? '可以再补充人物故事'}
                </p>
              </div>
            </div>
          </>
            ) : selectedPersonProfile ? (
              <>
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <UsersRound className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-elder-lg font-semibold text-foreground">人物来源与地图关系</h2>
                    <p className="mt-2 text-elder-base text-muted-foreground">
                      这里显示这个人物与哪一段回忆相连，方便继续补充故事。
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl bg-accent/30 px-5 py-5">
                  <p className="text-elder-base font-semibold text-foreground">本次关联的回忆节点</p>
                  <p className="mt-3 text-elder-base text-muted-foreground leading-relaxed">
                    {activeScene.title}。系统将您提到的人物安排在此站旁边，目的是让故事与人物关系同步展开阅读。
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNode({
                        kind: 'memory',
                        id: activeScene.id,
                      })
                    }}
                    className="btn-outline mt-4 min-h-[3.8rem] px-6 py-3 w-full sm:w-auto"
                  >
                    回到这段回忆
                  </button>
                </div>

                <div className="rounded-3xl border border-dashed border-border bg-[linear-gradient(145deg,rgba(200,186,166,0.18),rgba(255,251,245,0.94))] px-5 py-5">
                  <p className="text-elder-base font-semibold text-foreground">节点说明</p>
                  <p className="mt-3 text-elder-base leading-relaxed text-muted-foreground">
                    这些人物来自您自己的回忆文本，后续可继续补充更多故事与细节。
                  </p>
                </div>
              </>
            ) : null}
          </article>
        </section>

        <section className="paper-panel space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <UsersRound className="h-5 w-5" />
                <span className="text-elder-base font-semibold">人物提及清单</span>
              </div>
              <h2 className="mt-3 text-elder-lg font-semibold text-foreground">
                这些人物都来自您的回忆，可以继续补充他们的故事
              </h2>
            </div>
            <span className="emotion-tag-neutral">
              共 {mentionedPeople.length} 位人物
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {mentionedPeople.map((profile) => {
              const personNodeId =
                personNodes.find((node) => node.profile.id === profile.id)?.id ?? ''
              const isActive =
                selectedNode.kind === 'person' && personNodeId && selectedNode.id === personNodeId

              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => {
                    setSelectedNode({
                      kind: 'person',
                      id: personNodeId,
                    })
                  }}
                  className={`w-full rounded-[1.75rem] border px-5 py-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-warm ${
                    isActive ? 'border-primary bg-primary/8' : 'border-border bg-card'
                  }`}
                >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-elder-base font-semibold text-foreground">{profile.name}</p>
                    <p className="mt-2 text-elder-sm text-muted-foreground">
                      {profile.relationLabel}
                    </p>
                  </div>
                  <span className="emotion-tag-neutral">
                    {profile.sourcePlace ?? '未标注地点'}
                  </span>
                </div>
                <p className="mt-4 text-elder-base text-muted-foreground leading-relaxed">
                  {profile.summary}
                </p>
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
